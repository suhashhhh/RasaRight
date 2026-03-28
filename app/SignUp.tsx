import { useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";

function extractErrorMessage(data: any): string {
  const detail = data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first === "string") return first;
    if (first && typeof first.msg === "string") return first.msg;
  }
  if (data?.message && typeof data.message === "string") return data.message;
  return "Failed to create account.";
}

export default function SignUp() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [diabetes, setDiabetes] = useState(false);
  const [obesity, setObesity] = useState(false);
  const [hypertension, setHypertension] = useState(false);

  const toggle = (setter: (v: boolean) => void, current: boolean) =>
    setter(!current);

  const API_BASE_URL =
    process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || "http://192.168.1.8:8082";

  const onCreateAccount = async () => {
    setStatusMessage("");

    if (!email.trim() || !username.trim() || !password.trim()) {
      setStatusMessage("Email, username, and password are required.");
      return;
    }

    const conditions: string[] = [];
    if (diabetes) conditions.push("diabetes");
    if (obesity) conditions.push("obesity_overweight");
    if (hypertension) conditions.push("hypertension");

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL.replace(/\/+$/, "")}/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            username: username.trim(),
            full_name: fullName.trim() || null,
            gender: gender.trim() || null,
            password,
            weight_kg: weight.trim() ? Number(weight) : null,
            height_cm: height.trim() ? Number(height) : null,
            health_conditions: conditions,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        setStatusMessage(extractErrorMessage(data));
        return;
      }

      router.replace({
        pathname: "/LogIn",
        params: {
          accountCreated: "1",
          identifier: email.trim(),
        },
      });
    } catch {
      setStatusMessage("Could not connect to server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.brand}>RasaRight</Text>

        <View style={styles.card}>
          <Text style={styles.title}>Join Us!</Text>
          <Text style={styles.subtitle}>
            Start your healthy eating journey here
          </Text>

          <View style={styles.fieldGroup}>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#b8b8b8"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <View style={styles.fieldGroup}>
            <TextInput
              style={styles.input}
              placeholder="Gender (e.g., male/female)"
              placeholderTextColor="#b8b8b8"
              value={gender}
              onChangeText={setGender}
            />
          </View>

          <View style={styles.fieldGroup}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#b8b8b8"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.fieldGroup}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#b8b8b8"
              value={username}
              onChangeText={setUsername}
            />
          </View>

          <View style={styles.fieldGroup}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#b8b8b8"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View style={styles.fieldGroup}>
            <TextInput
              style={styles.input}
              placeholder="Weight (kg)"
              placeholderTextColor="#b8b8b8"
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
            />
          </View>

          <View style={styles.fieldGroup}>
            <TextInput
              style={styles.input}
              placeholder="Height (cm)"
              placeholderTextColor="#b8b8b8"
              keyboardType="numeric"
              value={height}
              onChangeText={setHeight}
            />
          </View>

          <View style={styles.conditionsSection}>
            <Text style={styles.conditionsTitle}>Any Health Conditions?</Text>

            <View style={styles.conditionsRow}>
              <Pressable
                style={styles.conditionItem}
                onPress={() => toggle(setDiabetes, diabetes)}
              >
                <View
                  style={[
                    styles.radioOuter,
                    diabetes && styles.radioOuterActive,
                  ]}
                >
                  {diabetes && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.conditionLabel}>Diabetes</Text>
              </Pressable>

              <Pressable
                style={styles.conditionItem}
                onPress={() => toggle(setObesity, obesity)}
              >
                <View
                  style={[
                    styles.radioOuter,
                    obesity && styles.radioOuterActive,
                  ]}
                >
                  {obesity && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.conditionLabel}>Obesity/Overweight</Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.conditionItem, { marginTop: 8 }]}
              onPress={() => toggle(setHypertension, hypertension)}
            >
              <View
                style={[
                  styles.radioOuter,
                  hypertension && styles.radioOuterActive,
                ]}
              >
                {hypertension && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.conditionLabel}>Hypertension</Text>
            </Pressable>
          </View>

          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.9}
            onPress={onCreateAccount}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? "Creating..." : "Create Account"}
            </Text>
          </TouchableOpacity>
          {!!statusMessage && (
            <Text style={styles.statusText}>{statusMessage}</Text>
          )}
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
    fontSize: 28,
    fontWeight: "700",
    color: "#7AD957",
    marginBottom: 16,
  },
  card: {
    flexGrow: 1,
    backgroundColor: "#F4E6D2",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 24,
    justifyContent: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 4,
    color: "#222222",
  },
  subtitle: {
    fontSize: 14,
    color: "#555555",
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  input: {
    height: 44,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  conditionsSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  conditionsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#222222",
    marginBottom: 8,
  },
  conditionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  conditionItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
    backgroundColor: "#ffffff",
  },
  radioOuterActive: {
    borderColor: "#7AD957",
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#7AD957",
  },
  conditionLabel: {
    fontSize: 13,
    color: "#333333",
  },
  button: {
    backgroundColor: "#7AD957",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  statusText: {
    marginTop: 10,
    fontSize: 12,
    color: "#333333",
    textAlign: "center",
  },
  footerText: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#7AD957",
  },
});
