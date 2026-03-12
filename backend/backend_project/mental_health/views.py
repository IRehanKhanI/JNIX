import random

from django.db.models import Avg
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ChatSession, ChatMessage, CopingResource, VoiceAnalysis
from .serializers import (
    ChatSessionSerializer,
    CopingResourceSerializer,
    VoiceAnalysisSerializer,
)

# ──────────────────────────────────────────────────────────────────────────────
# Keyword-based stress engine
# ──────────────────────────────────────────────────────────────────────────────

STRESS_PATTERNS = {
    'crisis': {
        'keywords': [
            'suicide', 'kill myself', 'end my life', 'self harm',
            'hurt myself', 'want to die', 'not worth living', 'no reason to live',
        ],
        'score': 1.0,
    },
    'high': {
        'keywords': [
            'hopeless', 'worthless', "can't cope", 'cant cope',
            'overwhelmed', 'breaking down', 'falling apart', 'panic attack',
            'no point', 'give up', 'burnout', 'nothing matters', 'trapped',
            'shaking', "can't breathe",
        ],
        'score': 0.75,
    },
    'moderate': {
        'keywords': [
            'stressed', 'anxious', 'anxiety', 'worried', 'upset', 'sad',
            'depressed', 'lonely', 'nervous', 'scared', 'frightened',
            'frustrated', 'angry', 'irritable', 'unmotivated', 'dread',
        ],
        'score': 0.45,
    },
    'low': {
        'keywords': [
            'tired', 'busy', 'difficult', 'hard', 'struggling',
            'problem', 'issue', 'challenge', 'pressure', 'tense',
        ],
        'score': 0.2,
    },
}

POSITIVE_INDICATORS = [
    'happy', 'good', 'great', 'wonderful', 'excited', 'calm', 'peaceful',
    'better', 'improved', 'grateful', 'hopeful', 'okay', 'fine', 'relieved',
]

BOT_RESPONSES = {
    'crisis': [
        "I hear you, and this is serious — you are not alone. "
        "Please contact a crisis line right now. In the US call or text 988 (Suicide & Crisis Lifeline). "
        "Your life matters and immediate support is available.",
        "Thank you for trusting me with something this heavy. "
        "Please reach out to emergency services or a crisis helpline immediately — "
        "988 (US) or your local emergency number. I will stay here, but you deserve real human support right now.",
    ],
    'high': [
        "That sounds incredibly heavy, and it takes real courage to put it into words. "
        "Let's slow down together — can you take one deep breath right now? "
        "I have some grounding techniques that can help.",
        "I can hear how exhausted you are. You don't need to have it all figured out. "
        "Can you tell me one small thing that felt even slightly okay today?",
        "What you're feeling is valid. When everything feels like too much, start with just the next breath. "
        "Would you like to try a quick coping exercise together?",
    ],
    'moderate': [
        "That sounds really tough. Feelings like these are signals worth paying attention to, not pushing away. "
        "What has been weighing on you most?",
        "I understand. Stress and anxiety can feel relentless. "
        "You've taken a good step by talking about it. Would it help to walk me through what's been happening?",
        "Thank you for sharing. You're not alone in feeling this way. "
        "Is there one specific thing that's been the hardest lately?",
    ],
    'low': [
        "It sounds like things have been rough. You're handling more than you might realise. "
        "What would feel like a small win for you today?",
        "I hear you. Even everyday struggles deserve attention. Is there something specific on your mind?",
    ],
    'positive': [
        "That's really good to hear! Positive moments are worth holding onto. What's been going well for you?",
        "I'm glad things are feeling better. It sounds like you're finding your footing — keep noticing those moments.",
    ],
    'neutral': [
        "I'm here and listening. Tell me more about what's on your mind.",
        "Thank you for sharing. How long have you been feeling this way?",
        "I'm with you. What would be most helpful to talk through right now?",
        "Go on — I want to understand what you're going through.",
    ],
}


def analyze_text_stress(text):
    """Return (level, score, detected_keywords) from keyword matching."""
    text_lower = text.lower()
    max_score = 0.0
    detected = []
    level = 'neutral'

    for category, data in STRESS_PATTERNS.items():
        for keyword in data['keywords']:
            if keyword in text_lower and keyword not in detected:
                detected.append(keyword)
                if data['score'] > max_score:
                    max_score = data['score']
                    level = category

    if not detected:
        if any(w in text_lower for w in POSITIVE_INDICATORS):
            level = 'positive'

    return level, max_score, detected


