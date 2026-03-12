import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { logoutUser } from '../src/components/services/api';

const dashboardCards = [
    { label: 'Mental Health Companion', route: '/mental-health', icon: 'heart' },
    { label: 'Health Scanner', route: '/HealthDetectionScreen', icon: 'scan' },
    { label: 'Fall Detection Monitor', route: '/FallDetectionScreen', icon: 'walk' },
];

export default function DashboardScreen() {
    const router = useRouter();
    const [stats, setStats] = useState({ connected: false, loading: true, recentFalls: [] });

    const handleLogout = async () => {
        await logoutUser();
        router.replace('/login');
    };

    useEffect(() => {
        let mounted = true;
        
        async function fetchStatus() {
            try {
                // Ping the fall-detect endpoint to verify connection and get latest alerts for real data
                const res = await fetch('http://10.55.184.66:8000/api/fall-detect/incidents/');
                if (res.ok) {
                    const data = await res.json();
                    if (mounted) {
                        setStats({ connected: true, loading: false, recentFalls: data.slice(0, 3) });
                    }
                } else {
                    if (mounted) setStats({ connected: false, loading: false, recentFalls: [] });
                }
            } catch (e) {
                if (mounted) setStats({ connected: false, loading: false, recentFalls: [] });
            }
        }
        
        fetchStatus();
        const interval = setInterval(fetchStatus, 3000);
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                
                {/* Header with Connection Status */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.eyebrow}>MINDGUARD</Text>
                        <Text style={styles.title}>Dashboard</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={[styles.statusBadge, { backgroundColor: stats.connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
                            <View style={[styles.statusDot, { backgroundColor: stats.connected ? '#10b981' : '#ef4444' }]} />
                            <Text style={[styles.statusText, { color: stats.connected ? '#10b981' : '#ef4444' }]}>
                                {stats.loading ? '...' : stats.connected ? 'Connected' : 'Offline'}
                            </Text>
                        </View>
                        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
                            <Ionicons name="log-out-outline" size={24} color="#ffb3c6" />
                        </Pressable>
                    </View>
                </View>

                {/* Main Hero Card */}
                <View style={styles.heroCard}>
                    <View style={styles.heroTextContent}>
                        <Text style={styles.heroTitle}>Welcome to MindGuard</Text>
                        <Text style={styles.heroDesc}>
                            Your AI-powered accessibility and wellness assistant. Monitor vital metrics, detect falls, and interact with your mental health companion.
                        </Text>
                    </View>
                    <Ionicons name="shield-checkmark" size={60} color="#ffb3c6" style={styles.heroIcon} />
                </View>

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
                <View style={styles.grid}>
                    {dashboardCards.map((card) => (
                        <Pressable
                            key={card.route}
                            style={styles.card}
                            onPress={() => router.push(card.route)}
                        >
                            <View style={styles.iconContainer}>
                                <Ionicons name={card.icon} size={28} color="#ffb3c6" />
                            </View>
                            <Text style={styles.cardLabel}>{card.label}</Text>
                        </Pressable>
                    ))}
                </View>

                {/* Real Data: Recent Falls */}
                <Text style={styles.sectionTitle}>RECENT EMERGENCY ALERTS (REAL DATA)</Text>
                <View style={styles.alertsContainer}>
                    {stats.loading ? (
                        <ActivityIndicator color="#ffb3c6" style={{ padding: 20 }} />
                    ) : !stats.connected ? (
                        <Text style={styles.emptyText}>Cannot reach backend to load alerts.</Text>
                    ) : stats.recentFalls.length === 0 ? (
                        <Text style={styles.emptyText}>No recent falls detected.</Text>
                    ) : (
                        stats.recentFalls.map((event, index) => (
                            <View key={event.id} style={[styles.alertItem, index === stats.recentFalls.length - 1 && styles.alertItemLast]}>
                                <View style={[styles.alertIconArea, event.severity === 'Critical' ? styles.alertIconAreaCrit : undefined]}>
                                    <Ionicons name="warning" size={20} color={event.severity === 'Critical' ? "#ef4444" : "#f59e0b"} />
                                </View>
                                <View style={styles.alertInfo}>
                                    <Text style={styles.alertActivity}>{event.activity}</Text>
                                    <Text style={styles.alertMeta}>Source: {event.source} • Conf: {event.confidence}%</Text>
                                </View>
                                <Text style={styles.alertTime}>
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
    safeArea: { flex: 1, backgroundColor: '#140f2d' }, // Midnight Violet
    container: { padding: 20, paddingBottom: 40 },
    
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    eyebrow: { color: '#ffb3c6', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
    title: { color: '#f8fafc', fontSize: 26, fontWeight: '800' },
    
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 12, fontWeight: '700' },

    heroCard: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 24, padding: 24, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', marginBottom: 30 },
    heroTextContent: { flex: 1, paddingRight: 10 },
    heroTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800', marginBottom: 8 },
    heroDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 22 },
    heroIcon: { opacity: 0.9 },

    sectionTitle: { color: '#ffb3c6', fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginBottom: 15 },
    
    grid: { flexDirection: 'column', gap: 12, marginBottom: 30 },
    card: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 20, borderRadius: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 15 },
    iconContainer: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(158, 0, 49, 0.2)', alignItems: 'center', justifyContent: 'center' },
    cardLabel: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },

    alertsContainer: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', paddingVertical: 10 },
    
    alertItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    alertItemLast: { borderBottomWidth: 0 },
    alertIconArea: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,165,0,0.15)', alignItems: 'center', justifyContent: 'center' },
    alertIconAreaCrit: { backgroundColor: 'rgba(158, 0, 49, 0.2)' },
    alertInfo: { flex: 1 },
    alertActivity: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
    alertMeta: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
    alertTime: { color: '#ffb3c6', fontSize: 12, fontWeight: '600' },
    
    logoutBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,179,198,0.1)', alignItems: 'center', justifyContent: 'center' }
});