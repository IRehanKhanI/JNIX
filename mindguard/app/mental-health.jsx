import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import {
    sendMentalHealthChat,
    analyzeVoice,
    getCopingResources,
} from '../src/components/services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RISK_META = {
    low: { label: 'Low Stress', color: '#22c55e', bg: '#052e16' },
    moderate: { label: 'Moderate', color: '#eab308', bg: '#1c1906' },
    high: { label: 'High Stress', color: '#f97316', bg: '#1c0a02' },
    crisis: { label: 'Crisis — Get Help', color: '#ef4444', bg: '#1c0606' },
};

function riskKey(score) {
    if (score >= 0.8) return 'crisis';
    if (score >= 0.55) return 'high';
    if (score >= 0.25) return 'moderate';
    return 'low';
}

const INITIAL_MESSAGES = [
    { id: 'w0', role: 'bot', text: "Hi, I'm Jinx — your mental wellness companion. How are you feeling right now?" },
];

// ─── Typing bubble ────────────────────────────────────────────────────────────

function TypingBubble({ text }) {
    const [shown, setShown] = useState('');
    useEffect(() => {
        let i = 0;
        setShown('');
        const t = setInterval(() => {
            setShown(text.slice(0, i + 1));
            i++;
            if (i >= text.length) clearInterval(t);
        }, 28);
        return () => clearInterval(t);
    }, [text]);
    return <Text style={styles.botText}>{shown}</Text>;
}

// ─── Chat tab ─────────────────────────────────────────────────────────────────

function ChatTab({ messages, draft, setDraft, onSend, isThinking, scrollRef }) {
    return (
        <>
            <ScrollView
                ref={scrollRef}
                contentContainerStyle={styles.chatScroll}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
                {messages.map((m) => {
                    const isUser = m.role === 'user';
                    const rk = m.riskScore != null ? riskKey(m.riskScore) : null;
                    return (
                        <View key={m.id} style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
                            <Text style={[styles.bubbleRole, isUser ? styles.userRole : styles.botRole]}>
                                {isUser ? 'You' : 'Jinx'}
                            </Text>
                            {isUser
                                ? <Text style={styles.userText}>{m.text}</Text>
                                : <TypingBubble text={m.text} />
                            }
                            {rk && rk !== 'low' && (
                                <View style={[styles.stressTag, { backgroundColor: RISK_META[rk].bg }]}>
                                    <Text style={[styles.stressTagText, { color: RISK_META[rk].color }]}>
                                        {RISK_META[rk].label}
                                    </Text>
                                </View>
                            )}
                        </View>
                    );
                })}
                {isThinking && (
                    <View style={[styles.bubble, styles.botBubble]}>
                        <Text style={styles.botRole}>Jinx</Text>
                        <ActivityIndicator size="small" color="#38bdf8" style={{ marginTop: 4 }} />
                    </View>
                )}
            </ScrollView>

            <View style={styles.inputArea}>
                <TextInput
                    style={styles.input}
                    placeholder="Message Jinx..."
                    placeholderTextColor="#475569"
                    value={draft}
                    onChangeText={setDraft}
                    multiline
                />
                <Pressable
                    style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]}
                    onPress={onSend}
                    disabled={!draft.trim() || isThinking}
                >
                    <Text style={styles.sendBtnText}>Send</Text>
                </Pressable>
            </View>
        </>
    );
}

// ─── Resource card (shared between Voice + Resources tabs) ────────────────────

const CAT_COLORS = {
    breathing: '#0ea5e9', grounding: '#10b981', activity: '#8b5cf6',
    mindfulness: '#f59e0b', cognitive: '#ec4899', emergency: '#ef4444',
};

function ResourceCard({ resource }) {
    const [expanded, setExpanded] = useState(false);
    const cc = CAT_COLORS[resource.category] || '#64748b';
    return (
        <Pressable style={styles.resourceCard} onPress={() => setExpanded((v) => !v)}>
            <View style={styles.resourceCardHeader}>
                <View style={[styles.catBadge, { backgroundColor: cc + '22', borderColor: cc }]}>
                    <Text style={[styles.catBadgeText, { color: cc }]}>{resource.category}</Text>
                </View>
                <Text style={styles.resourceTitle} numberOfLines={expanded ? undefined : 1}>
                    {resource.title}
                </Text>
                <Text style={styles.resourceDuration}>{resource.duration_minutes}m</Text>
            </View>
            <Text style={styles.resourceDesc}>{resource.description}</Text>
            {expanded && resource.steps?.length > 0 && (
                <View style={styles.stepsBox}>
                    {resource.steps.map((step, i) => (
                        <Text key={i} style={styles.stepText}>{i + 1}. {step}</Text>
                    ))}
                </View>
            )}
            <Text style={styles.expandHint}>{expanded ? '▲ Hide steps' : '▼ Show steps'}</Text>
        </Pressable>
    );
}

