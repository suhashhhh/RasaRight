import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  type GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { apiUrl } from "../lib/api";
import { getStoredUserId } from "../lib/session";

type SliderProps = {
  labelLeft: string;
  labelRight: string;
  value: number;
  onValueChange: (v: number) => void;
};

const SLIDER_STEPS = [0, 0.25, 0.5, 0.75, 1];

function snapToSteps(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  let nearest = SLIDER_STEPS[0];
  let minDist = Math.abs(clamped - nearest);
  for (const step of SLIDER_STEPS) {
    const d = Math.abs(clamped - step);
    if (d < minDist) {
      minDist = d;
      nearest = step;
    }
  }
  return nearest;
}

function Slider({ labelLeft, labelRight, value, onValueChange }: SliderProps) {
  const clamped = Math.min(1, Math.max(0, value));
  const trackRef = useRef<View>(null);
  const trackBounds = useRef({ x: 0, width: 1 });

  const updateValueFromScreenX = (screenX: number) => {
    const { x, width } = trackBounds.current;
    if (width <= 0) return;
    const raw = (screenX - x) / width;
    onValueChange(snapToSteps(raw));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        trackRef.current?.measureInWindow((x, _y, width) => {
          trackBounds.current = { x, width };
        });
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        updateValueFromScreenX(evt.nativeEvent.pageX);
      },
      onPanResponderRelease: (evt: GestureResponderEvent) => {
        updateValueFromScreenX(evt.nativeEvent.pageX);
      },
    })
  ).current;

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    trackBounds.current.width = width;
  };

  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderLabelsRow}>
        <Text style={styles.sliderLabelText}>{labelLeft}</Text>
        <Text style={styles.sliderLabelText}>{labelRight}</Text>
      </View>

      <View
        ref={trackRef}
        onLayout={onTrackLayout}
        style={styles.sliderTrack}
        collapsable={false}
        {...panResponder.panHandlers}
      >
        <View style={styles.sliderTicksRow}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <View key={t} style={styles.sliderTick} />
          ))}
        </View>
        <View style={[styles.sliderThumb, { left: `${clamped * 100}%` }]} />
      </View>
    </View>
  );
}

// Set `EXPO_PUBLIC_API_BASE_URL` in `.env` (see `lib/api.ts`).
const CLASSIFY_ENDPOINT = apiUrl("/classify");
const ADJUST_ENDPOINT = apiUrl("/adjust");

type Nutrition = {
  calories: number;
  carbs_g: number;
  protein_g: number;
  fats_g: number;
  sugar_g: number;
  salt_mg: number;
};

