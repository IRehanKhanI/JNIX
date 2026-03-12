from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from .models import UserProfile

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    data = request.data
    try:
        if User.objects.filter(username=data.get('email')).exists():
            return Response({'error': 'Email already registered.'}, status=status.HTTP_400_BAD_REQUEST)
            
        user = User.objects.create_user(
            username=data.get('email'),
            email=data.get('email'),
            password=data.get('password'),
            first_name=data.get('name', '')
        )
        
        # Profile is auto-created by signals, just update it
        profile = user.profile
        profile.emergency_sms = data.get('emergency_sms', '')
        profile.emergency_whatsapp = data.get('emergency_whatsapp', '')
        profile.save()
        
        token, _ = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user_id': user.id,
            'name': user.first_name,
            'email': user.email
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    data = request.data
    user = authenticate(username=data.get('email'), password=data.get('password'))
    
    if user:
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.id,
            'name': user.first_name,
            'email': user.email
        })
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    user = request.user
    profile = user.profile
    
    if request.method == 'GET':
        return Response({
            'name': user.first_name,
            'email': user.email,
            'emergency_sms': profile.emergency_sms,
            'emergency_whatsapp': profile.emergency_whatsapp
        })
        
    elif request.method == 'PUT':
        data = request.data
        if 'name' in data:
            user.first_name = data['name']
            user.save()
        if 'emergency_sms' in data:
            profile.emergency_sms = data['emergency_sms']
        if 'emergency_whatsapp' in data:
            profile.emergency_whatsapp = data['emergency_whatsapp']
        profile.save()
        
        return Response({'message': 'Profile updated successfully'})
