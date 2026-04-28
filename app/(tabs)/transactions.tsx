import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchAllFinanceData, getCustomDateRange } from "../../services/notion";

const CATEGORY_ICONS: Record<string, string> = {
  "Food & Beverages": "🍔",
  "Entertainments & Hobbies": "🎮",
  "Self Care": "💆",
  Vehicle: "🚗",
  Income: "💰",
  Saving: "🏦",
  Investment: "📈",
  Utilities: "⚡",
  Health: "💊",
  "Data Package": "📱",
  "Groceries & Daily Needs": "🛒",
  Parking: "🅿️",
  Others: "📦",
};

export default function Transactions() {
  const [allItems, setAllItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [filters, setFilters] = useState<string[]>(["All"]);

  const { start, end } = getCustomDateRange();

  useEffect(() => {
    fetchAllFinanceData(start, end).then((data) => {
      const combined = [
        ...data.income.map((i: any) => ({ ...i, type: "income" })),
        ...data.expenses.map((i: any) => ({ ...i, type: "expense" })),
        ...data.saving.map((i: any) => ({ ...i, type: "saving" })),
        ...data.investment.map((i: any) => ({ ...i, type: "investment" })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAllItems(combined);

      const cats = Array.from(
        new Set(combined.map((i) => i.category).filter(Boolean)),
      );
      setFilters(["All", ...cats]);
      setLoading(false);
    });
  }, []);

  const filtered = allItems.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
    let matchFilter = true;
    if (activeFilter === "All") matchFilter = true;
    else if (activeFilter === "Income") matchFilter = t.type === "income";
    else if (activeFilter === "Expenses") matchFilter = t.type === "expense";
    else if (activeFilter === "Saving") matchFilter = t.type === "saving";
    else if (activeFilter === "Investment")
      matchFilter = t.type === "investment";
    else matchFilter = t.category === activeFilter;
    return matchSearch && matchFilter;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator
          color="#6C63FF"
          size="large"
          style={{ marginTop: 40 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Text style={styles.title}>Transactions</Text>

      {/* Search */}
      <TextInput
        style={styles.search}
        placeholder="Search transactions..."
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
      />

      {/* Filter Chips — using FlatList for reliable horizontal scroll */}
      <FlatList
        data={filters}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
        renderItem={({ item: f }) => (
          <TouchableOpacity
            style={[
              styles.filterBtn,
              activeFilter === f && styles.filterActive,
            ]}
            onPress={() => setActiveFilter(f)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === f && styles.filterTextActive,
              ]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Transaction List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No transactions found.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.txCard}>
            <View style={styles.iconBox}>
              <Text style={styles.icon}>
                {CATEGORY_ICONS[item.category] ?? "💳"}
              </Text>
            </View>
            <View style={styles.txInfo}>
              <Text style={styles.txName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.txMeta}>
                {item.category} · {item.date}
              </Text>
            </View>
            <Text
              style={item.type === "income" ? styles.income : styles.expense}
            >
              {item.type === "income" ? "+" : "-"}IDR{" "}
              {item.amount.toLocaleString("id-ID")}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    color: "#1A1A2E",
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 16,
  },
  search: {
    backgroundColor: "#FFFFFF",
    color: "#1A1A2E",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  filterRow: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 16,
  },
  filterContent: {
    paddingRight: 16,
    alignItems: "center",
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#E8E8E8", // ← visible grey background
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#D0D0D0",
    height: 36,
    justifyContent: "center",
  },
  filterActive: {
    backgroundColor: "#6C63FF",
    borderColor: "#6C63FF",
  },
  filterText: { color: "#444", fontSize: 13, fontWeight: "500" }, // ← dark text
  filterTextActive: { color: "#fff", fontWeight: "600" },
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F0EEFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  icon: { fontSize: 20 },
  txInfo: { flex: 1, marginRight: 8 },
  txName: { color: "#1A1A2E", fontSize: 15, fontWeight: "500" },
  txMeta: { color: "#888", fontSize: 12, marginTop: 2 },
  income: {
    color: "#4CAF50",
    fontWeight: "600",
    fontSize: 13,
    textAlign: "right",
  },
  expense: {
    color: "#F44336",
    fontWeight: "600",
    fontSize: 13,
    textAlign: "right",
  },
  empty: { color: "#999", textAlign: "center", marginTop: 60, fontSize: 15 },
});