async function classifyOnServer(
  uri: string,
  sliders: {
    size: number;
    sweetness: number;
    saltiness: number;
    oiliness: number;
  }
): Promise<{
  label: string;
  confidence: number;
  baseNutrition: Nutrition;
  nutrition: Nutrition;
} | null> {
  try {
    const filename = uri.split("/").pop() ?? "image.jpg";
    const formData = new FormData();

    if (Platform.OS === "web") {
      // On web we must send an actual Blob/File in multipart form data.
      const imgRes = await fetch(uri);
      const blob = await imgRes.blob();
      const file = new File([blob], filename, {
        type: blob.type || "image/jpeg",
      });
      formData.append("file", file);
    } else {
      // React Native expects { uri, name, type } shape for multipart uploads.
      formData.append("file", {
        uri,
        name: filename,
        type: "image/jpeg",
      } as any);
    }
    formData.append("size", String(sliders.size));
    formData.append("sweetness", String(sliders.sweetness));
    formData.append("saltiness", String(sliders.saltiness));
    formData.append("oiliness", String(sliders.oiliness));

    const response = await fetch(CLASSIFY_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (typeof data.label === "string" && data.label.length > 0) {
      const baseNutrition: Nutrition = {
        calories: Number(data.base_nutrition?.calories ?? 0),
        carbs_g: Number(data.base_nutrition?.carbs_g ?? 0),
        protein_g: Number(data.base_nutrition?.protein_g ?? 0),
        fats_g: Number(data.base_nutrition?.fats_g ?? 0),
        sugar_g: Number(data.base_nutrition?.sugar_g ?? 0),
        salt_mg: Number(data.base_nutrition?.salt_mg ?? 0),
      };
      const nutrition: Nutrition = {
        calories: Number(data.nutrition?.calories ?? 0),
        carbs_g: Number(data.nutrition?.carbs_g ?? 0),
        protein_g: Number(data.nutrition?.protein_g ?? 0),
        fats_g: Number(data.nutrition?.fats_g ?? 0),
        sugar_g: Number(data.nutrition?.sugar_g ?? 0),
        salt_mg: Number(data.nutrition?.salt_mg ?? 0),
      };

      return {
        label: data.label,
        confidence: Number(data.confidence ?? 0),
        baseNutrition,
        nutrition,
      };
    }

    return null;
  } catch {
    return null;
  }
}

async function adjustOnServer(
  label: string,
  sliders: {
    size: number;
    sweetness: number;
    saltiness: number;
    oiliness: number;
  }
): Promise<{ nutrition: Nutrition } | null> {
  try {
    const formData = new FormData();
    formData.append("label", label);
    formData.append("size", String(sliders.size));
    formData.append("sweetness", String(sliders.sweetness));
    formData.append("saltiness", String(sliders.saltiness));
    formData.append("oiliness", String(sliders.oiliness));

    const response = await fetch(ADJUST_ENDPOINT, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData,
    });

    if (!response.ok) return null;
    const data = await response.json();

    const nutrition: Nutrition = {
      calories: Number(data.nutrition?.calories ?? 0),
      carbs_g: Number(data.nutrition?.carbs_g ?? 0),
      protein_g: Number(data.nutrition?.protein_g ?? 0),
      fats_g: Number(data.nutrition?.fats_g ?? 0),
      sugar_g: Number(data.nutrition?.sugar_g ?? 0),
      salt_mg: Number(data.nutrition?.salt_mg ?? 0),
    };

    return { nutrition };
  } catch {
    return null;
  }
}

