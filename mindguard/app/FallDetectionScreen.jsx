import React, { startTransition, useEffect, useEffectEvent, useRef, useState } from 'react';
import {
    Alert,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isBackendConfigured, logActivitySnapshot, logFallEvent } from '../src/components/services/api';
import { createManualFallSample, startMotionMonitoring } from '../src/components/services/sensors';

const ALERT_COUNTDOWN_SECONDS = 12;

const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });
};

const sanitizePhoneNumber = (value) => value.replace(/[^\d+]/g, '');

const buildAlertMessage = (sample, mode) => {
    return `MindGuard alert: possible fall detected at ${formatTime(sample.timestamp)}. Mode: ${mode}. Activity: ${sample.activity}. Confidence: ${sample.confidence}%. Please check on the wearer immediately.`;
};

const getActivityTone = (activity) => {
    if (activity === 'Impact detected') {
        return { accent: '#C2410C', soft: '#FFEDD5' };
    }

    if (activity === 'Active') {
        return { accent: '#0F766E', soft: '#CCFBF1' };
    }

    if (activity === 'Walking') {
        return { accent: '#1D4ED8', soft: '#DBEAFE' };
    }

    return { accent: '#475569', soft: '#E2E8F0' };
};

export default function FallDetectionScreen() {
    const router = useRouter();
    const [monitorSource, setMonitorSource] = useState('simulated');
    const [isMonitoring, setIsMonitoring] = useState(true);
    const [autoNotify, setAutoNotify] = useState(true);
    const [caregiverNumber, setCaregiverNumber] = useState('+2348012345678');
    const [latestSample, setLatestSample] = useState({
        activity: 'Resting',
        confidence: 82,
        magnitude: 1,
        severity: 'Normal',
        source: 'simulated',
        suspectedFall: false,
        timestamp: new Date().toISOString(),
        vector: { x: 0, y: 0, z: 1 },
    });
    const [activityFeed, setActivityFeed] = useState([]);
    const [backendState, setBackendState] = useState(isBackendConfigured() ? 'Ready to log' : 'Frontend only');
    const [incident, setIncident] = useState(null);
    const [countdown, setCountdown] = useState(ALERT_COUNTDOWN_SECONDS);
    const [dailyStats, setDailyStats] = useState({
        active: 0,
        falls: 0,
        rest: 0,
        total: 0,
        walking: 0,
    });
    const lastBackendSyncRef = useRef(0);
    const autoSignalSentRef = useRef(false);

    const sendPhoneSignal = useEffectEvent(async (channel, sample) => {
        const sanitizedNumber = sanitizePhoneNumber(caregiverNumber);

        if (!sanitizedNumber) {
            Alert.alert('Caregiver number required', 'Add a phone number before sending an alert.');
            return false;
        }

        const message = encodeURIComponent(buildAlertMessage(sample, monitorSource));
        const url = channel === 'call'
            ? `tel:${sanitizedNumber}`
            : `sms:${sanitizedNumber}?body=${message}`;

        try {
            await Linking.openURL(url);
            return true;
        } catch (error) {
            Alert.alert('Unable to open phone app', 'This device cannot launch the selected alert action.');
            return false;
        }
    });

    const syncIncidentToBackend = useEffectEvent(async (sample, escalated) => {
        if (!isBackendConfigured()) {
            return;
        }

        const response = await logFallEvent({
            activity: sample.activity,
            auto_alert_triggered: escalated,
            confidence: sample.confidence,
            contact_number: sanitizePhoneNumber(caregiverNumber),
            mode: monitorSource,
            notes: escalated ? 'Caregiver escalation launched from the mobile app.' : 'Potential fall flagged by the mobile app.',
            sensor_payload: sample,
            severity: sample.severity,
            source: sample.source,
        });

        if (response?.error) {
            setBackendState('Logging failed');
            return;
        }

        setBackendState(escalated ? 'Incident escalated' : 'Incident logged');
    });

    const handleMotionSample = useEffectEvent((sample) => {
        startTransition(() => {
            setLatestSample(sample);
            setActivityFeed((previous) => [sample, ...previous].slice(0, 7));
            setDailyStats((previous) => {
                const next = {
                    ...previous,
                    total: previous.total + 1,
                };

                if (sample.activity === 'Active') {
                    next.active += 1;
                } else if (sample.activity === 'Walking') {
                    next.walking += 1;
                } else if (sample.activity === 'Resting') {
                    next.rest += 1;
                }

                return next;
            });
        });

        const now = Date.now();
        if (!isBackendConfigured() || now - lastBackendSyncRef.current < 20000) {
            return;
        }

        lastBackendSyncRef.current = now;
        logActivitySnapshot({
            activity: sample.activity,
            confidence: sample.confidence,
            mode: monitorSource,
            sensor_payload: sample,
            source: sample.source,
        }).then((response) => {
            if (!response?.error) {
                setBackendState('Activity synced');
            }
        });
    });

    const handleFallDetected = useEffectEvent(async (sample) => {
        if (incident) {
            return;
        }

        autoSignalSentRef.current = false;
        setIncident(sample);
        setCountdown(ALERT_COUNTDOWN_SECONDS);
        setDailyStats((previous) => ({
            ...previous,
            falls: previous.falls + 1,
        }));
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setBackendState(isBackendConfigured() ? 'Logging incident...' : 'Frontend alert only');
        syncIncidentToBackend(sample, false);
    });

    useEffect(() => {
        if (!isMonitoring) {
            return undefined;
        }

        const stopMonitoring = startMotionMonitoring({
            source: monitorSource,
            onFallDetected: handleFallDetected,
            onSample: handleMotionSample,
            updateInterval: monitorSource === 'wearable' ? 700 : 1200,
        });

        return stopMonitoring;
    }, [handleFallDetected, handleMotionSample, isMonitoring, monitorSource]);

    useEffect(() => {
        if (!incident || !autoNotify || autoSignalSentRef.current) {
            return undefined;
        }

        if (countdown <= 0) {
            autoSignalSentRef.current = true;
            sendPhoneSignal('sms', incident).then((didLaunch) => {
                if (didLaunch) {
                    syncIncidentToBackend(incident, true);
                }
            });
            return undefined;
        }

        const timer = setTimeout(() => {
            setCountdown((previous) => previous - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [autoNotify, countdown, incident, sendPhoneSignal, syncIncidentToBackend]);

    const activityTone = getActivityTone(latestSample.activity);

    const clearIncident = () => {
        setIncident(null);
        setCountdown(ALERT_COUNTDOWN_SECONDS);
        autoSignalSentRef.current = false;
    };

    const handleManualTrigger = () => {
        const sample = createManualFallSample(monitorSource);
        handleMotionSample(sample);
        handleFallDetected(sample);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                    <Pressable onPress={() => router.back()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={22} color="#0F172A" />
                    </Pressable>

                    <View style={styles.headerCopy}>
                        <Text style={styles.eyebrow}>Wearable + simulated monitoring</Text>
                        <Text style={styles.title}>Fall Detection Suite</Text>
                    </View>
                </View>

                <View style={styles.heroCard}>
                    <View style={styles.heroTopRow}>
                        <View>
                            <Text style={styles.heroLabel}>Monitor status</Text>
                            <Text style={styles.heroStatus}>{isMonitoring ? 'Live monitoring' : 'Paused'}</Text>
                        </View>

                        <View style={[styles.badge, { backgroundColor: activityTone.soft }]}> 
                            <Text style={[styles.badgeText, { color: activityTone.accent }]}>{latestSample.activity}</Text>
                        </View>
                    </View>

                    <View style={styles.heroMetrics}>
                        <View style={styles.metricCard}>
                            <Text style={styles.metricValue}>{latestSample.magnitude}g</Text>
                            <Text style={styles.metricLabel}>Current motion</Text>
                        </View>
                        <View style={styles.metricCard}>
                            <Text style={styles.metricValue}>{latestSample.confidence}%</Text>
                            <Text style={styles.metricLabel}>Detection confidence</Text>
                        </View>
                        <View style={styles.metricCard}>
                            <Text style={styles.metricValue}>{monitorSource === 'wearable' ? 'Wearable' : 'Simulated'}</Text>
                            <Text style={styles.metricLabel}>Data source</Text>
                        </View>
                    </View>

                    <Text style={styles.heroFootnote}>
                        Designed for elderly fall detection and daily activity monitoring, with direct caregiver escalation from the phone.
                    </Text>
                </View>

                <View style={styles.controlsCard}>
                    <View style={styles.controlRow}>
                        <View>
                            <Text style={styles.controlTitle}>Use simulated data</Text>
                            <Text style={styles.controlHint}>Switch off to read live accelerometer values from the device.</Text>
                        </View>
                        <Switch
                            trackColor={{ false: '#CBD5E1', true: '#FDBA74' }}
                            thumbColor="#FFFFFF"
                            value={monitorSource === 'simulated'}
                            onValueChange={(value) => {
                                clearIncident();
                                setMonitorSource(value ? 'simulated' : 'wearable');
                            }}
                        />
                    </View>

                    <View style={styles.controlRow}>
                        <View>
                            <Text style={styles.controlTitle}>Auto-notify caregiver</Text>
                            <Text style={styles.controlHint}>Launches the SMS app after the countdown if no one cancels the alert.</Text>
                        </View>
                        <Switch
                            trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
                            thumbColor="#FFFFFF"
                            value={autoNotify}
                            onValueChange={setAutoNotify}
                        />
                    </View>

                    <View style={styles.buttonRow}>
                        <Pressable
                            style={[styles.primaryButton, !isMonitoring && styles.secondaryButton]}
                            onPress={() => setIsMonitoring((previous) => !previous)}
                        >
                            <Ionicons name={isMonitoring ? 'pause' : 'play'} size={18} color="#FFF7ED" />
                            <Text style={styles.primaryButtonText}>{isMonitoring ? 'Pause monitor' : 'Resume monitor'}</Text>
                        </Pressable>

                        <Pressable style={styles.alertButton} onPress={handleManualTrigger}>
                            <Ionicons name="warning-outline" size={18} color="#FFF7ED" />
                            <Text style={styles.primaryButtonText}>Trigger test alert</Text>
                        </Pressable>
                    </View>
                </View>

                <View style={styles.contactCard}>
                    <Text style={styles.sectionTitle}>Caregiver escalation</Text>
                    <Text style={styles.sectionHint}>Use a real caregiver number so the device can open the dialer or SMS composer with the alert payload.</Text>
                    <TextInput
                        value={caregiverNumber}
                        onChangeText={setCaregiverNumber}
                        keyboardType="phone-pad"
                        placeholder="+2348012345678"
                        placeholderTextColor="#94A3B8"
                        style={styles.phoneInput}
                    />

                    <View style={styles.quickActionRow}>
                        <Pressable style={styles.quickActionButton} onPress={() => sendPhoneSignal('call', latestSample)}>
                            <Ionicons name="call-outline" size={18} color="#0F172A" />
                            <Text style={styles.quickActionText}>Call caregiver</Text>
                        </Pressable>
                        <Pressable style={styles.quickActionButton} onPress={() => sendPhoneSignal('sms', latestSample)}>
                            <Ionicons name="chatbox-ellipses-outline" size={18} color="#0F172A" />
                            <Text style={styles.quickActionText}>Send SMS alert</Text>
                        </Pressable>
                    </View>

                    <Text style={styles.backendNote}>
                        Backend logging: {backendState}. {isBackendConfigured() ? 'Using EXPO_PUBLIC_API_BASE_URL.' : 'Set EXPO_PUBLIC_API_BASE_URL to enable Django logging.'}
                    </Text>
                </View>

                {incident ? (
                    <View style={styles.incidentCard}>
                        <View style={styles.incidentHeader}>
                            <View>
                                <Text style={styles.incidentTitle}>Possible fall detected</Text>
                                <Text style={styles.incidentMeta}>{formatTime(incident.timestamp)} • {incident.severity} severity • {incident.confidence}% confidence</Text>
                            </View>
                            <View style={styles.countdownBubble}>
                                <Text style={styles.countdownValue}>{countdown}s</Text>
                            </View>
                        </View>

                        <Text style={styles.incidentBody}>
                            The app is waiting for a response. Cancel if the wearer is safe, or escalate immediately to the caregiver.
                        </Text>

                        <View style={styles.buttonRow}>
                            <Pressable style={styles.safeButton} onPress={clearIncident}>
                                <Ionicons name="checkmark-circle-outline" size={18} color="#14532D" />
                                <Text style={styles.safeButtonText}>I am okay</Text>
                            </Pressable>

                            <Pressable
                                style={styles.alertButton}
                                onPress={async () => {
                                    const launched = await sendPhoneSignal('call', incident);
                                    if (launched) {
                                        syncIncidentToBackend(incident, true);
                                    }
                                }}
                            >
                                <Ionicons name="call" size={18} color="#FFF7ED" />
                                <Text style={styles.primaryButtonText}>Escalate now</Text>
                            </Pressable>
                        </View>
                    </View>
                ) : null}

                <View style={styles.statsGrid}>
                    <View style={styles.statPanel}>
                        <Text style={styles.statValue}>{dailyStats.walking}</Text>
                        <Text style={styles.statLabel}>Walking intervals</Text>
                    </View>
                    <View style={styles.statPanel}>
                        <Text style={styles.statValue}>{dailyStats.active}</Text>
                        <Text style={styles.statLabel}>High activity</Text>
                    </View>
                    <View style={styles.statPanel}>
                        <Text style={styles.statValue}>{dailyStats.rest}</Text>
                        <Text style={styles.statLabel}>Rest periods</Text>
                    </View>
                    <View style={styles.statPanel}>
                        <Text style={styles.statValue}>{dailyStats.falls}</Text>
                        <Text style={styles.statLabel}>Fall alerts</Text>
                    </View>
                </View>

                <View style={styles.feedCard}>
                    <Text style={styles.sectionTitle}>Recent activity timeline</Text>
                    <Text style={styles.sectionHint}>A rolling feed helps judges or caregivers see how the wearer was moving before an alert.</Text>

                    {activityFeed.length === 0 ? (
                        <Text style={styles.emptyFeed}>Waiting for motion samples...</Text>
                    ) : (
                        activityFeed.map((sample, index) => {
                            const tone = getActivityTone(sample.activity);

                            return (
                                <View key={`${sample.timestamp}-${index}`} style={styles.feedRow}>
                                    <View style={[styles.feedDot, { backgroundColor: tone.accent }]} />
                                    <View style={styles.feedContent}>
                                        <Text style={styles.feedTitle}>{sample.activity}</Text>
                                        <Text style={styles.feedMeta}>{formatTime(sample.timestamp)} • {sample.magnitude}g • {sample.source}</Text>
                                    </View>
                                    <Text style={[styles.feedConfidence, { color: tone.accent }]}>{sample.confidence}%</Text>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFF7ED',
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 36,
        paddingTop: 16,
        gap: 16,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    iconButton: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#FED7AA',
    },
    headerCopy: {
        flex: 1,
    },
    eyebrow: {
        fontSize: 12,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: '#9A3412',
        marginBottom: 4,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0F172A',
    },
    heroCard: {
        backgroundColor: '#0F172A',
        borderRadius: 28,
        padding: 22,
        gap: 18,
    },
    heroTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
    },
    heroLabel: {
        color: '#FDBA74',
        fontSize: 13,
        marginBottom: 6,
    },
    heroStatus: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '700',
    },
    badge: {
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    heroMetrics: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    metricCard: {
        flex: 1,
        minWidth: 92,
        backgroundColor: '#1E293B',
        borderRadius: 18,
        padding: 14,
    },
    metricValue: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 6,
    },
    metricLabel: {
        color: '#CBD5E1',
        fontSize: 12,
    },
    heroFootnote: {
        color: '#CBD5E1',
        fontSize: 13,
        lineHeight: 19,
    },
    controlsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 18,
        gap: 18,
        borderWidth: 1,
        borderColor: '#FED7AA',
    },
    controlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
    },
    controlTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4,
    },
    controlHint: {
        fontSize: 13,
        color: '#64748B',
        maxWidth: 250,
        lineHeight: 18,
    },
    buttonRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#0F766E',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flex: 1,
        minWidth: 150,
    },
    secondaryButton: {
        backgroundColor: '#334155',
    },
    alertButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#C2410C',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flex: 1,
        minWidth: 150,
    },
    primaryButtonText: {
        color: '#FFF7ED',
        fontWeight: '700',
        fontSize: 14,
    },
    contactCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 18,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    sectionHint: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
    },
    phoneInput: {
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 15 : 12,
        color: '#0F172A',
        fontSize: 16,
        backgroundColor: '#F8FAFC',
    },
    quickActionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    quickActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: '#FFEDD5',
    },
    quickActionText: {
        color: '#0F172A',
        fontWeight: '600',
    },
    backendNote: {
        fontSize: 12,
        lineHeight: 18,
        color: '#64748B',
    },
    incidentCard: {
        backgroundColor: '#FFF1F2',
        borderRadius: 24,
        padding: 18,
        borderWidth: 1,
        borderColor: '#FDA4AF',
        gap: 14,
    },
    incidentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    incidentTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#881337',
        marginBottom: 4,
    },
    incidentMeta: {
        color: '#9F1239',
        fontSize: 13,
    },
    countdownBubble: {
        minWidth: 58,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: '#BE123C',
        alignItems: 'center',
    },
    countdownValue: {
        color: '#FFFFFF',
        fontWeight: '800',
        fontSize: 16,
    },
    incidentBody: {
        color: '#4C0519',
        fontSize: 14,
        lineHeight: 20,
    },
    safeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#DCFCE7',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flex: 1,
        minWidth: 150,
    },
    safeButtonText: {
        color: '#14532D',
        fontWeight: '700',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statPanel: {
        flex: 1,
        minWidth: 140,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    statValue: {
        color: '#0F172A',
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 6,
    },
    statLabel: {
        color: '#64748B',
        fontSize: 13,
    },
    feedCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 18,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 12,
    },
    emptyFeed: {
        color: '#94A3B8',
        paddingVertical: 8,
    },
    feedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 8,
    },
    feedDot: {
        width: 10,
        height: 10,
        borderRadius: 999,
    },
    feedContent: {
        flex: 1,
    },
    feedTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 2,
    },
    feedMeta: {
        fontSize: 12,
        color: '#64748B',
    },
    feedConfidence: {
        fontWeight: '700',
    },
});