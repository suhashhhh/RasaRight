import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import type { DayTotals } from "./api";
import { apiUrl } from "./api";
import { clearStoredUserId, getStoredUserId } from "./session";

const EMPTY_TODAY: DayTotals = {
  date: "",
  calories: 0,
  carbs_g: 0,
  protein_g: 0,
  fats_g: 0,
  sugar_g: 0,
  salt_mg: 0,
  entries: 0,
};

/** Soft caps for bar fill only (actual values show as numbers). */
const GOAL = {
  calories: 2000,
  fats_g: 65,
  sugar_g: 50,
  salt_mg: 2300,
};

function barFraction(value: number, cap: number): number {
  if (value <= 0) return 0;
  return Math.min(1, value / Math.max(cap, 1e-6));
}

export default function DailyDashboard() {
  const router = useRouter();
  const [today, setToday] = useState<DayTotals>(EMPTY_TODAY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoadError(null);
    const userId = await getStoredUserId();
    if (!userId) {
      setToday(EMPTY_TODAY);
      setLoading(false);
      setLoadError("Log in to see your daily totals.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${apiUrl("/logs/summary")}?user_id=${encodeURIComponent(userId)}`,
        { headers: { Accept: "application/json" } }
      );
      const data = await res.json();
      if (!res.ok) {
        setLoadError(
          typeof data?.detail === "string"
            ? data.detail
            : "Could not load summary."
        );
        setToday(EMPTY_TODAY);
        return;
      }
      setToday(data.today ?? EMPTY_TODAY);
    } catch {
      setLoadError("Could not reach server.");
      setToday(EMPTY_TODAY);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSummary();
    }, [loadSummary])
  );

  const progress = {
    calories: barFraction(today.calories, GOAL.calories),
    fats: barFraction(today.fats_g, GOAL.fats_g),
    sugar: barFraction(today.sugar_g, GOAL.sugar_g),
    salts: barFraction(today.salt_mg, GOAL.salt_mg),
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.7}
            onPress={async () => {
              await clearStoredUserId();
              router.replace("/LogIn");
            }}
          >
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>

          <Text style={styles.brand}>RasaRight</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity style={styles.tabActive}>
            <Text style={styles.tabActiveText}>Daily</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabInactive}
            onPress={() => router.replace("/WeeklyDashboard")}
            activeOpacity={0.8}
          >
            <Text style={styles.tabInactiveText}>Weekly</Text>
          </TouchableOpacity>
        </View>

        {!!loadError && !loading && (
          <Text style={styles.hintText}>{loadError}</Text>
        )}

        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Today&apos;s Progress</Text>
          {loading ? (
            <ActivityIndicator color="#ffffff" style={{ marginVertical: 24 }} />
          ) : (
            <>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Calories</Text>
                <View style={styles.metricBarWrapper}>
                  <View style={styles.metricBarTrack}>
                    <View
                      style={[
                        styles.metricBarFill,
                        { flex: progress.calories },
                      ]}
                    />
                    <View
                      style={[
                        styles.metricBarRemaining,
                        { flex: 1 - progress.calories },
                      ]}
                    />
                  </View>
                  <Text style={styles.metricValue}>
                    {Math.round(today.calories)} calories
                  </Text>
                </View>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Fats</Text>
                <View style={styles.metricBarWrapper}>
                  <View style={styles.metricBarTrack}>
                    <View
                      style={[styles.metricBarFill, { flex: progress.fats }]}
                    />
                    <View
                      style={[
                        styles.metricBarRemaining,
                        { flex: 1 - progress.fats },
                      ]}
                    />
                  </View>
                  <Text style={styles.metricValue}>
                    {today.fats_g.toFixed(1)} g
                  </Text>
                </View>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Sugar</Text>
                <View style={styles.metricBarWrapper}>
                  <View style={styles.metricBarTrack}>
                    <View
                      style={[styles.metricBarFill, { flex: progress.sugar }]}
                    />
                    <View
                      style={[
                        styles.metricBarRemaining,
                        { flex: 1 - progress.sugar },
                      ]}
                    />
                  </View>
                  <Text style={styles.metricValue}>
                    {today.sugar_g.toFixed(1)} g
                  </Text>
                </View>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Salt</Text>
                <View style={styles.metricBarWrapper}>
                  <View style={styles.metricBarTrack}>
                    <View
                      style={[styles.metricBarFill, { flex: progress.salts }]}
                    />
                    <View
                      style={[
                        styles.metricBarRemaining,
                        { flex: 1 - progress.salts },
                      ]}
                    />
                  </View>
                  <Text style={styles.metricValue}>
                    {Math.round(today.salt_mg)} mg
                  </Text>
                </View>
              </View>

              {today.entries > 0 && (
                <Text style={styles.entriesHint}>
                  {today.entries} meal{today.entries === 1 ? "" : "s"} logged
                  today
                </Text>
              )}
            </>
          )}
        </View>

        <View style={styles.bottomButtonsRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.9}
            onPress={() => router.push("/UploadParameters")}
          >
            <Text style={styles.secondaryButtonText}>Take/Upload Image</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.9}
            onPress={() => router.push("/Logs")}
          >
            <Text style={styles.secondaryButtonText}>View Logs</Text>
          </TouchableOpacity>
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
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  logoutButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#7AD957",
  },
  logoutText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
  },
  brand: {
    fontSize: 24,
    fontWeight: "700",
    color: "#7AD957",
    textAlign: "center",
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
    gap: 16,
  },
  tabActive: {
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#7AD957",
  },
  tabInactive: {
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#7AD957",
  },
  tabActiveText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 13,
  },
  tabInactiveText: {
    color: "#7AD957",
    fontWeight: "600",
    fontSize: 13,
  },
  hintText: {
    fontSize: 12,
    color: "#888888",
    textAlign: "center",
    marginBottom: 8,
  },
  progressCard: {
    flex: 1,
    backgroundColor: "#7AD957",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 24,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  metricLabel: {
    width: 70,
    fontSize: 14,
    color: "#ffffff",
  },
  metricBarWrapper: {
    flex: 1,
  },
  metricBarTrack: {
    flexDirection: "row",
    height: 16,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    marginBottom: 4,
  },
  metricBarFill: {
    backgroundColor: "#F9B24B",
  },
  metricBarRemaining: {
    backgroundColor: "#ffffff",
  },
  metricValue: {
    fontSize: 12,
    color: "#f7ffe9",
    textAlign: "right",
  },
  entriesHint: {
    marginTop: 8,
    fontSize: 12,
    color: "#f7ffe9",
    textAlign: "center",
  },
  bottomButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#7AD957",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});
