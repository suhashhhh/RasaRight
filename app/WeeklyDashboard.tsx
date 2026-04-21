import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import type { DayTotals, LogsSummaryResponse } from "./api";
import { apiUrl } from "./api";
import { clearStoredUserId, getStoredUserId } from "./session";

const CHART_HEIGHT = 88;
const Y_TICKS = 5;

function weekdayShort(isoDate: string): string {
  const dt = new Date(`${isoDate}T12:00:00Z`);
  return dt.toLocaleDateString(undefined, { weekday: "short" });
}

export default function WeeklyDashboard() {
  const router = useRouter();
  const [week, setWeek] = useState<DayTotals[]>([]);
  const [targets, setTargets] = useState({
    calories: 2000,
    fats_g: 65,
    sugar_g: 50,
    salt_mg: 2300,
  });
  const [dayLabels, setDayLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoadError(null);
    const userId = await getStoredUserId();
    if (!userId) {
      setWeek([]);
      setDayLabels([]);
      setLoading(false);
      setLoadError("Log in to see weekly totals.");
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
        setWeek([]);
        setTargets({
          calories: 2000,
          fats_g: 65,
          sugar_g: 50,
          salt_mg: 2300,
        });
        setDayLabels([]);
        return;
      }
      const summary = data as LogsSummaryResponse;
      const w: DayTotals[] = summary.week ?? [];
      setWeek(w);
      setTargets(
        summary.targets ?? {
          calories: 2000,
          fats_g: 65,
          sugar_g: 50,
          salt_mg: 2300,
        }
      );
      setDayLabels(w.map((d) => weekdayShort(d.date)));
    } catch {
      setLoadError("Could not reach server.");
      setWeek([]);
      setTargets({
        calories: 2000,
        fats_g: 65,
        sugar_g: 50,
        salt_mg: 2300,
      });
      setDayLabels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSummary();
    }, [loadSummary])
  );

  const calories = week.map((d) => d.calories);
  const fats = week.map((d) => d.fats_g);
  const sugar = week.map((d) => d.sugar_g);
  const salt = week.map((d) => d.salt_mg);

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
          <TouchableOpacity
            style={styles.tabInactive}
            activeOpacity={0.8}
            onPress={() => router.replace("/DailyDashboard")}
          >
            <Text style={styles.tabInactiveText}>Daily</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabActive}>
            <Text style={styles.tabActiveText}>Weekly</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeaderRow}>
            <TouchableOpacity
              style={styles.smallPillButton}
              onPress={() => router.push("/Logs")}
            >
              <Text style={styles.smallPillButtonText}>Logs</Text>
            </TouchableOpacity>
            <Text style={styles.progressTitle}>Weekly Progress</Text>
            <View style={styles.smallPillSpacer} />
          </View>

          {loading ? (
            <ActivityIndicator color="#ffffff" style={{ marginVertical: 24 }} />
          ) : loadError || week.length === 0 ? (
            <Text style={styles.chartPlaceholder}>
              {loadError || "No weekly data yet. Log a meal to see charts."}
            </Text>
          ) : (
            <ScrollView
              style={styles.chartsScroll}
              contentContainerStyle={styles.chartsGrid}
              showsVerticalScrollIndicator={false}
            >
              <ChartWithLabels
                title="Calories"
                yLabel="kcal"
                values={calories}
                labels={dayLabels}
                threshold={targets.calories}
              />
              <ChartWithLabels
                title="Fats"
                yLabel="g"
                values={fats}
                labels={dayLabels}
                threshold={targets.fats_g}
              />
              <ChartWithLabels
                title="Sugar"
                yLabel="g"
                values={sugar}
                labels={dayLabels}
                threshold={targets.sugar_g}
              />
              <ChartWithLabels
                title="Salt"
                yLabel="mg"
                values={salt}
                labels={dayLabels}
                threshold={targets.salt_mg}
              />
            </ScrollView>
          )}
        </View>

        <TouchableOpacity
          style={styles.uploadCta}
          activeOpacity={0.9}
          onPress={() => router.push("/UploadParameters")}
        >
          <Text style={styles.uploadCtaText}>Take/Upload Image</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function ChartWithLabels({
  title,
  yLabel,
  values,
  labels,
  threshold,
}: {
  title: string;
  yLabel: string;
  values: number[];
  labels: string[];
  threshold: number;
}) {
  const safeVals =
    values.length > 0 ? values : new Array(7).fill(0);
  const yMax = Math.max(1, ...safeVals);
  const tickTop = Math.ceil(yMax);
  const yTickValues = Array.from({ length: Y_TICKS }, (_, i) =>
    Math.round((tickTop * (Y_TICKS - 1 - i)) / (Y_TICKS - 1))
  );

  return (
    <View style={styles.chartCell}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.chartRow}>
        <View style={styles.yAxisColumn}>
          <Text style={styles.yAxisLabel}>{yLabel}</Text>
          <View style={[styles.yAxisTicks, { height: CHART_HEIGHT }]}>
            {yTickValues.map((tick, i) => (
              <Text key={i} style={styles.yAxisTick}>
                {tick}
              </Text>
            ))}
          </View>
        </View>
        <View style={styles.chartArea}>
          <View style={[styles.barsRow, { height: CHART_HEIGHT }]}>
            {safeVals.map((v, i) => {
              const barH = Math.max(4, (v / yMax) * CHART_HEIGHT);
              const show =
                v >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
              return (
                <View key={i} style={styles.barColumn}>
                  <Text style={[styles.barValue, { bottom: barH + 6 }]}>
                    {show}
                  </Text>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barH,
                        backgroundColor: v > threshold ? "#E74C3C" : i % 2 === 0 ? "#F9B24B" : "rgba(255,255,255,0.9)",
                      },
                    ]}
                  />
                </View>
              );
            })}
          </View>
          <View style={styles.xAxisRow}>
            {(labels.length > 0 ? labels : new Array(7).fill("—")).map((d, i) => (
              <Text key={i} style={styles.dayLabel} numberOfLines={1}>
                {d}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
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
    backgroundColor: "#3A5A40",
  },
  logoutText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
  },
  brand: {
    fontSize: 24,
    fontWeight: "700",
    color: "#3A5A40",
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
    backgroundColor: "#3A5A40",
  },
  tabInactive: {
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#3A5A40",
  },
  tabActiveText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 13,
  },
  tabInactiveText: {
    color: "#3A5A40",
    fontWeight: "600",
    fontSize: 13,
  },
  chartPlaceholder: {
    fontSize: 14,
    color: "#f0f4f1",
    textAlign: "center",
    marginVertical: 24,
    paddingHorizontal: 12,
  },
  progressCard: {
    flex: 1,
    backgroundColor: "#3A5A40",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  progressHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  smallPillButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "#F9B24B",
    minWidth: 64,
    alignItems: "center",
  },
  smallPillSpacer: {
    minWidth: 64,
  },
  smallPillButtonText: {
    fontSize: 12,
    color: "#ffffff",
    fontWeight: "600",
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    flex: 1,
    textAlign: "center",
  },
  chartsScroll: {
    flex: 1,
  },
  chartsGrid: {
    paddingBottom: 16,
  },
  chartCell: {
    width: "100%",
    marginBottom: 22,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f0f4f1",
    marginBottom: 8,
    textAlign: "center",
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  yAxisColumn: {
    width: 52,
    marginRight: 10,
  },
  yAxisLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.95)",
    marginBottom: 6,
  },
  yAxisTicks: {
    justifyContent: "space-between",
  },
  yAxisTick: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
  },
  chartArea: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    position: "relative",
  },
  barValue: {
    position: "absolute",
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
  },
  bar: {
    width: 18,
    minHeight: 4,
    borderRadius: 4,
  },
  xAxisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 0,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f0f4f1",
    flex: 1,
    textAlign: "center",
  },
  uploadCta: {
    marginTop: 14,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#3A5A40",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadCtaText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});
