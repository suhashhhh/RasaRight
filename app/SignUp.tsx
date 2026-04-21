import { useState } from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { apiUrl } from "./api";

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

const ACTIVITY_OPTIONS: { label: string; value: number }[] = [
  { label: "Once a week", value: 1 },
  { label: "Twice a week", value: 2 },
  { label: "Three times a week", value: 3 },
  { label: "Four times a week", value: 4 },
  { label: "Five times a week", value: 5 },
  { label: "Six times a week", value: 6 },
  { label: "Seven times a week", value: 7 },
];

const AGE_RANGE = Array.from({ length: 120 }, (_, i) => i + 1);
const WEIGHT_RANGE = Array.from({ length: 176 }, (_, i) => i + 25);
const HEIGHT_RANGE = Array.from({ length: 121 }, (_, i) => i + 100);

export default function SignUp() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [ageYears, setAgeYears] = useState(18);
  const [activityDaysPerWeek, setActivityDaysPerWeek] = useState(1);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [weightKg, setWeightKg] = useState(70);
  const [heightCm, setHeightCm] = useState(170);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [diabetes, setDiabetes] = useState(false);
  const [obesity, setObesity] = useState(false);
  const [hypertension, setHypertension] = useState(false);

  const toggle = (setter: (v: boolean) => void, current: boolean) =>
    setter(!current);

  const onCreateAccount = async () => {
    setStatusMessage("");

    if (!email.trim() || !username.trim() || !password.trim()) {
      setStatusMessage("Email, username, and password are required.");
      return;
    }
    if (gender !== "male" && gender !== "female") {
      setStatusMessage("Please select Male or Female.");
      return;
    }

    const conditions: string[] = [];
    if (diabetes) conditions.push("diabetes");
    if (obesity) conditions.push("obesity_overweight");
    if (hypertension) conditions.push("hypertension");

    setIsSubmitting(true);
    try {
      const response = await fetch(apiUrl("/auth/signup"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          username: username.trim(),
          full_name: fullName.trim() || null,
          gender,
          age_years: ageYears,
          activity_days_per_week: activityDaysPerWeek,
          password,
          weight_kg: weightKg,
          height_cm: heightCm,
          health_conditions: conditions,
        }),
      });

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

          <ScrollView
            style={styles.formScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
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
              <Text style={styles.fieldLabel}>Gender</Text>
              <View style={styles.genderRow}>
                <Pressable
                  style={[
                    styles.genderChip,
                    gender === "male" && styles.genderChipActive,
                  ]}
                  onPress={() => setGender("male")}
                >
                  <Text
                    style={[
                      styles.genderChipText,
                      gender === "male" && styles.genderChipTextActive,
                    ]}
                  >
                    Male
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.genderChip,
                    gender === "female" && styles.genderChipActive,
                  ]}
                  onPress={() => setGender("female")}
                >
                  <Text
                    style={[
                      styles.genderChipText,
                      gender === "female" && styles.genderChipTextActive,
                    ]}
                  >
                    Female
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Age (years)</Text>
              <View style={styles.pickerShell}>
                <Picker
                  selectedValue={ageYears}
                  onValueChange={(v) => setAgeYears(Number(v))}
                  style={[
                    styles.picker,
                    Platform.OS === "ios" && styles.pickerIos,
                  ]}
                  itemStyle={styles.pickerItemIos}
                >
                  {AGE_RANGE.map((a) => (
                    <Picker.Item key={a} label={`${a}`} value={a} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Physical activity</Text>
              <View style={styles.pickerShell}>
                <Picker
                  selectedValue={activityDaysPerWeek}
                  onValueChange={(v) => setActivityDaysPerWeek(Number(v))}
                  style={[
                    styles.picker,
                    Platform.OS === "ios" && styles.pickerIosTall,
                  ]}
                  itemStyle={styles.pickerItemIosSmall}
                >
                  {ACTIVITY_OPTIONS.map((o) => (
                    <Picker.Item
                      key={o.value}
                      label={o.label}
                      value={o.value}
                    />
                  ))}
                </Picker>
              </View>
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
              <Text style={styles.fieldLabel}>Weight (kg)</Text>
              <View style={styles.pickerShell}>
                <Picker
                  selectedValue={weightKg}
                  onValueChange={(v) => setWeightKg(Number(v))}
                  style={[
                    styles.picker,
                    Platform.OS === "ios" && styles.pickerIos,
                  ]}
                  itemStyle={styles.pickerItemIos}
                >
                  {WEIGHT_RANGE.map((w) => (
                    <Picker.Item key={w} label={`${w} kg`} value={w} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Height (cm)</Text>
              <View style={styles.pickerShell}>
                <Picker
                  selectedValue={heightCm}
                  onValueChange={(v) => setHeightCm(Number(v))}
                  style={[
                    styles.picker,
                    Platform.OS === "ios" && styles.pickerIos,
                  ]}
                  itemStyle={styles.pickerItemIos}
                >
                  {HEIGHT_RANGE.map((h) => (
                    <Picker.Item key={h} label={`${h} cm`} value={h} />
                  ))}
                </Picker>
              </View>
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
          </ScrollView>

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
    color: "#3A5A40",
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: "#F4E6D2",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  formScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
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
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#222222",
    marginBottom: 6,
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
  genderRow: {
    flexDirection: "row",
    gap: 10,
  },
  genderChip: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
  genderChipActive: {
    borderColor: "#3A5A40",
    backgroundColor: "#e8ede9",
  },
  genderChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555555",
  },
  genderChipTextActive: {
    color: "#243328",
  },
  pickerShell: {
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    overflow: "hidden",
  },
  picker: {
    width: "100%",
  },
  pickerIos: {
    height: 140,
  },
  pickerIosTall: {
    height: 180,
  },
  pickerItemIos: {
    fontSize: 18,
    height: 36,
  },
  pickerItemIosSmall: {
    fontSize: 15,
    height: 34,
  },
  conditionsSection: {
    marginTop: 8,
    marginBottom: 12,
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
    borderColor: "#3A5A40",
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#3A5A40",
  },
  conditionLabel: {
    fontSize: 13,
    color: "#333333",
  },
  button: {
    backgroundColor: "#3A5A40",
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
    color: "#3A5A40",
    marginTop: 12,
  },
});
