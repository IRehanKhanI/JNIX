from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import ActivitySnapshot, FallEvent


@api_view(['POST'])
def log_fall_event(request):
	payload = request.data or {}
	incident = FallEvent.objects.create(
		activity=payload.get('activity', ''),
		auto_alert_triggered=payload.get('auto_alert_triggered', False),
		confidence=payload.get('confidence', 0) or 0,
		contact_number=payload.get('contact_number', ''),
		mode=payload.get('mode', 'simulated'),
		notes=payload.get('notes', ''),
		sensor_payload=payload.get('sensor_payload', {}),
		severity=payload.get('severity', 'Normal'),
		source=payload.get('source', 'mobile'),
	)

	return Response(
		{
			'id': incident.id,
			'message': 'Fall incident logged successfully.',
			'timestamp': incident.created_at,
		},
		status=status.HTTP_201_CREATED,
	)


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
