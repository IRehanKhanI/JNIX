import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isCompactScreen = width < 390;

const dashboardCards = [
    { label: 'Accessibility', route: '/accessibility', icon: 'accessibility-outline' },
    { label: 'Mental Health', route: '/mental-health', icon: 'heart-outline' },
    { label: 'Health Detection', route: '/HealthDetectionScreen', icon: 'scan-outline' },
    { label: 'Fall Detection', route: '/FallDetectionScreen', icon: 'walk-outline' },
    { label: 'Health Report', route: '/HealthReportScreen', icon: 'document-text-outline' },
    { label: 'Alerts', route: '/alerts', icon: 'notifications-outline' },
];

const HOURLY_DATA = [
    { hour: '6AM', stress: 22, label: '6A' },
    { hour: '7AM', stress: 35, label: '7A' },
    { hour: '8AM', stress: 58, label: '8A' },
    { hour: '9AM', stress: 72, label: '9A' },
    { hour: '10AM', stress: 61, label: '10A' },
    { hour: '11AM', stress: 45, label: '11A' },
    { hour: '12PM', stress: 38, label: '12P' },
    { hour: '1PM', stress: 50, label: '1P' },
    { hour: '2PM', stress: 67, label: '2P' },
    { hour: '3PM', stress: 82, label: '3P' },
    { hour: '4PM', stress: 74, label: '4P' },
    { hour: '5PM', stress: 55, label: '5P' },
    { hour: '6PM', stress: 40, label: '6P' },
    { hour: '7PM', stress: 30, label: '7P' },
    { hour: '8PM', stress: 25, label: '8P' },
];

const WEEKLY_DATA = [
    { hour: 'Mon', stress: 48, label: 'Mon' },
    { hour: 'Tue', stress: 54, label: 'Tue' },
    { hour: 'Wed', stress: 63, label: 'Wed' },
    { hour: 'Thu', stress: 58, label: 'Thu' },
    { hour: 'Fri', stress: 71, label: 'Fri' },
    { hour: 'Sat', stress: 36, label: 'Sat' },
    { hour: 'Sun', stress: 29, label: 'Sun' },
];

const PEAK_EVENTS = [
    { time: '3:14 PM', level: 82, trigger: 'Back-to-back meetings', date: 'Today' },
    { time: '9:02 AM', level: 76, trigger: 'Deadline reminder', date: 'Today' },
    { time: '4:45 PM', level: 88, trigger: 'Presentation prep', date: 'Yesterday' },
    { time: '11:30 AM', level: 79, trigger: 'Conflict detected', date: 'Yesterday' },
];

function getStressCategory(level) {
    if (level < 30) return { label: 'Calm', color: '#4ADE80', bg: 'rgba(74,222,128,0.14)' };
    if (level < 55) return { label: 'Mild', color: '#FACC15', bg: 'rgba(250,204,21,0.14)' };
    if (level < 75) return { label: 'Moderate', color: '#FB923C', bg: 'rgba(251,146,60,0.14)' };
    return { label: 'High', color: '#F87171', bg: 'rgba(248,113,113,0.14)' };
}

function BreathingRing({ level, scale, pulses }) {
    const category = getStressCategory(level);

    return (
        <View style={styles.ringWrapper}>
            {pulses.map((pulse, index) => {
                const pulseScale = pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.65 + index * 0.08],
                });
                const pulseOpacity = pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.28, 0],
                });

                return (
                    <Animated.View
                        key={index}
                        style={[
                            styles.pulseRing,
                            {
                                borderColor: category.color,
                                opacity: pulseOpacity,
                                transform: [{ scale: pulseScale }],
                            },
                        ]}
                    />
                );
            })}

            <Animated.View
                style={[
                    styles.mainRing,
                    {
                        backgroundColor: category.bg,
                        borderColor: category.color,
                        transform: [{ scale }],
                        shadowColor: category.color,
                    },
                ]}
            >
                <Text style={[styles.ringValue, { color: category.color }]}>{level}</Text>
                <Text style={[styles.ringLabel, { color: category.color }]}>STRESS</Text>
            </Animated.View>
        </View>
    );
}

