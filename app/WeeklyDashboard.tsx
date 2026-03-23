import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";

const DAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Demo values: 7 days per metric (normalized 0–1)
const WEEK_DATA = {
  calories: [0.72, 0.85, 0.58, 0.91, 0.64, 0.78, 0.82],
  fats: [0.35, 0.52, 0.48, 0.61, 0.42, 0.55, 0.38],
  sugar: [0.58, 0.44, 0.67, 0.51, 0.73, 0.59, 0.62],
  salt: [0.41, 0.55, 0.38, 0.62, 0.47, 0.52, 0.45],
};

const CHART_HEIGHT = 72;
const Y_TICKS = 5; // 0, 1/4, 1/2, 3/4, 1 of max

function BarChart({
  title,
  yLabel,
  yMax,
  values,
}: {
  title: string;
  yLabel: string;
  yMax: number;
  values: number[];
}) {
  const yTickValues = Array.from({ length: Y_TICKS }, (_, i) =>
    Math.round((yMax * (Y_TICKS - 1 - i)) / (Y_TICKS - 1))
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
            {values.map((v, i) => {
              const barH = Math.max(4, v * CHART_HEIGHT);
              const actualValue = Math.round(v * yMax);
              return (
                <View key={i} style={styles.barColumn}>
                  <Text style={[styles.barValue, { bottom: barH + 4 }]}>
                    {actualValue}
                  </Text>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barH,
                        backgroundColor:
                          i % 2 === 0 ? "#F9B24B" : "rgba(255,255,255,0.9)",
                      },
                    ]}
                  />
                </View>
              );
            })}
          </View>
          <View style={styles.xAxisRow}>
            {DAY_LABELS.map((d, i) => (
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

export default function WeeklyDashboard() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.7}
            onPress={() => router.replace("/LogIn")}
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
            <TouchableOpacity style={styles.smallPillButton}>
              <Text style={styles.smallPillButtonText}>Download</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.chartsScroll}
            contentContainerStyle={styles.chartsGrid}
            showsVerticalScrollIndicator={false}
          >
            <BarChart
              title="Calories"
              yLabel="Calories"
              yMax={2000}
              values={WEEK_DATA.calories}
            />
            <BarChart
              title="Fats"
              yLabel="Fats (g)"
              yMax={100}
              values={WEEK_DATA.fats}
            />
            <BarChart
              title="Sugar"
              yLabel="Sugar (g)"
              yMax={100}
              values={WEEK_DATA.sugar}
            />
            <BarChart
              title="Salt"
              yLabel="Salt (g)"
              yMax={50}
              values={WEEK_DATA.salt}
            />
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
  progressCard: {
    flex: 1,
    backgroundColor: "#7AD957",
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
    fontSize: 12,
    fontWeight: "700",
    color: "#f7ffe9",
    marginBottom: 6,
    textAlign: "center",
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  yAxisColumn: {
    width: 40,
    marginRight: 8,
  },
  yAxisLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 4,
  },
  yAxisTicks: {
    justifyContent: "space-between",
  },
  yAxisTick: {
    fontSize: 10,
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
    fontSize: 9,
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
  },
  bar: {
    width: 16,
    minHeight: 4,
    borderRadius: 4,
  },
  xAxisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 0,
  },
  dayLabel: {
    fontSize: 8,
    color: "#f7ffe9",
    flex: 1,
    textAlign: "center",
  },
});

