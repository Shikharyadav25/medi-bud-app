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

export default function SignupScreen() {
  const router = useRouter();
  const { createAccount } = useAuthStore();
  const { resetForNewUser } = useHealthStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const handleSignup = async () => {
    if (name.trim().length < 2 || !phone.includes("@") || password.length < 8) {
      Alert.alert(
        "Check your details",
        "Enter your name, email address and a password of at least 8 characters.",
      );
      return;
    }
    setLoading(true);
    try {
      const active = await createAccount(name.trim(), phone.trim(), password);
      resetForNewUser();
      if (active) router.replace("/(onboarding)/health-data");
      else {
        Alert.alert(
          "Check your email",
          "Confirm your email address, then sign in.",
        );
        router.replace("/(auth)/login");
      }
    } catch (error) {
      Alert.alert(
        "Could not create account",
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
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            Build a private health profile tailored to your everyday goals
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Full Name"
            placeholder="e.g. Aarav Sharma"
            value={name}
            onChangeText={setName}
            leftIcon={
              <Feather name="user" size={18} color={COLORS.textSecondary} />
            }
          />

          <Input
            label="Email Address"
            placeholder="you@example.com"
            keyboardType="email-address"
            value={phone}
            onChangeText={setPhone}
            leftIcon={
              <Feather name="phone" size={18} color={COLORS.textSecondary} />
            }
          />

          <Input
            label="Create Password"
            placeholder="At least 8 characters"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            leftIcon={
              <Feather name="lock" size={18} color={COLORS.textSecondary} />
            }
          />

          <Button
            title="Create Account"
            variant="cta"
            onPress={handleSignup}
            disabled={loading}
            style={styles.signupBtn}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
            <Text style={styles.loginLink}>Sign In</Text>
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
    paddingTop: 36,
    paddingBottom: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryAccent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
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
    paddingHorizontal: 12,
  },
  form: {
    marginBottom: 24,
  },
  signupBtn: {
    marginTop: 8,
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
  loginLink: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primaryAccent,
  },
});