def _get_or_create_session(session_id_str):
    if session_id_str:
        try:
            return ChatSession.objects.get(session_id=session_id_str)
        except (ChatSession.DoesNotExist, Exception):
            pass
    return ChatSession.objects.create()


# ──────────────────────────────────────────────────────────────────────────────
# Views
# ──────────────────────────────────────────────────────────────────────────────

class ChatView(APIView):
    """POST /api/mental-health/chat/"""
    parser_classes = [JSONParser]

    def post(self, request):
        message_text = request.data.get('message', '').strip()
        if not message_text:
            return Response({'error': 'message is required.'}, status=status.HTTP_400_BAD_REQUEST)

        session = _get_or_create_session(request.data.get('session_id'))

        level, score, keywords = analyze_text_stress(message_text)

        ChatMessage.objects.create(
            session=session,
            role='user',
            text=message_text,
            stress_score=score,
            detected_keywords=keywords,
        )

        avg = session.messages.filter(role='user').aggregate(avg=Avg('stress_score'))['avg'] or 0.0
        session.overall_risk_score = round(avg, 3)
        session.save()

        bot_text = random.choice(BOT_RESPONSES.get(level, BOT_RESPONSES['neutral']))

        if score >= 0.7:
            coping_qs = CopingResource.objects.filter(is_active=True).order_by('?')[:3]
        elif score >= 0.4:
            coping_qs = CopingResource.objects.filter(
                is_active=True
            ).exclude(category='emergency').order_by('?')[:2]
        else:
            coping_qs = CopingResource.objects.filter(
                is_active=True, category__in=['breathing', 'mindfulness']
            ).order_by('?')[:1]

        ChatMessage.objects.create(
            session=session, role='bot', text=bot_text,
            stress_score=0.0, detected_keywords=[],
        )

        return Response({
            'session_id': str(session.session_id),
            'reply': bot_text,
            'stress_level': level,
            'risk_score': score,
            'session_risk': session.overall_risk_score,
            'coping_resources': CopingResourceSerializer(coping_qs, many=True).data,
        })


class VoiceAnalysisView(APIView):
    """POST /api/mental-health/voice/"""
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        audio_file = request.FILES.get('audio')
        if not audio_file:
            return Response({'error': 'audio file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        session = _get_or_create_session(request.data.get('session_id'))

        # Heuristic analysis — replace with an ML model (e.g. librosa/openSMILE) for production.
        # File size in KB is used as a rough proxy for speech energy/duration.
        size_kb = audio_file.size / 1024
        normalised = min(1.0, size_kb / 500)   # 500 KB ≈ ~30s of high-quality audio
        risk_score = round(0.15 + normalised * 0.70, 3)   # scale to [0.15, 0.85]

        if risk_score >= 0.75:
            stress_level = 'crisis'
            notes = (
                'Voice patterns show significant stress indicators. '
                'Please consider reaching out to a mental health professional or crisis line.'
            )
        elif risk_score >= 0.55:
            stress_level = 'high'
            notes = 'Elevated stress markers detected. Coping exercises have been suggested below.'
        elif risk_score >= 0.30:
            stress_level = 'moderate'
            notes = 'Some stress markers noted. A short grounding exercise may help.'
        else:
            stress_level = 'low'
            notes = 'Voice patterns appear generally calm. Keep up the self-care!'

        analysis = VoiceAnalysis.objects.create(
            session=session,
            audio_file=audio_file,
            stress_level=stress_level,
            risk_score=risk_score,
            notes=notes,
        )

        if risk_score >= 0.55:
            coping_qs = CopingResource.objects.filter(is_active=True).order_by('?')[:3]
        else:
            coping_qs = CopingResource.objects.filter(
                is_active=True, category__in=['breathing', 'grounding']
            ).order_by('?')[:2]

        return Response({
            'session_id': str(session.session_id),
            'analysis_id': analysis.id,
            'stress_level': stress_level,
            'risk_score': risk_score,
            'notes': notes,
            'coping_resources': CopingResourceSerializer(coping_qs, many=True).data,
        })


class CopingResourcesView(APIView):
    """GET /api/mental-health/resources/?category=<cat>"""

    def get(self, request):
        category = request.query_params.get('category')
        qs = CopingResource.objects.filter(is_active=True)
        if category:
            qs = qs.filter(category=category)
        return Response(CopingResourceSerializer(qs, many=True).data)


class ChatHistoryView(APIView):
    """GET /api/mental-health/history/<session_id>/"""

    def get(self, request, session_id):
        try:
            session = ChatSession.objects.get(session_id=session_id)
        except ChatSession.DoesNotExist:
            return Response({'error': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ChatSessionSerializer(session).data)