// ─── Voice tab ────────────────────────────────────────────────────────────────

function VoiceTab({ sessionId, onSessionUpdate }) {
    const [recState, setRecState] = useState('idle'); // idle | recording | processing | done
    const [recording, setRecording] = useState(null);
    const [result, setResult] = useState(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (recState === 'recording') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.18, duration: 650, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1.0, duration: 650, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.stopAnimation();
            Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        }
    }, [recState, pulseAnim]);

    const startRec = async () => {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Microphone access is needed for voice analysis.');
                return;
            }
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const { recording: rec } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(rec);
            setRecState('recording');
        } catch {
            Alert.alert('Error', 'Could not start recording. Please try again.');
        }
    };

    const stopRec = async () => {
        if (!recording) return;
        setRecState('processing');
        try {
            await recording.stopAndUnloadAsync();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
            const uri = recording.getURI();
            setRecording(null);
            const data = await analyzeVoice(sessionId, uri);
            if (data.error) throw new Error(data.error);
            setResult(data);
            onSessionUpdate(data.session_id, data.risk_score ?? 0);
            setRecState('done');
        } catch {
            setRecState('idle');
            Alert.alert('Analysis failed', 'Could not process the recording. Please try again.');
        }
    };

    const rk = result ? riskKey(result.risk_score ?? 0) : 'low';
    const rm = RISK_META[rk];

    const btnLabel = { idle: '🎙  Speak', recording: '⏹  Stop', processing: '', done: '↺  Retry' }[recState];
    const hintText = {
        idle: 'Tap Speak and talk for 10–30 seconds.\nJinx will analyse stress patterns in your voice.',
        recording: 'Recording… tap Stop when done.',
        processing: 'Analysing your voice patterns…',
        done: 'Analysis complete.',
    }[recState];

    return (
        <ScrollView contentContainerStyle={styles.voiceScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.voiceHint}>{hintText}</Text>
            <Text style={styles.voiceDisclaimer}>
                ⚠  This is a heuristic tool, not a clinical diagnosis.
            </Text>

            <Animated.View style={[styles.recordRing, recState === 'recording' && styles.recordRingActive, { transform: [{ scale: pulseAnim }] }]}>
                <Pressable
                    style={[styles.recordBtn, recState === 'recording' && styles.recordBtnActive]}
                    onPress={recState === 'idle' ? startRec : recState === 'recording' ? stopRec : () => { setResult(null); setRecState('idle'); }}
                    disabled={recState === 'processing'}
                >
                    {recState === 'processing'
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.recordBtnText}>{btnLabel}</Text>
                    }
                </Pressable>
            </Animated.View>

            {result && (
                <View style={styles.analysisCard}>
                    <View style={[styles.analysisBanner, { backgroundColor: rm.bg }]}>
                        <Text style={[styles.analysisLabel, { color: rm.color }]}>{rm.label}</Text>
                        <Text style={[styles.analysisScore, { color: rm.color }]}>
                            Risk {Math.round((result.risk_score ?? 0) * 100)}%
                        </Text>
                    </View>
                    <Text style={styles.analysisNote}>{result.notes}</Text>
                    {result.coping_resources?.length > 0 && (
                        <>
                            <Text style={styles.suggestedHeader}>Suggested resources</Text>
                            {result.coping_resources.map((r) => (
                                <ResourceCard key={r.id} resource={r} />
                            ))}
                        </>
                    )}
                </View>
            )}
        </ScrollView>
    );
}

// ─── Resources tab ────────────────────────────────────────────────────────────

