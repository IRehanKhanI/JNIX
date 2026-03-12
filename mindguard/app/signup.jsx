import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Dimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { registerUser } from '../src/components/services/api';

const { width } = Dimensions.get('window');

export default function SignupScreen() {
    const router = useRouter();
    const [form, setForm] = useState({ name: '', email: '', password: '', sms: '', whatsapp: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleRegister = async () => {
        if (!form.name || !form.email || !form.password) {
            setError('Name, Email, and Password are required.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await registerUser(form.name, form.email, form.password, form.sms, form.whatsapp);
            if (data.token) {
                router.replace('/dashboard');
            } else {
                setError(data.error || 'Registration failed.');
            }
        } catch (e) {
            setError('Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.accentCircle1} />
            <View style={styles.accentCircle2} />

            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.titleEyebrow}>JOIN NOW</Text>
                    <Text style={styles.title}>MindGuard</Text>
                    <Text style={styles.subtitle}>Your AI Health Companion</Text>
                </View>

                <View style={styles.glassCard}>
                    {error && <Text style={styles.errorText}>{error}</Text>}

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Full Name *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="John Doe"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={form.name}
                            onChangeText={(t) => setForm({...form, name: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Email Address *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="you@email.com"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={form.email}
                            onChangeText={(t) => setForm({...form, email: t})}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Password *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={form.password}
                            onChangeText={(t) => setForm({...form, password: t})}
                            secureTextEntry
                        />
                    </View>

                    <Text style={styles.sectionDivider}>Emergency Contacts (Optional)</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>SMS Alert Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="+1234567890"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={form.sms}
                            onChangeText={(t) => setForm({...form, sms: t})}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>WhatsApp Alert Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="+1234567890"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={form.whatsapp}
                            onChangeText={(t) => setForm({...form, whatsapp: t})}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <Pressable
                        style={[styles.btnPrimary, loading && styles.btnDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
                    </Pressable>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Already have an account?</Text>
                    <Pressable onPress={() => router.push('/login')}>
                        <Text style={styles.footerLink}> Sign In</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#140f2d' }, // Midnight Violet
    scrollContainer: { paddingHorizontal: 24, paddingVertical: 40, paddingBottom: 60 },
    
    accentCircle1: {
        position: 'absolute', top: -80, right: -40, width: width * 0.8, height: width * 0.8,
        borderRadius: width * 0.4, backgroundColor: 'rgba(158, 0, 49, 0.45)' // Ruby Red
    },
    accentCircle2: {
        position: 'absolute', bottom: -50, left: -60, width: width * 0.9, height: width * 0.9,
        borderRadius: width * 0.45, backgroundColor: 'rgba(56, 32, 107, 0.35)'
    },
    
    header: { marginBottom: 30, alignItems: 'center' },
    titleEyebrow: { color: '#ffb3c6', fontSize: 12, fontWeight: '800', letterSpacing: 3, marginBottom: 8 },
    title: { color: '#ffffff', fontSize: 36, fontWeight: '900' },
    subtitle: { color: 'rgba(255,255,255,0.6)', marginTop: 5, fontSize: 14 },

    glassCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 24, padding: 30,
        borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    
    errorText: { color: '#ff4d4d', textAlign: 'center', marginBottom: 15, fontSize: 13, fontWeight: '600' },
    sectionDivider: { color: '#ffb3c6', fontSize: 13, fontWeight: '800', marginVertical: 20, textAlign: 'center', letterSpacing: 1 },
    
    inputGroup: { marginBottom: 20 },
    inputLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 4, letterSpacing: 0.5 },
    input: { backgroundColor: 'rgba(0, 0, 0, 0.25)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', padding: 16, borderRadius: 16, color: '#ffffff', fontSize: 15 },
    
    btnPrimary: { backgroundColor: '#9e0031', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 10 },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: '#ffffff', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
    
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
    footerText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
    footerLink: { color: '#ffb3c6', fontSize: 14, fontWeight: 'bold' }
});