from rest_framework import serializers
from .models import ChatSession, ChatMessage, VoiceAnalysis, CopingResource


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'role', 'text', 'stress_score', 'detected_keywords', 'created_at']
        read_only_fields = ['id', 'created_at']


class ChatSessionSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatSession
        fields = ['session_id', 'overall_risk_score', 'created_at', 'messages']
        read_only_fields = ['session_id', 'created_at']


class VoiceAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoiceAnalysis
        fields = ['id', 'stress_level', 'risk_score', 'duration_seconds', 'notes', 'created_at']
        read_only_fields = ['id', 'stress_level', 'risk_score', 'notes', 'created_at']


class CopingResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = CopingResource
        fields = ['id', 'title', 'description', 'category', 'steps', 'duration_minutes']
