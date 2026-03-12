import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    Animated,
    Dimensions,
    ScrollView,
    StatusBar
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function HealthDetectionScreen() {
    const router = useRouter();
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    // --- ANIMATION VALUES ---
    const scanAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (loading) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scanAnim, {
                        toValue: 240, 
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scanAnim, {
                        toValue: 0,
                        duration: 1500,
                        useNativeDriver: true,
                    })
                ])
            ).start();
        } else {
            scanAnim.setValue(0);
        }
    }, [loading]);

    useEffect(() => {
        if (result) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }).start();
        } else {
            fadeAnim.setValue(0);
        }
    }, [result]);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Required", "Gallery access is needed to upload photos.");
            return;
        }

        let res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!res.canceled) {
            setImage(res.assets[0].uri);
            setResult(null);
        }
    };

    const openCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Required", "Camera access is needed to take photos.");
            return;
        }

        let res = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!res.canceled) {
            setImage(res.assets[0].uri);
            setResult(null);
        }
    };

    const runAnalysis = async () => {
        if (!image) return;
        setLoading(true);
        setResult(null);

        let formData = new FormData();
        formData.append("image", {
            uri: image,
            name: "health_scan.jpg",
            type: "image/jpeg"
        });

        try {
            const response = await axios.post(
                "http://YOUR_IP_HERE:8000/api/health-detect/", 
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );

            setTimeout(() => {
                setResult(response.data);
                setLoading(false);
            }, 2000);

        } catch (error) {
            Alert.alert("Connection Error", "AI Engine is unreachable.");
            setLoading(false);
        }
    };

    const resetScan = () => {
        setImage(null);
        setResult(null);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" />
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                
                {/* Dashboard Style Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1E293B" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerLabel}>DASHBOARD</Text>
                        <Text style={styles.title}>Health Scanner</Text>
                    </View>
                    <TouchableOpacity onPress={resetScan} style={styles.refreshBtn}>
                        <Ionicons name="refresh" size={20} color="#64748B" />
                    </TouchableOpacity>
                </View>

                {/* Main Scan Card */}
                <View style={styles.mainCard}>
                    <Text style={styles.cardTitle}>Image Analysis</Text>
                    <Text style={styles.cardSubtitle}>Capture or upload a clear photo of the area.</Text>

                    <View style={[styles.imageBox, result && styles.imageBoxSuccess]}>
                        {image ? (
                            <View style={styles.imageContainer}>
                                <Image source={{ uri: image }} style={styles.image} />
                                {loading && (
                                    <Animated.View
                                        style={[
                                            styles.scannerLine,
                                            { transform: [{ translateY: scanAnim }] }
                                        ]}
                                    />
                                )}
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.uploadPlaceholder} onPress={pickImage}>
                                <View style={styles.uploadIconCircle}>
                                    <Ionicons name="cloud-upload-outline" size={32} color="#3B82F6" />
                                </View>
                                <Text style={styles.uploadText}>Tap to Upload</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Action Row */}
                    {!result && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.outlineBtn} onPress={openCamera}>
                                <Ionicons name="camera-outline" size={20} color="#3B82F6" />
                                <Text style={styles.outlineBtnText}>Camera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.outlineBtn} onPress={pickImage}>
                                <Ionicons name="images-outline" size={20} color="#3B82F6" />
                                <Text style={styles.outlineBtnText}>Gallery</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {!result && (
                        <TouchableOpacity
                            style={[styles.primaryBtn, (!image || loading) && styles.btnDisabled]}
                            onPress={runAnalysis}
                            disabled={!image || loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.primaryBtnText}>Run Diagnostics</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {/* Dashboard Result Widget */}
                {result && (
                    <Animated.View style={[styles.resultWidget, { opacity: fadeAnim }]}>
                        <View style={styles.widgetHeader}>
                            <Ionicons name="analytics" size={20} color="#3B82F6" />
                            <Text style={styles.widgetHeaderText}>ANALYSIS REPORT</Text>
                        </View>

                        <View style={styles.resultRow}>
                            <View>
                                <Text style={styles.resLabel}>Condition</Text>
                                <Text style={styles.resValue}>{result.condition || "Healthy"}</Text>
                            </View>
                            <View style={styles.confidenceBadge}>
                                <Text style={styles.confidenceText}>{result.confidence || 0}% Match</Text>
                            </View>
                        </View>

                        <View style={styles.infoBox}>
                            <Text style={styles.infoText}>
                                {result.advice || "No immediate action required. Monitor for changes."}
                            </Text>
                        </View>

                        <TouchableOpacity style={styles.resetBtnFull} onPress={resetScan}>
                            <Text style={styles.resetBtnText}>Perform New Scan</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F1F5F9' }, // Light Gray Dashboard BG
    scrollContainer: { paddingBottom: 40, paddingHorizontal: 20 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 15,
        marginBottom: 20,
    },
    backButton: {
        padding: 8,
        backgroundColor: '#fff',
        borderRadius: 10,
    },
    headerLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', letterSpacing: 1 },
    title: { fontSize: 24, fontWeight: '800', color: '#1E293B' },
    refreshBtn: { padding: 8 },

    // Main Card Style
    mainCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        marginBottom: 20,
    },
    cardTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
    cardSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 20 },
    
    imageBox: {
        width: '100%',
        height: 240,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageBoxSuccess: { borderStyle: 'solid', borderColor: '#3B82F6', borderWidth: 2 },
    imageContainer: { width: '100%', height: '100%' },
    image: { width: '100%', height: '100%', resizeMode: 'cover' },
    
    uploadPlaceholder: { alignItems: 'center' },
    uploadIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    uploadText: { color: '#3B82F6', fontWeight: '600', fontSize: 14 },
    
    scannerLine: {
        position: 'absolute',
        width: '100%',
        height: 4,
        backgroundColor: '#3B82F6',
        shadowColor: '#3B82F6',
        shadowOpacity: 0.5,
        shadowRadius: 5,
    },

    actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
    outlineBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 0.48,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#BFDBFE',
        backgroundColor: '#fff',
    },
    outlineBtnText: { marginLeft: 8, color: '#3B82F6', fontWeight: '600' },
    
    primaryBtn: {
        backgroundColor: '#1E293B', // Dark Navy Dashboard Button
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 15,
    },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    btnDisabled: { backgroundColor: '#94A3B8' },

    // Result Widget Style
    resultWidget: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        borderLeftWidth: 6,
        borderLeftColor: '#3B82F6',
    },
    widgetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    widgetHeaderText: { fontSize: 12, fontWeight: '800', color: '#64748B', marginLeft: 8, letterSpacing: 0.5 },
    
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    resLabel: { fontSize: 12, color: '#64748B', marginBottom: 2 },
    resValue: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
    
    confidenceBadge: { backgroundColor: '#DBEAFE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    confidenceText: { color: '#1E40AF', fontWeight: '700', fontSize: 12 },
    
    infoBox: { backgroundColor: '#F8FAFC', padding: 15, borderRadius: 12, marginBottom: 20 },
    infoText: { fontSize: 14, color: '#475569', lineHeight: 20 },
    
    resetBtnFull: { paddingVertical: 15, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    resetBtnText: { color: '#64748B', fontWeight: '600' },
});