import {
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";

type LogEntry = {
  id: string;
  name: string;
  date: string;
  time: string;
  imageUri: string | null;
};

const MOCK_LOGS: LogEntry[] = [
  { id: "1", name: "Nasi Lemak", date: "17/1/26", time: "13:16", imageUri: null },
  { id: "2", name: "Nasi Lemak", date: "15/1/26", time: "22:16", imageUri: null },
  { id: "3", name: "Nasi Lemak", date: "15/1/26", time: "08:16", imageUri: null },
];

function LogRow({ item }: { item: LogEntry }) {
  return (
    <View style={styles.logRow}>
      <View style={styles.logImageBox}>
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.logImage} />
        ) : (
          <View style={styles.logImagePlaceholder} />
        )}
      </View>
      <View style={styles.logDetails}>
        <Text style={styles.logLine}>Name: {item.name}</Text>
        <Text style={styles.logLine}>Date: {item.date}</Text>
        <Text style={styles.logLine}>Time: {item.time}</Text>
      </View>
    </View>
  );
}

export default function Logs() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.brand}>RasaRight</Text>

        <View style={styles.logsPillWrap}>
          <Text style={styles.logsPillText}>Logs</Text>
        </View>

        <FlatList
          data={MOCK_LOGS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <LogRow item={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator
          indicatorStyle="default"
        />

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
    color: "#7AD957",
    marginBottom: 12,
  },
  logsPillWrap: {
    alignSelf: "center",
    marginBottom: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#7AD957",
  },
  logsPillText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 16,
  },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
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
  logImageBox: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 14,
  },
  logImage: {
    width: "100%",
    height: "100%",
  },
  logImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#e8e8e8",
  },
  logDetails: {
    flex: 1,
  },
  logLine: {
    fontSize: 14,
    color: "#333333",
    marginBottom: 2,
  },
  returnButton: {
    alignSelf: "center",
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: "#7AD957",
  },
  returnButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