function StressGraph({ data, currentIndex }) {
    return (
        <View>
            <View style={styles.graphAxisRow}>
                <View style={styles.axisLabels}>
                    {[100, 75, 50, 25, 0].map((value) => (
                        <Text key={value} style={styles.axisLabel}>{value}</Text>
                    ))}
                </View>

                <View style={styles.graphArea}>
                    {[25, 50, 75].map((value) => (
                        <View key={value} style={[styles.graphGuide, { bottom: `${value}%` }]} />
                    ))}

                    <View style={styles.graphBars}>
                        {data.map((point, index) => {
                            const category = getStressCategory(point.stress);
                            const isCurrent = index === currentIndex;

                            return (
                                <View key={`${point.hour}-${index}`} style={styles.graphColumn}>
                                    <View style={styles.graphTrack}>
                                        {isCurrent ? (
                                            <View style={[styles.graphIndicator, { borderColor: category.color }]} />
                                        ) : null}
                                        <View
                                            style={[
                                                styles.graphBar,
                                                {
                                                    height: `${Math.max(point.stress, 6)}%`,
                                                    backgroundColor: isCurrent ? category.color : '#818CF8',
                                                    opacity: isCurrent ? 1 : 0.72,
                                                },
                                            ]}
                                        />
                                    </View>
                                    <Text style={[styles.graphLabel, isCurrent && styles.graphLabelActive]}>{point.label}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            </View>
        </View>
    );
}

function PeakEventCard({ event }) {
    const category = getStressCategory(event.level);

    return (
        <View style={styles.eventCard}>
            <View style={[styles.eventBadge, { backgroundColor: category.bg, borderColor: `${category.color}66` }]}>
                <Text style={[styles.eventBadgeValue, { color: category.color }]}>{event.level}</Text>
            </View>

            <View style={styles.eventContent}>
                <Text style={styles.eventTitle}>{event.trigger}</Text>
                <Text style={styles.eventMeta}>{event.date} • {event.time}</Text>
            </View>

            <View style={[styles.eventDot, { backgroundColor: category.color, shadowColor: category.color }]} />
        </View>
    );
}

export default function DashboardScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('today');
    const [liveStress, setLiveStress] = useState(HOURLY_DATA[9].stress);
    const breatheScale = useRef(new Animated.Value(1)).current;
    const pulseAnims = useRef([
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
    ]).current;

    useEffect(() => {
        const breatheLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(breatheScale, {
                    toValue: 1.05,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(breatheScale, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        );

        const pulseLoops = pulseAnims.map((pulse, index) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(index * 500),
                    Animated.timing(pulse, {
                        toValue: 1,
                        duration: 2400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulse, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ])
            )
        );

        breatheLoop.start();
        pulseLoops.forEach((loop) => loop.start());

        const interval = setInterval(() => {
            setLiveStress((previous) => {
                const delta = (Math.random() - 0.5) * 6;
                return Math.min(100, Math.max(0, Math.round(previous + delta)));
            });
        }, 2000);

        return () => {
            clearInterval(interval);
            breatheLoop.stop();
            pulseLoops.forEach((loop) => loop.stop());
        };
    }, [breatheScale, pulseAnims]);

    const currentData = activeTab === 'today' ? HOURLY_DATA : WEEKLY_DATA;
    const currentIndex = activeTab === 'today' ? 9 : 4;
    const liveCategory = getStressCategory(liveStress);
    const stats = [
        { label: 'PEAK TODAY', value: '82', unit: '' },
        { label: 'AVG TODAY', value: '51', unit: '' },
        { label: 'HRV INDEX', value: '68', unit: 'ms' },
        { label: 'TREND', value: '↗ +5', unit: '' },
    ];

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.topBar}>
                    <View>
                        <Text style={styles.eyebrow}>NEURO TRACK</Text>
                        <Text style={styles.screenTitle}>Stress Monitor</Text>
                    </View>
                    <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                    </View>
                </View>

                <View style={styles.heroCard}>
                    <Text style={styles.sectionEyebrow}>CURRENT STATUS</Text>

                    <View style={[styles.heroRow, isCompactScreen && styles.heroRowCompact]}>
                        <BreathingRing level={liveStress} scale={breatheScale} pulses={pulseAnims} />

                        <View style={styles.heroDetails}>
                            <View style={[styles.statusBadge, { backgroundColor: liveCategory.bg, borderColor: `${liveCategory.color}55` }]}>
                                <View style={[styles.statusDot, { backgroundColor: liveCategory.color }]} />
                                <Text style={[styles.statusLabel, { color: liveCategory.color }]}>{liveCategory.label}</Text>
                            </View>

                            <View style={styles.statsGrid}>
                                {stats.map((stat) => (
                                    <View key={stat.label} style={styles.statCard}>
                                        <Text style={styles.statLabel}>{stat.label}</Text>
                                        <Text style={styles.statValue}>
                                            {stat.value}
                                            {stat.unit ? <Text style={styles.statUnit}> {stat.unit}</Text> : null}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>

                    <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>STRESS LEVEL</Text>
                        <Text style={[styles.progressValue, { color: liveCategory.color }]}>{liveStress}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${liveStress}%`,
                                    backgroundColor: liveCategory.color,
                                    shadowColor: liveCategory.color,
                                },
                            ]}
                        />
                    </View>
                    <View style={styles.progressLegend}>
                        {['Calm', 'Mild', 'Moderate', 'High'].map((label) => (
                            <Text key={label} style={styles.progressLegendText}>{label}</Text>
                        ))}
                    </View>
                </View>

                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionEyebrow}>QUICK ACTIONS</Text>
                        <Text style={styles.sectionHint}>Open a tool</Text>
                    </View>

                    <View style={styles.quickGrid}>
                        {dashboardCards.map((card) => (
                            <Pressable
                                key={card.route}
                                style={({ pressed }) => [styles.quickCard, pressed && styles.quickCardPressed]}
                                onPress={() => router.push(card.route)}
                            >
                                <View style={styles.quickIconWrap}>
                                    <Ionicons name={card.icon} size={22} color="#A5B4FC" />
                                </View>
                                <Text style={styles.quickLabel}>{card.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionEyebrow}>STRESS TIMELINE</Text>
                        <View style={styles.tabRow}>
                            {['today', 'week'].map((tab) => (
                                <Pressable
                                    key={tab}
                                    style={[styles.tabPill, activeTab === tab && styles.tabPillActive]}
                                    onPress={() => setActiveTab(tab)}
                                >
                                    <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab.toUpperCase()}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    <StressGraph data={currentData} currentIndex={currentIndex} />

                    <View style={styles.legendRow}>
                        {[
                            { color: '#4ADE80', label: 'Calm <30' },
                            { color: '#FACC15', label: 'Mild 30-55' },
                            { color: '#FB923C', label: 'Moderate 55-75' },
                            { color: '#F87171', label: 'High >75' },
                        ].map((item) => (
                            <View key={item.label} style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                                <Text style={styles.legendText}>{item.label}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionEyebrow}>PEAK EVENTS</Text>
                        <View style={styles.detectedBadge}>
                            <Text style={styles.detectedBadgeText}>{PEAK_EVENTS.length} DETECTED</Text>
                        </View>
                    </View>

                    {PEAK_EVENTS.map((event) => (
                        <PeakEventCard key={`${event.date}-${event.time}`} event={event} />
                    ))}

                    <View style={styles.insightCard}>
                        <Text style={styles.insightIcon}>i</Text>
                        <View style={styles.insightContent}>
                            <Text style={styles.insightTitle}>Pattern Detected</Text>
                            <Text style={styles.insightText}>
                                Stress peaks consistently between 2 PM and 4 PM. Schedule lighter work or guided breathing during that window.
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.bottomPills}>
                    {['Dashboard', 'History', 'Insights', 'Settings'].map((item, index) => (
                        <View key={item} style={[styles.bottomPill, index === 0 && styles.bottomPillActive]}>
                            <Text style={[styles.bottomPillText, index === 0 && styles.bottomPillTextActive]}>{item}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#0A0A0F',
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 32,
        gap: 16,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingBottom: 4,
    },
    eyebrow: {
        color: '#6B7280',
        fontSize: 11,
        letterSpacing: 2.8,
        fontWeight: '700',
    },
    screenTitle: {
        color: '#F8FAFC',
        fontSize: 24,
        fontWeight: '700',
        marginTop: 4,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: 'rgba(74,222,128,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(74,222,128,0.22)',
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4ADE80',
        shadowColor: '#4ADE80',
        shadowOpacity: 0.9,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
        elevation: 4,
    },
    liveText: {
        color: '#4ADE80',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.6,
    },
    heroCard: {
        borderRadius: 24,
        padding: 20,
        backgroundColor: '#13131F',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    sectionCard: {
        borderRadius: 24,
        padding: 20,
        backgroundColor: '#13131F',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    sectionEyebrow: {
        color: '#6B7280',
        fontSize: 10,
        letterSpacing: 2.6,
        fontWeight: '700',
        marginBottom: 16,
    },
    heroRow: {
        flexDirection: 'row',
        gap: 16,
        alignItems: 'center',
    },
    heroRowCompact: {
        flexDirection: 'column',
        alignItems: 'stretch',
    },
    ringWrapper: {
        width: 180,
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
    },
    pulseRing: {
        position: 'absolute',
        width: 164,
        height: 164,
        borderRadius: 82,
        borderWidth: 1,
    },
    mainRing: {
        width: 148,
        height: 148,
        borderRadius: 74,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOpacity: 0.28,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 0 },
        elevation: 10,
    },
    ringValue: {
        fontSize: 42,
        fontWeight: '800',
    },
    ringLabel: {
        marginTop: 4,
        fontSize: 11,
        letterSpacing: 3,
        fontWeight: '700',
    },
    heroDetails: {
        flex: 1,
        gap: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        gap: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusLabel: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 10,
    },
    statCard: {
        width: '48%',
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    statLabel: {
        color: '#6B7280',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.8,
        marginBottom: 6,
    },
    statValue: {
        color: '#F8FAFC',
        fontSize: 20,
        fontWeight: '800',
    },
    statUnit: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '500',
    },
    progressHeader: {
        marginTop: 20,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressLabel: {
        color: '#6B7280',
        fontSize: 10,
        letterSpacing: 2,
        fontWeight: '700',
    },
    progressValue: {
        fontSize: 11,
        fontWeight: '700',
    },
    progressTrack: {
        height: 8,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 999,
        shadowOpacity: 0.45,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 0 },
        elevation: 6,
    },
    progressLegend: {
        marginTop: 6,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    progressLegendText: {
        color: '#4B5563',
        fontSize: 9,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    sectionHint: {
        color: '#94A3B8',
        fontSize: 11,
    },
    quickGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 12,
        marginTop: 4,
    },
    quickCard: {
        width: '48%',
        minHeight: 112,
        borderRadius: 18,
        padding: 14,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'space-between',
    },
    quickCardPressed: {
        opacity: 0.82,
        transform: [{ scale: 0.98 }],
    },
    quickIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(129,140,248,0.12)',
    },
    quickLabel: {
        color: '#E5E7EB',
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 20,
    },
    tabRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 999,
        padding: 3,
        gap: 4,
    },
    tabPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    tabPillActive: {
        backgroundColor: '#818CF8',
    },
    tabText: {
        color: '#6B7280',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    tabTextActive: {
        color: '#FFFFFF',
    },
    graphAxisRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 6,
    },
    axisLabels: {
        justifyContent: 'space-between',
        height: 160,
        paddingBottom: 16,
    },
    axisLabel: {
        color: '#4B5563',
        fontSize: 9,
    },
    graphArea: {
        flex: 1,
        height: 176,
        justifyContent: 'flex-end',
    },
    graphGuide: {
        position: 'absolute',
        left: 0,
        right: 0,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
    },
    graphBars: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 160,
    },
    graphColumn: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
    },
    graphTrack: {
        width: 12,
        height: 140,
        justifyContent: 'flex-end',
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.04)',
        overflow: 'visible',
        position: 'relative',
    },
    graphBar: {
        width: '100%',
        borderRadius: 999,
        minHeight: 8,
    },
    graphIndicator: {
        position: 'absolute',
        top: -6,
        left: -4,
        width: 20,
        height: 152,
        borderRadius: 999,
        borderWidth: 1,
        opacity: 0.35,
    },
    graphLabel: {
        color: '#4B5563',
        fontSize: 8,
        fontWeight: '700',
    },
    graphLabelActive: {
        color: '#E5E7EB',
    },
    legendRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 18,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    legendText: {
        color: '#6B7280',
        fontSize: 9,
        fontWeight: '600',
    },
    detectedBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: 'rgba(248,113,113,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(248,113,113,0.2)',
    },
    detectedBadgeText: {
        color: '#F87171',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    eventCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginTop: 10,
    },
    eventBadge: {
        width: 46,
        height: 46,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    eventBadgeValue: {
        fontSize: 16,
        fontWeight: '800',
    },
    eventContent: {
        flex: 1,
    },
    eventTitle: {
        color: '#E5E7EB',
        fontSize: 13,
        fontWeight: '600',
    },
    eventMeta: {
        color: '#6B7280',
        fontSize: 10,
        marginTop: 4,
    },
    eventDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        shadowOpacity: 0.8,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
        elevation: 4,
    },
    insightCard: {
        marginTop: 14,
        borderRadius: 16,
        padding: 14,
        flexDirection: 'row',
        gap: 12,
        backgroundColor: 'rgba(129,140,248,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(129,140,248,0.18)',
    },
    insightIcon: {
        width: 22,
        height: 22,
        borderRadius: 11,
        textAlign: 'center',
        textAlignVertical: 'center',
        overflow: 'hidden',
        color: '#818CF8',
        fontWeight: '800',
        backgroundColor: 'rgba(129,140,248,0.16)',
    },
    insightContent: {
        flex: 1,
    },
    insightTitle: {
        color: '#A5B4FC',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
    },
    insightText: {
        color: '#94A3B8',
        fontSize: 11,
        lineHeight: 18,
    },
    bottomPills: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        paddingTop: 4,
    },
    bottomPill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'transparent',
    },
    bottomPillActive: {
        backgroundColor: '#818CF8',
        borderColor: '#818CF8',
    },
    bottomPillText: {
        color: '#6B7280',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    bottomPillTextActive: {
        color: '#FFFFFF',
    },
});