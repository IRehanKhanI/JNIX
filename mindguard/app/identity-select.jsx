import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function IdentitySelectScreen() {
    const router = useRouter();
    const [savedUsers, setSavedUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadUsers = async () => {
        try {
            const data = await AsyncStorage.getItem('savedUsers');
            if (data) {
                setSavedUsers(JSON.parse(data));
            } else {
                setSavedUsers([]);
            }
        } catch (e) {
            console.error("Error loading saved users", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleSelectUser = async (user) => {
        // Log in as this user
        if (user.token) {
            await AsyncStorage.setItem('userToken', user.token);
            router.replace('/dashboard');
        } else {
            router.replace('/login');
        }
    };

    const handleRemoveUser = async (emailToRemove) => {
        const updated = savedUsers.filter(u => u.email !== emailToRemove);
        setSavedUsers(updated);
        await AsyncStorage.setItem('savedUsers', JSON.stringify(updated));
    };

    if (loading) {
        return <SafeAreaView style={styles.safeArea}><View /></SafeAreaView>;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                
                {/* Header Header */}
                <View style={styles.header}>
                    <Ionicons name="people-outline" size={48} color="#38bdf8" style={styles.headerIcon} />
                    <Text style={styles.title}>IDENTITY SELECT</Text>
                    <Text style={styles.subtitle}>Choose an authorized profile</Text>
                </View>

                {/* User List */}
                <ScrollView contentContainerStyle={styles.listContainer}>
                    {savedUsers.map((user, index) => (
                        <View key={user.email || index} style={styles.userCard}>
                            <Pressable style={styles.userCardLeft} onPress={() => handleSelectUser(user)}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</Text>
                                </View>
                                <View style={styles.userInfo}>
                                    <Text style={styles.userName}>{user.name}</Text>
                                    <Text style={styles.userRole}>{user.role || 'USER'}</Text>
                                </View>
                            </Pressable>
                            <TouchableOpacity onPress={() => handleRemoveUser(user.email)} style={styles.removeBtn}>
                                <Ionicons name="close" size={20} color="rgba(255,255,255,0.4)" />
                            </TouchableOpacity>
                        </View>
                    ))}

                    <Pressable 
                        style={styles.addAccountBtn}
                        onPress={() => router.push('/login')}
                    >
                        <Ionicons name="add-circle-outline" size={24} color="#140f2d" />
                        <Text style={styles.addAccountText}>ADD NEW ACCOUNT</Text>
                    </Pressable>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#140f2d' }, // Midnight Violet
    container: { flex: 1, padding: 24, justifyContent: 'center' },
    
    header: { alignItems: 'center', marginBottom: 40, marginTop: 40 },
    headerIcon: { marginBottom: 15, color: '#38bdf8' }, // Match original, or we can use ff3bc6... let's match the reference's cyan for identity logo or use theme
    title: { color: '#ffffff', fontSize: 24, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
    subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
    
    listContainer: { paddingBottom: 40, gap: 16 },
    
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: 16,
        justifyContent: 'space-between'
    },
    userCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#9e0031', // Ruby Red
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        shadowColor: '#9e0031',
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 5
    },
    avatarText: {
        color: '#ffffff',
        fontSize: 20,
        fontWeight: 'bold'
    },
    userInfo: { flex: 1 },
    userName: { color: '#ffffff', fontSize: 18, fontWeight: '600', marginBottom: 4 },
    userRole: { color: 'rgba(255,255,255,0.5)', fontSize: 12, letterSpacing: 1, fontWeight: '700' },
    
    removeBtn: { padding: 8 },
    
    addAccountBtn: {
        backgroundColor: '#10b981', // Neon Green matching reference
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        marginTop: 20,
        gap: 8,
        shadowColor: '#10b981',
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 5
    },
    addAccountText: {
        color: '#140f2d',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.5
    }
});