export default function UploadParameters() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [detectedFood, setDetectedFood] = useState<string | null>(null);
  const [detectedConfidence, setDetectedConfidence] = useState<number | null>(
    null
  );
  const [baseNutrition, setBaseNutrition] = useState<Nutrition | null>(null);
  const [detectedNutrition, setDetectedNutrition] = useState<Nutrition | null>(
    null
  );
  const [statusMessage, setStatusMessage] = useState<string>(
    "No image uploaded"
  );
  const [isDetecting, setIsDetecting] = useState(false);
  const [lastSource, setLastSource] = useState<"upload" | "camera" | null>(
    null
  );
  // Slider mid-point values (0.5) reset after detection.
  const [size, setSize] = useState(0.5);
  const [sweetness, setSweetness] = useState(0.5);
  const [saltiness, setSaltiness] = useState(0.5);
  const [oiliness, setOiliness] = useState(0.5);
  const adjustDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const runDetection = async (uri: string) => {
    setIsDetecting(true);
    setDetectedFood(null);
    setDetectedConfidence(null);
    setBaseNutrition(null);
    setDetectedNutrition(null);
    try {
      const result = await classifyOnServer(uri, {
        size,
        sweetness,
        saltiness,
        oiliness,
      });
      if (result) {
        setDetectedFood(result.label);
        setDetectedConfidence(result.confidence);
        setBaseNutrition(result.baseNutrition);
        setDetectedNutrition(result.nutrition);
        setStatusMessage("Image uploaded......100%");
      } else {
        setStatusMessage(
          "Did not detect any food. Please try again with a clear top-view image."
        );
      }
    } catch {
      setStatusMessage(
        "Did not detect any food. Please try again with a clear top-view image."
      );
    } finally {
      setIsDetecting(false);
    }
  };

  useEffect(() => {
    if (!detectedFood) return;
    if (!baseNutrition) return;
    if (isDetecting) return;

    if (adjustDebounceRef.current) {
      clearTimeout(adjustDebounceRef.current);
    }

    adjustDebounceRef.current = setTimeout(async () => {
      const res = await adjustOnServer(detectedFood, {
        size,
        sweetness,
        saltiness,
        oiliness,
      });
      if (res?.nutrition) {
        setDetectedNutrition(res.nutrition);
      }
    }, 250);

    return () => {
      if (adjustDebounceRef.current) {
        clearTimeout(adjustDebounceRef.current);
        adjustDebounceRef.current = null;
      }
    };
  }, [detectedFood, baseNutrition, isDetecting, size, sweetness, saltiness, oiliness]);

  const pickImage = async (source: "upload" | "camera") => {
    setLastSource(source);
    setStatusMessage("Preparing to pick image...");
    setDetectedFood(null);

    try {
      if (source === "upload") {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          setStatusMessage("Permission to access photos is required.");
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 1,
        });
        if (result.canceled || result.assets.length === 0) {
          setStatusMessage("No image selected.");
          return;
        }
        const uri = result.assets[0].uri;
        setImageUri(uri);
        await runDetection(uri);
      } else {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setStatusMessage("Camera permission is required.");
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          quality: 1,
        });
        if (result.canceled || result.assets.length === 0) {
          setStatusMessage("No image captured.");
          return;
        }
        const uri = result.assets[0].uri;
        setImageUri(uri);
        await runDetection(uri);
      }
    } catch {
      setStatusMessage("Something went wrong while picking the image.");
    }
  };

  const saveMealLog = async () => {
    const userId = await getStoredUserId();
    if (!userId) {
      Alert.alert(
        "Sign in required",
        "Log in to save this meal to your log and dashboards."
      );
      return;
    }
    if (!detectedFood || !detectedNutrition || !baseNutrition) {
      Alert.alert(
        "Nothing to save",
        "Take or upload a food photo and wait for detection first."
      );
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(apiUrl("/logs"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          food_label: detectedFood,
          confidence:
            typeof detectedConfidence === "number" ? detectedConfidence : null,
          size,
          sweetness,
          saltiness,
          oiliness,
          base_nutrition: baseNutrition,
          nutrition: detectedNutrition,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert(
          "Could not save",
          typeof data?.detail === "string" ? data.detail : "Try again."
        );
        return;
      }
      router.replace("/DailyDashboard");
    } catch {
      Alert.alert("Could not save", "Check your connection to the server.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.uploadHeaderRow}>
          <View style={styles.uploadHeaderSpacer} />
          <Text style={styles.brand}>RasaRight</Text>
          <View style={styles.uploadHeaderRight}>
            <TouchableOpacity
              style={styles.returnPill}
              activeOpacity={0.85}
              onPress={() => router.back()}
            >
              <Text style={styles.returnPillText}>Return</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.topButtonsRow}>
              <TouchableOpacity
                style={styles.primaryPill}
                activeOpacity={0.9}
                onPress={() => pickImage("upload")}
              >
                <Text style={styles.primaryPillText}>Upload Image</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryPill}
                activeOpacity={0.9}
                onPress={() => pickImage("camera")}
              >
                <Text style={styles.primaryPillText}>Take Image</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statusTextBlock}>
              <Text style={styles.statusLine}>{statusMessage}</Text>
              {detectedFood && (
                <Text style={styles.statusLine}>
                  Image Detected:{" "}
                  <Text style={styles.statusHighlight}>{detectedFood}</Text>
                  {typeof detectedConfidence === "number" && (
                    <Text style={styles.statusLine}>
                      {" "}
                      ({detectedConfidence.toFixed(2)})
                    </Text>
                  )}
                </Text>
              )}
              {lastSource === "camera" && (
                <Text style={styles.helperText}>
                  Take image from the top view only.
                </Text>
              )}
              {lastSource === "upload" && (
                <Text style={styles.helperText}>
                  Upload images taken from the top view only.
                </Text>
              )}
              {isDetecting && (
                <Text style={styles.helperText}>Detecting food...</Text>
              )}
              {imageUri && (
                <View style={styles.previewWrapper}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.previewImage}
                  />
                </View>
              )}
            </View>

            <Slider
              labelLeft="Small"
              labelRight="Big"
              value={size}
              onValueChange={setSize}
            />
            <Slider
              labelLeft="Not Sweet"
              labelRight="Too Sweet"
              value={sweetness}
              onValueChange={setSweetness}
            />
            <Slider
              labelLeft="Not Salty"
              labelRight="Too Salty"
              value={saltiness}
              onValueChange={setSaltiness}
            />
            <Slider
              labelLeft="Not Oily"
              labelRight="Too Oily"
              value={oiliness}
              onValueChange={setOiliness}
            />

            {detectedNutrition && (
              <View style={styles.nutritionBlock}>
                <Text style={styles.nutritionTitle}>Nutrition</Text>
                <Text style={styles.nutritionLine}>
                  Calories: {detectedNutrition.calories.toFixed(0)}
                </Text>
                <Text style={styles.nutritionLine}>
                  Carbs: {detectedNutrition.carbs_g.toFixed(1)} g
                </Text>
                <Text style={styles.nutritionLine}>
                  Protein: {detectedNutrition.protein_g.toFixed(1)} g
                </Text>
                <Text style={styles.nutritionLine}>
                  Fats: {detectedNutrition.fats_g.toFixed(1)} g
                </Text>
                <Text style={styles.nutritionLine}>
                  Sugar: {detectedNutrition.sugar_g.toFixed(1)} g
                </Text>
                <Text style={styles.nutritionLine}>
                  Salt: {detectedNutrition.salt_mg.toFixed(0)} mg
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.saveButton}
              activeOpacity={0.9}
              onPress={() => void saveMealLog()}
              disabled={isSaving}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? "Saving..." : "Save to log"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
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
    backgroundColor: "#F4E6D2",
  },
  uploadHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  uploadHeaderSpacer: {
    flex: 1,
  },
  uploadHeaderRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  returnPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "#F9B24B",
    minWidth: 64,
    alignItems: "center",
  },
  returnPillText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "600",
  },
  brand: {
    flexShrink: 0,
    textAlign: "center",
    fontSize: 30,
    fontWeight: "700",
    color: "#3A5A40",
  },
  card: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: "#F4E6D2",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  topButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  primaryPill: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3A5A40",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
  },
  primaryPillText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  statusTextBlock: {
    marginBottom: 24,
  },
  statusLine: {
    fontSize: 15,
    color: "#333333",
  },
  statusHighlight: {
    fontWeight: "700",
  },
  helperText: {
    marginTop: 4,
    fontSize: 13,
    color: "#666666",
  },
  previewWrapper: {
    marginTop: 12,
    alignItems: "center",
  },
  previewImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
  },
  sliderBlock: {
    marginBottom: 18,
  },
  sliderLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sliderLabelText: {
    fontSize: 14,
    color: "#3A5A40",
  },
  sliderTrack: {
    height: 24,
    justifyContent: "center",
  },
  sliderTicksRow: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e8ede9",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  sliderTick: {
    width: 2,
    height: 12,
    borderRadius: 1,
    backgroundColor: "#3A5A40",
  },
  sliderThumb: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#3A5A40",
    marginLeft: -9,
  },
  saveButton: {
    marginTop: 24,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#3A5A40",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  nutritionBlock: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#ffffff",
  },
  nutritionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    color: "#333333",
  },
  nutritionLine: {
    fontSize: 14,
    color: "#333333",
    marginTop: 2,
  },
});

