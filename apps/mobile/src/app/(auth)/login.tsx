import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS, TYPOGRAPHY } from "../../constants/theme";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuthStore } from "../../store/useAuthStore";
import { useHealthStore } from "../../store/useHealthStore";

export default function LoginScreen() {
  const router = useRouter();
  const { authenticate } = useAuthStore();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const handleLogin = async () => {
    setLoading(true);
    try {
      await authenticate(identifier.trim(), password);
      const profile = useAuthStore.getState().profile;
      router.replace(
        profile.onboardingCompleted ? "/(tabs)" : "/(onboarding)/health-data",
      );
    } catch (error) {
      Alert.alert(
        "Unable to sign in",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons
              name="heart-pulse"
              size={28}
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in to access your personalized health companion
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email Address"
            placeholder="you@example.com"
            value={identifier}
            onChangeText={setIdentifier}
            leftIcon={
              <Feather name="phone" size={18} color={COLORS.textSecondary} />
            }
          />

          <Input
            label="Password"
            placeholder="Enter password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            leftIcon={
              <Feather name="lock" size={18} color={COLORS.textSecondary} />
            }
          />

          <Button
            title="Sign In"
            variant="cta"
            onPress={handleLogin}
            disabled={loading}
            style={styles.signInBtn}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
            <Text style={styles.signUpLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryAccent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.primaryDark,
    fontFamily: TYPOGRAPHY.serifHeading,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  form: {
    marginBottom: 24,
  },
  signInBtn: {
    marginTop: 8,
    marginBottom: 12,
  },
  demoBtn: {
    borderColor: COLORS.primaryAccent,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primaryAccent,
  },
});
