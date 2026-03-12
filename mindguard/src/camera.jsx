// App.js

// 🔧 Change this to your Django server IP
// Use your local IP when testing on phone e.g. "http://192.168.1.10:8000"
// Use ngrok URL when testing outside local network
const API_URL = "http://192.168.14.238:8000/api/predict/";

import SignLanguageCamera from './SignLanguageCamera';
export default function App() {
  return <SignLanguageCamera />;
}