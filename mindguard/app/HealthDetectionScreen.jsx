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
                "192.168.137.1/api/health-detect/",
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
            <StatusBar barStyle="light-content" />
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

                {/* Dashboard Style Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#38bdf8" />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={styles.headerLabel}>DASHBOARD</Text>
                        <Text style={styles.title}>Health Scanner</Text>
                    </View>
                    <TouchableOpacity onPress={resetScan} style={styles.refreshBtn}>
                        <Ionicons name="refresh" size={20} color="#38bdf8" />
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
                                    <Ionicons name="cloud-upload-outline" size={32} color="#38bdf8" />
                                </View>
                                <Text style={styles.uploadText}>Tap to Upload</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Action Row */}
                    {!result && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.outlineBtn} onPress={openCamera}>
                                <Ionicons name="camera-outline" size={20} color="#38bdf8" />
                                <Text style={styles.outlineBtnText}>Camera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.outlineBtn} onPress={pickImage}>
                                <Ionicons name="images-outline" size={20} color="#38bdf8" />
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
                                <ActivityIndicator color="#020617" />
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
                            <Ionicons name="analytics" size={20} color="#38bdf8" />
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
    safeArea: { flex: 1, backgroundColor: '#06101c' },
    scrollContainer: { paddingBottom: 40, paddingHorizontal: 20 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 15,
        marginBottom: 20,
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#0f172a',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 1 },
    title: { fontSize: 20, fontWeight: '800', color: '#f8fafc' },
    refreshBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#0f172a',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Main Card Style
    mainCard: {
        backgroundColor: '#0f172a',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
    },
    cardTitle: { fontSize: 17, fontWeight: '700', color: '#f8fafc', marginBottom: 4 },
    cardSubtitle: { fontSize: 13, color: '#94a3b8', marginBottom: 20 },

    imageBox: {
        width: '100%',
        height: 240,
        borderRadius: 16,
        backgroundColor: '#0b1525',
        borderWidth: 1.5,
        borderColor: '#1e3a8a',
        borderStyle: 'dashed',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageBoxSuccess: { borderStyle: 'solid', borderColor: '#38bdf8', borderWidth: 2 },
    imageContainer: { width: '100%', height: '100%' },
    image: { width: '100%', height: '100%', resizeMode: 'cover' },

    uploadPlaceholder: { alignItems: 'center' },
    uploadIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#08111f',
        borderWidth: 1,
        borderColor: '#1e3a8a',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    uploadText: { color: '#38bdf8', fontWeight: '600', fontSize: 14 },

    scannerLine: {
        position: 'absolute',
        width: '100%',
        height: 4,
        backgroundColor: '#38bdf8',
        shadowColor: '#38bdf8',
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 5,
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
        borderColor: '#1e3a8a',
        backgroundColor: '#0b1525',
    },
    outlineBtnText: { marginLeft: 8, color: '#38bdf8', fontWeight: '600' },

    primaryBtn: {
        backgroundColor: '#38bdf8',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 15,
    },
    primaryBtnText: { color: '#020617', fontWeight: '800', fontSize: 15 },
    btnDisabled: { opacity: 0.4 },

    // Result Widget Style
    resultWidget: {
        backgroundColor: '#0f172a',
        borderRadius: 20,
        padding: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#38bdf8',
    },
    widgetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    widgetHeaderText: { fontSize: 12, fontWeight: '800', color: '#38bdf8', marginLeft: 8, letterSpacing: 0.5 },

    resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    resLabel: { fontSize: 12, color: '#64748b', marginBottom: 2, fontWeight: '600' },
    resValue: { fontSize: 20, fontWeight: '800', color: '#f8fafc' },

    confidenceBadge: { backgroundColor: '#0b1525', borderWidth: 1, borderColor: '#1e3a8a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    confidenceText: { color: '#38bdf8', fontWeight: '700', fontSize: 12 },

    infoBox: { backgroundColor: '#0b1525', padding: 15, borderRadius: 12, marginBottom: 20 },
    infoText: { fontSize: 14, color: '#cbd5e1', lineHeight: 20 },

    resetBtnFull: { paddingVertical: 15, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#1e293b' },
    resetBtnText: { color: '#38bdf8', fontWeight: '700', fontSize: 15 },
});