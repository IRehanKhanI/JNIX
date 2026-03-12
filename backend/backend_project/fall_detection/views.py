from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import ActivitySnapshot, FallEvent
from django.conf import settings

@api_view(['GET', 'POST'])
@permission_classes([AllowAny]) # Allow any for GET, we'll manually check auth for POST to avoid breaking old apps instantly
def log_fall_event(request):
	if request.method == 'GET':
		events = FallEvent.objects.order_by('-created_at')[:10]
		data = [
			{
				'id': e.id,
				'activity': e.activity,
				'auto_alert_triggered': e.auto_alert_triggered,
				'confidence': e.confidence,
				'contact_number': e.contact_number,
				'mode': e.mode,
				'notes': e.notes,
				'severity': e.severity,
				'source': e.source,
				'timestamp': e.created_at,
			} for e in events
		]
		return Response(data, status=status.HTTP_200_OK)

	payload = request.data or {}
	
	# Extract contact number from authenticated user's profile if available
	contact_num = payload.get('contact_number', '')
	if request.user and request.user.is_authenticated:
	    try:
	        contact_num = request.user.profile.emergency_sms or contact_num
	    except Exception:
	        pass
	
	incident = FallEvent.objects.create(
		activity=payload.get('activity', ''),
		auto_alert_triggered=payload.get('auto_alert_triggered', False),
		confidence=payload.get('confidence', 0),
		contact_number=contact_num,
		mode=payload.get('mode', 'live'),
		notes=payload.get('notes', ''),
		sensor_payload=payload.get('sensor_payload', {}),
		severity=payload.get('severity', 'Unknown'),
		source=payload.get('source', '')
	)
	
	return Response({'status': 'success', 'incident_id': incident.id}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def log_activity_snapshot(request):
	payload = request.data or {}
	snapshot = ActivitySnapshot.objects.create(
		activity=payload.get('activity', 'Resting'),
		confidence=payload.get('confidence', 0) or 0,
		mode=payload.get('mode', 'simulated'),
		sensor_payload=payload.get('sensor_payload', {}),
		source=payload.get('source', 'mobile'),
	)

	return Response(
		{
			'id': snapshot.id,
			'message': 'Activity snapshot logged successfully.',
			'timestamp': snapshot.created_at,
		},
		status=status.HTTP_201_CREATED,
	)
