import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../context/AuthContext";
import { Colors, Spacing } from "../constants/theme";
import type { SignUpScreenProps } from "../navigation/types";

export default function SignUpScreen({ navigation }: SignUpScreenProps) {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!displayName.trim() || !email.trim() || !password) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const { error, needsConfirmation } = await signUp(
      email,
      password,
      displayName,
    );
    setLoading(false);

    if (error) {
      Alert.alert("Sign up failed", error);
      return;
    }

    if (needsConfirmation) {
      // Email confirmation is enabled in Supabase Dashboard.
      Alert.alert(
        "Check your email",
        "We sent you a confirmation link. Verify your email then sign in.",
        [{ text: "OK", onPress: () => navigation.navigate("SignIn") }],
      );
    }
    // If needsConfirmation is false, a session was created immediately and
    // RootNavigator will automatically switch to the App stack.
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Branding ── */}
        <Text style={styles.logo}>micro-learn</Text>
        <Text style={styles.tagline}>Create your free account</Text>

        {/* ── Form ── */}
        <TextInput
          style={styles.input}
          placeholder="Display name"
          placeholderTextColor={Colors.textSecondary}
          autoCapitalize="words"
          autoComplete="name"
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min. 6 characters)"
          placeholderTextColor={Colors.textSecondary}
          secureTextEntry
          autoComplete="new-password"
          value={password}
          onChangeText={setPassword}
        />

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        {/* ── Navigate to Sign In ── */}
        <TouchableOpacity onPress={() => navigation.navigate("SignIn")}>
          <Text style={styles.switchText}>
            Already have an account?{" "}
            <Text style={styles.switchLink}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  logo: {
    color: Colors.primary,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },
  tagline: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: Spacing.xl,
  },
  input: {
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: Spacing.md,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  switchText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  switchLink: {
    color: Colors.primary,
    fontWeight: "600",
  },
});
