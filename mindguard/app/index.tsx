import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      router.replace("/identity-select");
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>MindGuard</Text>
      <Text style={styles.tagline}>Access AI for Health & Well Being</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e0f7fa",
  },
  logo: { fontSize: 32, fontWeight: "bold" },
  tagline: { fontSize: 16, fontStyle: "italic" },
});
