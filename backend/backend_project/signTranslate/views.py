import base64
import numpy as np
import cv2
import mediapipe as mp
from rest_framework.decorators import api_view
from rest_framework.response import Response
import tensorflow as tf

# Load your trained model
model = tf.keras.models.load_model('sign_model.h5')

# ASL Labels A-Z
LABELS = list('ABCDEFGHIJKLMNOPQRSTUVWXYZ')

# MediaPipe setup
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(static_image_mode=True, max_num_hands=1)

@api_view(['POST'])
def predict(request):
    try:
        # Get base64 image from React Native
        img_data = base64.b64decode(request.data['image'])
        np_arr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        # Run MediaPipe hand detection
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(rgb)

        if results.multi_hand_landmarks:
            # Extract 21 landmarks × 3 (x, y, z) = 63 values
            landmarks = []
            for lm in results.multi_hand_landmarks[0].landmark:
                landmarks.extend([lm.x, lm.y, lm.z])

            # Predict
            input_data = np.array([landmarks])
            prediction = model.predict(input_data)
            label = LABELS[np.argmax(prediction)]
            confidence = float(np.max(prediction))

            return Response({
                'prediction': label,
                'confidence': confidence
            })

        # No hand detected
        return Response({'prediction': None, 'confidence': 0})

    except Exception as e:
        return Response({'error': str(e)}, status=400)