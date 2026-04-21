import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import type { FoodLogListItem } from "./api";
import { apiUrl } from "./api";
import { getStoredUserId } from "./session";

function formatLocalDateTime(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "—", time: "—" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "—" };
  return {
    date: d.toLocaleDateString(),
    time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

function LogRow({
  item,
  onDelete,
}: {
  item: FoodLogListItem;
  onDelete: (id: string) => void;
}) {
  const { date, time } = formatLocalDateTime(item.logged_at);
  return (
    <View style={styles.logRow}>
      <View style={styles.logDetails}>
        <Text style={styles.logLine}>{item.food_label}</Text>
        <Text style={styles.logLineMuted}>
          {date} · {time}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        activeOpacity={0.8}
        onPress={() => onDelete(item.id)}
      >
        <Text style={styles.deleteBtnText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function Logs() {
  const router = useRouter();
  const [logs, setLogs] = useState<FoodLogListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setBanner(null);
    const userId = await getStoredUserId();
    if (!userId) {
      setLogs([]);
      setLoading(false);
      setBanner("Log in to see your meal logs.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${apiUrl("/logs")}?user_id=${encodeURIComponent(userId)}`,
        { headers: { Accept: "application/json" } }
      );
      const data = await res.json();
      if (!res.ok) {
        setLogs([]);
        setBanner(
          typeof data?.detail === "string" ? data.detail : "Could not load logs."
        );
        return;
      }
      setLogs(Array.isArray(data.logs) ? data.logs : []);
    } catch {
      setLogs([]);
      setBanner("Could not reach server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadLogs();
    }, [loadLogs])
  );

  const confirmDelete = (id: string) => {
    Alert.alert(
      "Delete this log?",
      "This removes the entry from your history and dashboards.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void deleteLog(id),
        },
      ]
    );
  };

  const deleteLog = async (id: string) => {
    const userId = await getStoredUserId();
    if (!userId) return;
    try {
      const res = await fetch(
        `${apiUrl(`/logs/${encodeURIComponent(id)}`)}?user_id=${encodeURIComponent(userId)}`,
        { method: "DELETE", headers: { Accept: "application/json" } }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert(
          "Could not delete",
          typeof data?.detail === "string" ? data.detail : "Try again."
        );
        return;
      }
      setLogs((prev) => prev.filter((x) => x.id !== id));
    } catch {
      Alert.alert("Could not delete", "Check your connection.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.brand}>RasaRight</Text>

        <View style={styles.logsPillWrap}>
          <Text style={styles.logsPillText}>Logs</Text>
        </View>

        {!!banner && (
          <Text style={styles.bannerText}>{banner}</Text>
        )}

        {loading ? (
          <ActivityIndicator color="#3A5A40" style={{ marginVertical: 24 }} />
        ) : (
          <FlatList
            data={logs}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              !banner ? (
                <Text style={styles.emptyText}>
                  No meals logged yet. Upload a meal from the dashboard.
                </Text>
              ) : null
            }
            renderItem={({ item }) => (
              <LogRow item={item} onDelete={confirmDelete} />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator
          />
        )}

        <TouchableOpacity
          style={styles.returnButton}
          activeOpacity={0.9}
          onPress={() => router.back()}
        >
          <Text style={styles.returnButtonText}>Return</Text>
        </TouchableOpacity>
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
    paddingTop: 24,
    paddingBottom: 24,
    backgroundColor: "#F4E6D2",
  },
  brand: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "700",
    color: "#3A5A40",
    marginBottom: 12,
  },
  logsPillWrap: {
    alignSelf: "center",
    marginBottom: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#3A5A40",
  },
  logsPillText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  bannerText: {
    fontSize: 13,
    color: "#555555",
    textAlign: "center",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#555555",
    textAlign: "center",
    marginTop: 24,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  logDetails: {
    flex: 1,
    marginRight: 10,
  },
  logLine: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222222",
    marginBottom: 4,
  },
  logLineMuted: {
    fontSize: 13,
    color: "#666666",
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#e8e8e8",
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#a33",
  },
  returnButton: {
    alignSelf: "center",
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: "#3A5A40",
  },
  returnButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
