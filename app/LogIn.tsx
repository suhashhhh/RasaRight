import { useEffect, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_BASE_URL, apiUrl } from "../lib/api";
import { setStoredUserId } from "../lib/session";

function extractErrorMessage(data: any): string {
  const detail = data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first === "string") return first;
    if (first && typeof first.msg === "string") return first.msg;
  }
  if (data?.message && typeof data.message === "string") return data.message;
  return "Login failed.";
}

export default function Index() {
  const params = useLocalSearchParams<{
    accountCreated?: string;
    identifier?: string;
  }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const paramIdentifier = Array.isArray(params.identifier)
    ? params.identifier[0]
    : params.identifier;
  const accountCreatedParam = Array.isArray(params.accountCreated)
    ? params.accountCreated[0]
    : params.accountCreated;
  const accountJustCreated =
    accountCreatedParam === "1" || accountCreatedParam === "true";

  useEffect(() => {
    if (paramIdentifier?.trim()) {
      setEmail(paramIdentifier.trim());
    }
  }, [paramIdentifier]);
  const onLogin = async () => {
    setStatusMessage("");
    if (!email.trim() || !password.trim()) {
      setStatusMessage("Please enter email/username and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(apiUrl("/auth/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          identifier: email.trim(),
          password,
        }),
      });

      let data: any;
      try {
        data = await response.json();
      } catch {
        setStatusMessage(
          `Server responded but not as JSON (${response.status}). Check ${API_BASE_URL}.`
        );
        return;
      }

      if (!response.ok) {
        setStatusMessage(extractErrorMessage(data));
        return;
      }

      void rememberMe;
      const uid = data.user?.id;
      if (uid != null) {
        await setStoredUserId(String(uid));
      }
      router.replace("/DailyDashboard");
    } catch (e: any) {
      const msg =
        typeof e?.message === "string" ? e.message : "Network error";
      setStatusMessage(
        `Cannot reach API at ${API_BASE_URL}. Start the backend (start_server.bat) and ensure port 8082 is free. (${msg})`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.brand}>RasaRight</Text>

        <View style={styles.card}>
          {accountJustCreated && (
            <Text style={styles.successBanner}>
              Account created. Please log in.
            </Text>
          )}
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Access your health dashboard</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email / Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Email/Username"
              placeholderTextColor="#b8b8b8"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#b8b8b8"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View style={styles.rememberRow}>
            <Switch
              value={rememberMe}
              onValueChange={setRememberMe}
              thumbColor={rememberMe ? "#ffffff" : "#ffffff"}
              trackColor={{ false: "#e3e3e3", true: "#8aab94" }}
            />
            <Text style={styles.rememberText}>Remember me</Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.9}
            onPress={onLogin}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? "Logging in..." : "Log In"}
            </Text>
          </TouchableOpacity>
          {!!statusMessage && (
            <Text style={styles.statusText}>{statusMessage}</Text>
          )}
          {__DEV__ && (
            <Text style={styles.devApiHint} numberOfLines={2}>
              API: {API_BASE_URL}
            </Text>
          )}

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/SignUp")}
          >
            <Text style={styles.secondaryActionText}>Create account</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>Stay Healthy!</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  brand: {
    textAlign: "center",
    fontSize: 30,
    fontWeight: "700",
    color: "#3A5A40",
    marginBottom: 16,
  },
  card: {
    flexGrow: 1,
    backgroundColor: "#F4E6D2",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    color: "#222222",
  },
  subtitle: {
    fontSize: 16,
    color: "#555555",
    marginBottom: 24,
  },
  successBanner: {
    backgroundColor: "#e8ede9",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    fontSize: 15,
    fontWeight: "600",
    color: "#243328",
    textAlign: "center",
    overflow: "hidden",
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: "#555555",
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  rememberText: {
    marginLeft: 8,
    fontSize: 15,
    color: "#333333",
  },
  button: {
    backgroundColor: "#3A5A40",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  secondaryActionText: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 15,
    color: "#555555",
  },
  statusText: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 14,
    color: "#333333",
  },
  devApiHint: {
    marginTop: 8,
    fontSize: 13,
    color: "#888888",
    textAlign: "center",
  },
  footerText: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#3A5A40",
  },
});
