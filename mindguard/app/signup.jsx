import React from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignupScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <Text style={styles.title}>Sign Up</Text>
                <TextInput style={styles.input} placeholder="Name" />
                <TextInput style={styles.input} placeholder="Email" />
                <TextInput style={styles.input} placeholder="Password" secureTextEntry />
                <Button title="Sign Up" onPress={() => router.replace('/dashboard')} />
                <View style={styles.space} />
                <Button title="Back to Login" onPress={() => router.push('/login')} color="gray" />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    container: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 24 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    input: { borderWidth: 1, padding: 10, marginBottom: 15, borderRadius: 5 },
    space: { height: 10 }
});