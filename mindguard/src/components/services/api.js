import Constants from "expo-constants";

const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const configBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl?.trim();
const BASE_URL = (envBaseUrl || configBaseUrl || "").replace(/\/+$/, "");

const buildUrl = (path) => {
  if (!BASE_URL) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL for backend requests");
  }

  return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

const postJson = async (path, payload) => {
  try {
    const response = await fetch(buildUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return await response.json();
  } catch (error) {
    return { error: error.message || "Network request failed" };
  }
};

export const isBackendConfigured = () => Boolean(BASE_URL);

export const sendChatbotMessage = async (message) => {
  return postJson("/chat", { text: message });
};

export const uploadHealthImage = async (imageUri) => {
  try {
    const formData = new FormData();
    formData.append("photo", {
      uri: imageUri,
      name: "photo.jpg",
      type: "image/jpeg",
    });

    const response = await fetch(buildUrl("/analyze-image"), {
      method: "POST",
      body: formData,
    });
    return await response.json();
  } catch (error) {
    return { error: error.message || "Upload failed" };
  }
};

export const logFallEvent = async (payload) => {
  return postJson("/fall-detect/incidents/", payload);
};

export const logActivitySnapshot = async (payload) => {
  return postJson("/fall-detect/activity/", payload);
};

// ─── Mental Health ────────────────────────────────────────────────────────────

export const sendMentalHealthChat = async (message, sessionId = null) => {
  return postJson("/mental-health/chat/", { message, session_id: sessionId });
};

export const analyzeVoice = async (sessionId, audioUri) => {
  try {
    const formData = new FormData();
    formData.append("audio", {
      uri: audioUri,
      name: "voice.m4a",
      type: "audio/m4a",
    });
    if (sessionId) {
      formData.append("session_id", sessionId);
    }
    const response = await fetch(buildUrl("/mental-health/voice/"), {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data" },
      body: formData,
    });
    return await response.json();
  } catch (error) {
    return { error: error.message || "Voice upload failed" };
  }
};

export const getCopingResources = async (category = null) => {
  try {
    const query = category ? `?category=${encodeURIComponent(category)}` : "";
    const response = await fetch(buildUrl(`/mental-health/resources/${query}`));
    return await response.json();
  } catch (error) {
    return [];
  }
};

export const getChatHistory = async (sessionId) => {
  try {
    const response = await fetch(buildUrl(`/mental-health/history/${sessionId}/`));
    return await response.json();
  } catch (error) {
    return { error: error.message || "Failed to load history" };
  }
};
