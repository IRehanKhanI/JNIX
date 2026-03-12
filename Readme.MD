# MindGuard: AI for Accessibility, Healthcare & Well-Being

MindGuard is a comprehensive health companion platform designed to support mental well-being, provide early detection for physical conditions, and monitor users for accidental falls. The project consists of a Django backend, a React Native mobile application, and an ESP32 hardware script.

## Theme & Aesthetic
The app is styled using a modern "Glassmorphism" design system, utilizing **Ruby Red (`#9e0031`)** and **Midnight Violet (`#140f2d`)**.

## Features & ML Models Used

1. **Mental Health Chatbot**
   - **Model:** Google Gemini 2.0 Flash (`gemini-2.0-flash`) via `google-genai` pip package.
   - **Function:** Analyzes user chat inputs to determine stress levels and dynamically streams conversational coping mechanisms.

2. **Image-Based Early Condition Detection**
   - **Model:** MobileNetV2 (Pre-trained Keras Model).
   - **Function:** Evaluates user-uploaded photos to predict skin states. The backend processes the image using MobileNetV2 feature extraction to determine matching physical traits (e.g. comparing to known skin issue datasets heuristically).

3. **Elderly Fall Detection & Emergency Contacts**
   - **Hardware Model:** ESP32 Microcontroller with MPU6050 Accelerometer.
   - **Authentication:** Django User Models & Token Authentication
   - **Function:** When the ESP32 registers an acceleration spike > 25m/s², it fires an HTTP POST to the Django backend. Django logs the fall under the user's authenticated `UserProfile` so the patient's records are updated instantly.

## Getting Started

### 1. Django Backend Setup
Navigate into the backend project folder and set up your python environment:
```bash
cd backend/backend_project
pip install -r requirements.txt
```

You must create a `.env` file in `backend/backend_project/` with these variables:
```env
GEMINI_API=your_google_ai_studio_api_key_here
```

Start the server (bind to `0.0.0.0` so your phone can reach it over WiFi):
```bash
python manage.py runserver 0.0.0.0:8000
```

### 2. React Native (Expo) Setup
Navigate to the mobile app logic:
```bash
cd mindguard
npm install
npx expo start
```
*Note: Make sure your `api.js` points to your computer's local Wi-Fi IP address (e.g., `10.55.184.66`) instead of `localhost` so the Expo Go app can connect.*

### 3. ESP32 Hardware
Open `ESP32_Fall_Detector.ino` in your Arduino IDE. 
- Change `YOUR_WIFI_SSID` and `YOUR_WIFI_PASSWORD` to your local network.
- Change `serverUrl` to point to your PC's Wi-Fi IP address: e.g. `http://10.55.184.66:8000/api/fall-detect/incidents/`.
- Upload the script to the ESP32 board.

### 2. React Native (Expo) Setup
Navigate to the mobile app logic:
```bash
cd mindguard
npm install
npx expo start
```
*Note: Make sure your `api.js` points to your computer's local Wi-Fi IP address (e.g., `10.55.184.66`) instead of `localhost` so the Expo Go app can connect.*

### 3. ESP32 Hardware
Open `ESP32_Fall_Detector.ino` in your Arduino IDE. 
- Change `YOUR_WIFI_SSID` and `YOUR_WIFI_PASSWORD` to your local network.
- Change `serverUrl` to point to your PC's Wi-Fi IP address: e.g. `http://10.55.184.66:8000/api/fall-detect/incidents/`.
- Upload the script to the ESP32 board. 
