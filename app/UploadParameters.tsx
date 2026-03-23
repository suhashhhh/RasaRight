import { useRef, useState } from "react";
import {
  type GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

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

// Backend endpoint for classification.
// Set this in `.env` as `EXPO_PUBLIC_API_BASE_URL=http://<YOUR_IP>:8082`
// (Expo only exposes env vars prefixed with `EXPO_PUBLIC_` to the app).
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || "http://192.168.1.8:8082";
const CLASSIFY_ENDPOINT = `${API_BASE_URL.replace(/\/+$/, "")}/classify`;

type Nutrition = {
  calories: number;
  carbs_g: number;
  protein_g: number;
  fats_g: number;
  sugar_g: number;
  salt_mg: number;
};

async function classifyOnServer(
  uri: string
): Promise<{ label: string; confidence: number; nutrition: Nutrition } | null> {
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
        nutrition,
      };
    }

    return null;
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

  const runDetection = async (uri: string) => {
    setIsDetecting(true);
    setDetectedFood(null);
    setDetectedConfidence(null);
    setDetectedNutrition(null);
    // Reset sliders to the middle as soon as we start detection.
    setSize(0.5);
    setSweetness(0.5);
    setSaltiness(0.5);
    setOiliness(0.5);
    try {
      const result = await classifyOnServer(uri);
      if (result) {
        setDetectedFood(result.label);
        setDetectedConfidence(result.confidence);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.brand}>RasaRight</Text>

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
              onPress={() => router.replace("/DailyDashboard")}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
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
  brand: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "700",
    color: "#7AD957",
    marginBottom: 16,
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
    backgroundColor: "#7AD957",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
  },
  primaryPillText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  statusTextBlock: {
    marginBottom: 24,
  },
  statusLine: {
    fontSize: 13,
    color: "#333333",
  },
  statusHighlight: {
    fontWeight: "700",
  },
  helperText: {
    marginTop: 4,
    fontSize: 11,
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
    fontSize: 12,
    color: "#7AD957",
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
    backgroundColor: "#e5f7dd",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  sliderTick: {
    width: 2,
    height: 12,
    borderRadius: 1,
    backgroundColor: "#7AD957",
  },
  sliderThumb: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#7AD957",
    marginLeft: -9,
  },
  saveButton: {
    marginTop: 24,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#7AD957",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  nutritionBlock: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#ffffff",
  },
  nutritionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
    color: "#333333",
  },
  nutritionLine: {
    fontSize: 12,
    color: "#333333",
    marginTop: 2,
  },
});