function ResourcesTab() {
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getCopingResources()
            .then((data) => setResources(Array.isArray(data) ? data : []))
            .catch(() => setResources([]))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color="#38bdf8" />;

    if (!resources.length) {
        return (
            <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                    No resources found.{'\n'}Run the backend seed command:{'\n\n'}
                    python manage.py seed_coping_resources
                </Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.resourcesScroll} showsVerticalScrollIndicator={false}>
            {resources.map((r) => <ResourceCard key={r.id} resource={r} />)}
        </ScrollView>
    );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

const TABS = ['Chat', 'Voice', 'Resources'];

export default function MentalHealthScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('Chat');
    const [messages, setMessages] = useState(INITIAL_MESSAGES);
    const [draft, setDraft] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [sessionRisk, setSessionRisk] = useState(0);
    const scrollRef = useRef(null);

    const updateSession = useCallback((sid, risk) => {
        if (sid) setSessionId(sid);
        if (typeof risk === 'number') setSessionRisk(risk);
    }, []);

    const handleSend = async () => {
        const trimmed = draft.trim();
        if (!trimmed || isThinking) return;

        const userMsgId = `u-${Date.now()}`;
        setDraft('');
        setMessages((prev) => [...prev, { id: userMsgId, role: 'user', text: trimmed }]);
        setIsThinking(true);

        try {
            const data = await sendMentalHealthChat(trimmed, sessionId);
            setMessages((prev) => {
                const updated = prev.map((m) =>
                    m.id === userMsgId
                        ? { ...m, stressLevel: data.stress_level, riskScore: data.risk_score }
                        : m
                );
                return [
                    ...updated,
                    { id: `b-${Date.now()}`, role: 'bot', text: data.reply || "I'm here for you." },
                ];
            });
            updateSession(data.session_id, data.session_risk);
        } catch {
            setMessages((prev) => [
                ...prev,
                { id: `b-${Date.now()}`, role: 'bot', text: 'Could not reach the backend. Check your connection.' },
            ]);
        } finally {
            setIsThinking(false);
        }
    };

    const rk = riskKey(sessionRisk);
    const rm = RISK_META[rk];

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

                {/* ── Header ── */}
                <View style={styles.header}>
                    <Pressable style={styles.backBtn} onPress={() => router.back()}>
                        <Text style={styles.backBtnText}>←</Text>
                    </Pressable>
                    <Text style={styles.headerTitle}>Companion Space</Text>
                    <View style={[styles.riskPill, { backgroundColor: rm.bg }]}>
                        <Text style={[styles.riskPillText, { color: rm.color }]}>{rm.label}</Text>
                    </View>
                </View>

                {/* ── Avatar hero ── */}
                <View style={styles.heroRow}>
                    <View style={styles.avatarShell}>
                        <Text style={styles.avatarText}>J</Text>
                    </View>
                    <View style={styles.heroInfo}>
                        <Text style={styles.heroName}>Jinx</Text>
                        <View style={styles.onlinePill}>
                            <View style={styles.onlineDot} />
                            <Text style={styles.onlineLabel}>Online</Text>
                        </View>
                        <Text style={styles.heroCaption}>
                            AI Stress Detection{'\n'}Mental Wellness Support
                        </Text>
                    </View>
                </View>

                {/* ── Tab bar ── */}
                <View style={styles.tabBar}>
                    {TABS.map((t) => (
                        <Pressable
                            key={t}
                            style={[styles.tabItem, activeTab === t && styles.tabItemActive]}
                            onPress={() => setActiveTab(t)}
                        >
                            <Text style={[styles.tabLabel, activeTab === t && styles.tabLabelActive]}>{t}</Text>
                        </Pressable>
                    ))}
                </View>

                {/* ── Tab content ── */}
                <View style={styles.flex}>
                    {activeTab === 'Chat' && (
                        <ChatTab
                            messages={messages}
                            draft={draft}
                            setDraft={setDraft}
                            onSend={handleSend}
                            isThinking={isThinking}
                            scrollRef={scrollRef}
                        />
                    )}
                    {activeTab === 'Voice' && (
                        <VoiceTab sessionId={sessionId} onSessionUpdate={updateSession} />
                    )}
                    {activeTab === 'Resources' && <ResourcesTab />}
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    flex: { flex: 1 },
    safeArea: { flex: 1, backgroundColor: '#06101c' },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
    headerTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700' },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
    backBtnText: { color: '#38bdf8', fontSize: 20, fontWeight: 'bold' },
    riskPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
    riskPillText: { fontSize: 11, fontWeight: '700' },

    // Hero
    heroRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12, gap: 16 },
    avatarShell: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#0f172a', borderWidth: 2, borderColor: '#38bdf8', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#38bdf8', fontSize: 32, fontWeight: '800' },
    heroInfo: { flex: 1, gap: 6 },
    heroName: { color: '#f8fafc', fontSize: 22, fontWeight: '800' },
    onlinePill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: '#022c22' },
    onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
    onlineLabel: { color: '#34d399', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    heroCaption: { color: '#64748b', fontSize: 12, lineHeight: 18 },

    // Tab bar
    tabBar: { flexDirection: 'row', backgroundColor: '#0b1525', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#1e293b' },
    tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    tabItemActive: { borderBottomWidth: 2, borderBottomColor: '#38bdf8' },
    tabLabel: { color: '#64748b', fontWeight: '600', fontSize: 14 },
    tabLabelActive: { color: '#38bdf8' },

    // Chat
    chatScroll: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 12, gap: 12 },
    bubble: { maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 20, gap: 4 },
    botBubble: { alignSelf: 'flex-start', backgroundColor: '#0f172a', borderBottomLeftRadius: 4 },
    userBubble: { alignSelf: 'flex-end', backgroundColor: '#1e3a8a', borderBottomRightRadius: 4 },
    bubbleRole: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
    botRole: { color: '#38bdf8' },
    userRole: { color: '#93c5fd' },
    botText: { color: '#f1f5f9', fontSize: 15, lineHeight: 22 },
    userText: { color: '#fff', fontSize: 15, lineHeight: 22 },
    stressTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
    stressTagText: { fontSize: 10, fontWeight: '700' },
    inputArea: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#020617', borderTopWidth: 1, borderTopColor: '#1e293b', gap: 10 },
    input: { flex: 1, minHeight: 44, maxHeight: 100, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, borderRadius: 22, backgroundColor: '#0f172a', color: '#f8fafc', fontSize: 15 },
    sendBtn: { height: 44, paddingHorizontal: 18, justifyContent: 'center', borderRadius: 22, backgroundColor: '#38bdf8' },
    sendBtnDisabled: { opacity: 0.4 },
    sendBtnText: { color: '#020617', fontWeight: '800', fontSize: 14 },

    // Voice
    voiceScroll: { padding: 24, alignItems: 'center', gap: 18 },
    voiceHint: { color: '#94a3b8', fontSize: 14, textAlign: 'center', lineHeight: 22 },
    voiceDisclaimer: { color: '#475569', fontSize: 11, textAlign: 'center' },
    recordRing: { width: 136, height: 136, borderRadius: 68, borderWidth: 3, borderColor: '#38bdf8', alignItems: 'center', justifyContent: 'center' },
    recordRingActive: { borderColor: '#ef4444' },
    recordBtn: { width: 108, height: 108, borderRadius: 54, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
    recordBtnActive: { backgroundColor: '#1c0606' },
    recordBtnText: { color: '#f8fafc', fontSize: 15, fontWeight: '700' },
    analysisCard: { width: '100%', backgroundColor: '#0f172a', borderRadius: 20, overflow: 'hidden', gap: 12, paddingBottom: 16 },
    analysisBanner: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    analysisLabel: { fontSize: 17, fontWeight: '800' },
    analysisScore: { fontSize: 14, fontWeight: '700' },
    analysisNote: { color: '#94a3b8', fontSize: 14, lineHeight: 20, paddingHorizontal: 16 },
    suggestedHeader: { color: '#38bdf8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16 },

    // Resources
    resourcesScroll: { padding: 16, gap: 12 },
    resourceCard: { backgroundColor: '#0f172a', borderRadius: 16, padding: 14, gap: 8 },
    resourceCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
    catBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    resourceTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '700', flex: 1 },
    resourceDuration: { color: '#64748b', fontSize: 12 },
    resourceDesc: { color: '#94a3b8', fontSize: 13, lineHeight: 20 },
    stepsBox: { backgroundColor: '#0b1525', borderRadius: 12, padding: 12, gap: 6 },
    stepText: { color: '#cbd5e1', fontSize: 13, lineHeight: 20 },
    expandHint: { color: '#38bdf8', fontSize: 12, fontWeight: '600' },
    emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
    emptyText: { color: '#64748b', textAlign: 'center', lineHeight: 22, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
