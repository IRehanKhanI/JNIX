import { Stack } from "expo-router";
import { registerBackgroundFallDetection } from "../src/components/services/backgroundTasks";

// Initialize global offline background task monitoring
registerBackgroundFallDetection();

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="alerts" />
      <Stack.Screen name="accessibility" />
      <Stack.Screen name="mental-health" />
      <Stack.Screen name="HealthDetectionScreen" />
      <Stack.Screen name="FallDetectionScreen" />
      <Stack.Screen name="HealthReportScreen" />
    </Stack>
  );
}
