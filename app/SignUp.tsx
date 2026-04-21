import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { apiUrl } from "../lib/api";

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

type PickerKey = "age" | "activity" | "weight" | "height";

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
  const [activePicker, setActivePicker] = useState<PickerKey | null>(null);

  const [diabetes, setDiabetes] = useState(false);
  const [obesity, setObesity] = useState(false);
  const [hypertension, setHypertension] = useState(false);
  const ageOptions = useMemo(
    () => Array.from({ length: 120 }, (_, i) => ({ value: i + 1, label: `${i + 1}` })),
    []
  );
  const weightOptions = useMemo(
    () => Array.from({ length: 176 }, (_, i) => ({ value: i + 25, label: `${i + 25} kg` })),
    []
  );
  const heightOptions = useMemo(
    () => Array.from({ length: 121 }, (_, i) => ({ value: i + 100, label: `${i + 100} cm` })),
    []
  );

  const pickerConfig = {
    age: {
      title: "Select age",
      value: ageYears,
      options: ageOptions,
      onChange: setAgeYears,
    },
    activity: {
      title: "Select activity",
      value: activityDaysPerWeek,
      options: ACTIVITY_OPTIONS,
      onChange: setActivityDaysPerWeek,
    },
    weight: {
      title: "Select weight",
      value: weightKg,
      options: weightOptions,
      onChange: setWeightKg,
    },
    height: {
      title: "Select height",
      value: heightCm,
      options: heightOptions,
      onChange: setHeightCm,
    },
  } as const;

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
              <Pressable
                style={styles.selectField}
                onPress={() => setActivePicker("age")}
              >
                <Text style={styles.selectFieldText}>{ageYears}</Text>
              </Pressable>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Physical activity</Text>
              <Pressable
                style={styles.selectField}
                onPress={() => setActivePicker("activity")}
              >
                <Text style={styles.selectFieldText}>
                  {
                    ACTIVITY_OPTIONS.find((o) => o.value === activityDaysPerWeek)?.label ??
                    `${activityDaysPerWeek}`
                  }
                </Text>
              </Pressable>
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
              <Pressable
                style={styles.selectField}
                onPress={() => setActivePicker("weight")}
              >
                <Text style={styles.selectFieldText}>{weightKg} kg</Text>
              </Pressable>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Height (cm)</Text>
              <Pressable
                style={styles.selectField}
                onPress={() => setActivePicker("height")}
              >
                <Text style={styles.selectFieldText}>{heightCm} cm</Text>
              </Pressable>
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

      <Modal
        visible={activePicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActivePicker(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setActivePicker(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>
              {activePicker ? pickerConfig[activePicker].title : ""}
            </Text>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator>
              {activePicker &&
                pickerConfig[activePicker].options.map((o) => {
                  const selected = o.value === pickerConfig[activePicker].value;
                  return (
                    <Pressable
                      key={o.value}
                      style={[styles.modalOption, selected && styles.modalOptionSelected]}
                      onPress={() => {
                        pickerConfig[activePicker].onChange(o.value);
                        setActivePicker(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          selected && styles.modalOptionTextSelected,
                        ]}
                      >
                        {o.label}
                      </Text>
                    </Pressable>
                  );
                })}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setActivePicker(null)}
            >
              <Text style={styles.modalCloseButtonText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
    color: "#222222",
  },
  subtitle: {
    fontSize: 16,
    color: "#555555",
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222222",
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
    fontSize: 16,
    fontWeight: "600",
    color: "#555555",
  },
  genderChipTextActive: {
    color: "#243328",
  },
  selectField: {
    minHeight: 50,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  selectFieldText: {
    fontSize: 16,
    color: "#333333",
  },
  conditionsSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  conditionsTitle: {
    fontSize: 15,
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
    fontSize: 15,
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
    fontSize: 18,
    fontWeight: "600",
  },
  statusText: {
    marginTop: 10,
    fontSize: 14,
    color: "#333333",
    textAlign: "center",
  },
  footerText: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#3A5A40",
    marginTop: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    maxHeight: "70%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222222",
    marginBottom: 10,
    textAlign: "center",
  },
  modalList: {
    maxHeight: 360,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalOptionSelected: {
    backgroundColor: "#e8ede9",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#444444",
    textAlign: "center",
  },
  modalOptionTextSelected: {
    color: "#243328",
    fontWeight: "700",
  },
  modalCloseButton: {
    marginTop: 10,
    alignSelf: "center",
    backgroundColor: "#3A5A40",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 14,
  },
  modalCloseButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});
