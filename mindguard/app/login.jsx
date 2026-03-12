import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authenticateUser } from '../src/components/services/api';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please enter your email and password.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await authenticateUser(email, password);
            if (data.token) {
                // Successful login
                router.replace('/dashboard');
            } else {
                setError(data.error || 'Invalid login credentials.');
            }
        } catch (e) {
            setError('Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Background design accents */}
            <View style={styles.accentCircle1} />
            <View style={styles.accentCircle2} />

            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.titleEyebrow}>WELCOME BACK</Text>
                    <Text style={styles.title}>MindGuard</Text>
                </View>

                {/* Glassmorphic Form Card */}
                <View style={styles.glassCard}>
                    {error && <Text style={styles.errorText}>{error}</Text>}

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="you@email.com"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <Pressable
                        style={[styles.btnPrimary, loading && styles.btnDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
                    </Pressable>
                </View>

                {/* Footer Switch */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>New to MindGuard?</Text>
                    <Pressable onPress={() => router.push('/signup')}>
                        <Text style={styles.footerLink}> Create an account</Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: '#140f2d', // Midnight Violet 
    },
    // Floating background accents to create glass feel
    accentCircle1: {
        position: 'absolute',
        top: -80,
        right: -40,
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: width * 0.4,
        backgroundColor: 'rgba(158, 0, 49, 0.45)', // Ruby Red glow
        filter: 'blur(40px)', // Experimental on some RN versions, fallback is opacity
    },
    accentCircle2: {
        position: 'absolute',
        bottom: -50,
        left: -60,
        width: width * 0.9,
        height: width * 0.9,
        borderRadius: width * 0.45,
        backgroundColor: 'rgba(56, 32, 107, 0.35)', // Lighter violet glow
    },
    container: { 
        flex: 1, 
        justifyContent: 'center', 
        paddingHorizontal: 24,
    },
    header: {
        marginBottom: 40,
        alignItems: 'center',
    },
    titleEyebrow: {
        color: '#ffb3c6', // Pastel pink accent
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 3,
        marginBottom: 8,
    },
    title: { 
        color: '#ffffff',
        fontSize: 36, 
        fontWeight: '900', 
    },
    glassCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 24,
        padding: 30,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8, // for Android
    },
    errorText: {
        color: '#ff4d4d',
        textAlign: 'center',
        marginBottom: 15,
        fontSize: 13,
        fontWeight: '600',
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    input: { 
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        borderWidth: 1, 
        borderColor: 'rgba(255, 255, 255, 0.1)',
        padding: 16, 
        borderRadius: 16, 
        color: '#ffffff',
        fontSize: 15,
    },
    btnPrimary: {
        backgroundColor: '#9e0031', // Ruby Red
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#9e0031',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
    },
    btnDisabled: {
        opacity: 0.6,
    },
    btnText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 30,
    },
    footerText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
    },
    footerLink: {
        color: '#ffb3c6',
        fontSize: 14,
        fontWeight: 'bold',
    }
});