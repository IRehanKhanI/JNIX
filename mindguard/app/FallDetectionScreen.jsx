import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Accelerometer } from 'expo-sensors';

export default function FallDetectionScreen() {
    const router = useRouter();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [monitoring, setMonitoring] = useState(false);
    
    // Internal state for device accelerometer status
    const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 });
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Fetch from Django Backend
    const fetchIncidents = async () => {
        try {
            const res = await fetch('http://10.55.184.66:8000/api/fall-detect/incidents/');
            if (res.ok) {
                const data = await res.json();
                setEvents(data);
            }
        } catch (error) {
            console.log('Error fetching alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    // Polling backend every 3 seconds for new ESP32 events
    useEffect(() => {
        fetchIncidents();
        const interval = setInterval(fetchIncidents, 3000);
        return () => clearInterval(interval);
    }, []);

    // Pulse animation
    useEffect(() => {
        if (monitoring) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true })
                ])
            ).start();
        } else {
            pulseAnim.stopAnimation();
            pulseAnim.setValue(1);
        }
    }, [monitoring, pulseAnim]);

    const subscriptionRef = useRef(null);
    const toggleMonitoring = () => {
        if (monitoring) {
            if (subscriptionRef.current) {
                subscriptionRef.current.remove();
            }
            subscriptionRef.current = null;
            setMonitoring(false);
        } else {
            Accelerometer.setUpdateInterval(500);
            subscriptionRef.current = Accelerometer.addListener(data => {
                setAccelerometerData(data);
                const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
                if (magnitude > 2.8) {
                    // Local fallback threshold: send to DJango if device detects hard fall
                    triggerFallAlert(magnitude);
                }
            });
            setMonitoring(true);
        }
    };

    useEffect(() => {
        return () => {
            if (subscriptionRef.current) subscriptionRef.current.remove();
        };
    }, []);

    const triggerFallAlert = async (magnitude) => {
        if (subscriptionRef.current) {
            subscriptionRef.current.remove();
            subscriptionRef.current = null;
            setMonitoring(false);
        }
        
        try {
            const { logFallEvent } = require('../src/components/services/api');
            
            await logFallEvent(
                "Critical",
                "Mobile Fall Detected",
                95,
                `Magnitude: ${magnitude.toFixed(2)}`,
                "mobile",
                "live"
            );
            
            Alert.alert("🚨 Fall Detected!", "Emergency alert logged to your profile.");
            fetchIncidents();
        } catch (e) {
            console.log("Error logging:", e);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#38bdf8" />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={styles.headerEyebrow}>SAFETY STATUS</Text>
                        <Text style={styles.headerTitle}>Fall Detection</Text>
                    </View>
                    <View style={{ width: 38 }} />
                </View>

                {/* Hero Monitor Card */}
                <View style={styles.heroCard}>
                    <Animated.View style={[styles.pulseCircle, monitoring && styles.pulseCircleActive, { transform: [{ scale: pulseAnim }] }]}>
                        <Ionicons name={monitoring ? "walk" : "walk-outline"} size={48} color={monitoring ? "#10b981" : "#64748b"} />
                    </Animated.View>

                    <Text style={styles.heroTitle}>{monitoring ? "Actively Monitoring" : "Monitoring Inactive"}</Text>
                    <Text style={styles.heroSubtitle}>Uses device sensors & connected ESP32 hardware to detect falls.</Text>

                    <TouchableOpacity
                        style={[styles.monitorBtn, monitoring ? styles.monitorBtnStop : styles.monitorBtnStart]}
                        onPress={toggleMonitoring}
                    >
                        <Text style={styles.monitorBtnText}>{monitoring ? "Stop Device Monitor" : "Start Device Monitor"}</Text>
                    </TouchableOpacity>
                </View>

                {/* Backend Event Log */}
                <View style={styles.logSection}>
                    <View style={styles.logHeader}>
                        <Text style={styles.logTitle}>Recent Alerts (Real-Time)</Text>
                        <TouchableOpacity onPress={fetchIncidents}>
                            <Ionicons name="refresh" size={20} color="#38bdf8" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator color="#38bdf8" style={{ marginTop: 20 }} />
                    ) : events.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="shield-checkmark-outline" size={32} color="#10b981" />
                            <Text style={styles.emptyText}>No recent falls detected.</Text>
                        </View>
                    ) : (
                        events.map((event, idx) => (
                            <View key={event.id || idx} style={styles.eventCard}>
                                <View style={styles.eventLeft}>
                                    <View style={[styles.eventIconArea, event.severity === 'Critical' ? styles.iconCritical : styles.iconNormal]}>
                                        <Ionicons name="warning" size={20} color={event.severity === 'Critical' ? "#ef4444" : "#f59e0b"} />
                                    </View>
                                    <View>
                                        <Text style={styles.eventActivity}>{event.activity}</Text>
                                        <Text style={styles.eventMeta}>Source: {event.source} • Conf: {event.confidence}%</Text>
                                    </View>
                                </View>
                                <Text style={styles.eventTime}>
                                    {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        ))
                    )}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#06101c' },
    container: { padding: 20, paddingBottom: 40 },
    
    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
    headerEyebrow: { color: '#64748b', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
    headerTitle: { color: '#f8fafc', fontSize: 22, fontWeight: '800' },

    // Hero
    heroCard: { backgroundColor: '#0f172a', borderRadius: 24, padding: 30, alignItems: 'center', marginBottom: 25, borderWidth: 1, borderColor: '#1e293b' },
    pulseCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#0b1525', borderWidth: 2, borderColor: '#1e293b', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    pulseCircleActive: { borderColor: '#10b981', shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 },
    heroTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '800', marginBottom: 8 },
    heroSubtitle: { color: '#94a3b8', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 25 },
    monitorBtn: { paddingVertical: 14, paddingHorizontal: 30, borderRadius: 14, width: '100%', alignItems: 'center' },
    monitorBtnStart: { backgroundColor: '#38bdf8' },
    monitorBtnStop: { backgroundColor: '#ef4444' },
    monitorBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

    // Log Section
    logSection: { marginTop: 10 },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    logTitle: { color: '#94a3b8', fontSize: 14, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
    emptyState: { backgroundColor: '#0b1525', borderRadius: 16, padding: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1e293b', borderStyle: 'dashed' },
    safeArea: { flex: 1, backgroundColor: '#140f2d' }, // Midnight Violet
    container: { padding: 20 },
    
    header: { marginBottom: 30, alignItems: 'center' },
    titleEyebrow: { color: '#ffb3c6', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
    title: { color: '#ffffff', fontSize: 26, fontWeight: '800' },
    subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4, textAlign: 'center' },
    
    statusCard: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        marginBottom: 20,
    },
    
    pulseContainer: {
        width: 140,
        height: 140,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    pulseRing: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(158, 0, 49, 0.4)', // Ruby Red glow
    },
    statusIconContainer: {
        width: 90,
        height: 90,
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    statusIconActive: {
        backgroundColor: '#9e0031', // Ruby Red
        shadowColor: '#9e0031',
    },
    statusIconInactive: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
    },
    
    statusText: { color: '#ffffff', fontSize: 20, fontWeight: '800', marginBottom: 8 },
    statusSubtext: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
    
    btnPrimary: {
        backgroundColor: '#9e0031',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 10,
    },
    btnStop: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    btnText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
    
    historySection: { flex: 1, marginTop: 10 },
    sectionTitle: { color: '#ffb3c6', fontSize: 14, fontWeight: '800', letterSpacing: 1.2, marginBottom: 15 },
    
    historyList: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    emptyText: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: 20 },
    
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        gap: 12,
    },
    historyItemLast: { borderBottomWidth: 0 },
    
    severityIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconCritical: { backgroundColor: 'rgba(158, 0, 49, 0.25)' }, // Deeper red bg
    iconWarning: { backgroundColor: 'rgba(255, 165, 0, 0.15)' },
    
    historyDetails: { flex: 1 },
    historyActivity: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
    historySource: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 },
    
    historyTime: { color: '#ffb3c6', fontSize: 12, fontWeight: '600' }
});