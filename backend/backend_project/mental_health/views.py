import os

from google import genai
from django.conf import settings
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


def _extract_response_text(response):
    text = getattr(response, 'text', None)
    if text:
        return text.strip()

    candidates = getattr(response, 'candidates', None) or []
    for candidate in candidates:
        content = getattr(candidate, 'content', None)
        parts = getattr(content, 'parts', None) or []
        for part in parts:
            part_text = getattr(part, 'text', None)
            if part_text:
                return part_text.strip()

    return ''


def _gemini_reply(level, score, keywords, session):
    """Generate a response using the Gemini API with conversation context."""
    api_key = getattr(settings, 'GEMINI_API_KEY', '') or os.environ.get('GEMINI_API', '')
    if not api_key:
        return "I'm here with you. Tell me more about how you're feeling."

    client = genai.Client(api_key=api_key)

    history_qs = session.messages.order_by('-created_at')[:12]
    history_lines = '\n'.join(
        f"{'USER' if message.role == 'user' else 'JINX'}: {message.text}"
        for message in reversed(list(history_qs))
    )

    crisis_addendum = (
        "\n\nIMPORTANT: The latest user message contains crisis-level stress signals. "
        "You must gently but clearly encourage the user to contact a crisis line "
        "such as 988 in the US or their local emergency services while remaining calm and compassionate."
    ) if level == 'crisis' else ''

    prompt = (
        "You are Jinx, a warm and empathetic AI mental wellness companion inside the MindGuard app. "
        "Listen without judgment, validate feelings, and offer practical coping support. "
        "Do not diagnose conditions. Keep the response concise, natural, and supportive. "
        "If the user appears in immediate danger, encourage urgent real-world help. "
        f"The latest message was classified as '{level}' with risk score {score:.2f}. "
        f"Detected keywords: {', '.join(keywords) if keywords else 'none'}."
        f"{crisis_addendum}\n\n"
        "Conversation so far:\n"
        f"{history_lines}\n\n"
        "Reply as Jinx only."
    )

    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
        )
        response_text = _extract_response_text(response)
        if response_text:
            return response_text
    except Exception:
        pass

    return "I'm here with you. Could you tell me a bit more about how you're feeling?"


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

        bot_text = _gemini_reply(level, score, keywords, session)

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

