import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchAllFinanceData } from "../../services/notion";
import { useDateStore } from "@/services/store";

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { startDate, endDate, setStartDate, setEndDate } = useDateStore();

  const start = startDate;
  const end = endDate;

  // ✅ Fetch when range changes
  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  // ✅ Prevent invalid range
  useEffect(() => {
    if (endDate < startDate) {
      setEndDate(startDate);
    }
  }, [startDate]);

  async function loadData() {
    setLoading(true);
    try {
      const d = await fetchAllFinanceData(start, end);
      setData(d);
    } catch (err) {
      setError("Failed to load financial data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // 🔥 Quick buttons
  const setThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setStartDate(start);
    setEndDate(end);
  };

  const setLastPeriod = () => {
    const now = new Date();

    let start;
    if (now.getDate() >= 25) {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 25);
    } else {
      start = new Date(now.getFullYear(), now.getMonth() - 2, 25);
    }

    const end = new Date(start.getFullYear(), start.getMonth() + 1, 24);

    setStartDate(start);
    setEndDate(end);
  };

  function isInRange(dateStr: string) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= start && d <= end;
  }

  const incomeFiltered = (data?.income ?? []).filter((i: any) =>
    isInRange(i.date),
  );

  const expensesFiltered = (data?.expenses ?? []).filter((i: any) =>
    isInRange(i.date),
  );

  const savingFiltered = (data?.saving ?? []).filter((i: any) =>
    isInRange(i.date),
  );

  const investmentFiltered = (data?.investment ?? []).filter((i: any) =>
    isInRange(i.date),
  );

  const totalIncome = incomeFiltered.reduce(
    (s: number, i: any) => s + i.amount,
    0,
  );

  const totalExpenses = expensesFiltered.reduce(
    (s: number, i: any) => s + i.amount,
    0,
  );

  const totalSaving = savingFiltered.reduce(
    (s: number, i: any) => s + i.amount,
    0,
  );

  const totalInvestment = investmentFiltered.reduce(
    (s: number, i: any) => s + i.amount,
    0,
  );

  const balance = totalIncome - (totalExpenses + totalSaving + totalInvestment);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator
          size="large"
          color="#6C63FF"
          style={{ marginTop: 40 }}
        />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>FinanceAI</Text>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  const recentAll = [
    ...incomeFiltered,
    ...expensesFiltered,
    ...savingFiltered,
    ...investmentFiltered,
  ]
    .filter((i) => i.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>FinanceAI</Text>

        {/* ✅ Date Picker (WEB) */}
        {Platform.OS === "web" && (
          <View style={styles.dateRow}>
            <input
              type="date"
              value={startDate.toISOString().split("T")[0]}
              onChange={(e: any) => {
                const d = new Date(e.target.value);
                if (!isNaN(d.getTime())) setStartDate(d);
              }}
              style={styles.dateInput}
            />

            <input
              type="date"
              value={endDate.toISOString().split("T")[0]}
              onChange={(e: any) => {
                const d = new Date(e.target.value);
                if (!isNaN(d.getTime())) setEndDate(d);
              }}
              style={styles.dateInput}
            />
          </View>
        )}

        {/* Balance */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total Balance</Text>
          <Text style={styles.balance}>
            IDR {balance.toLocaleString("id-ID")}
          </Text>

          <View style={styles.row}>
            <Text style={styles.income}>
              ↑ IDR {totalIncome.toLocaleString("id-ID")}
            </Text>
            <Text style={styles.expense}>
              ↓ IDR{" "}
              {(totalExpenses + totalSaving + totalInvestment).toLocaleString(
                "id-ID",
              )}
            </Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text>💸</Text>
            <Text style={styles.cardLabel}>Expenses</Text>
            <Text style={styles.subBalance}>
              IDR {totalExpenses.toLocaleString("id-ID")}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text>🏦</Text>
            <Text style={styles.cardLabel}>Saving</Text>
            <Text style={styles.subBalance}>
              IDR {totalSaving.toLocaleString("id-ID")}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text>📈</Text>
            <Text style={styles.cardLabel}>Investment</Text>
            <Text style={styles.subBalance}>
              IDR {totalInvestment.toLocaleString("id-ID")}
            </Text>
          </View>
        </View>

        {/* Recent */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {recentAll.map((item: any) => (
          <View key={item.id} style={styles.txCard}>
            <View style={styles.txInfo}>
              <Text style={styles.txName}>{item.name}</Text>
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
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA", padding: 20 },
  title: {
    color: "#1A1A2E",
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLabel: { color: "#666", fontSize: 14 },
  balance: {
    color: "#1A1A2E",
    fontSize: 30,
    fontWeight: "bold",
    marginVertical: 8,
  },
  subBalance: {
    color: "#1A1A2E",
    fontSize: 14,
    fontWeight: "bold",
    marginVertical: 8,
  },
  row: { flexDirection: "row", gap: 16 },
  income: { color: "#4CAF50", fontSize: 14, fontWeight: "500" },
  expense: { color: "#F44336", fontSize: 14, fontWeight: "500" },
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryIcon: { fontSize: 24, marginBottom: 6 },
  summaryLabel: { color: "#666", fontSize: 12 },
  summaryAmount: {
    color: "#1A1A2E",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  sectionTitle: {
    color: "#1A1A2E",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  txCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  txInfo: { flex: 1 },
  txName: { color: "#1A1A2E", fontSize: 15, fontWeight: "500" },
  txMeta: { color: "#888", fontSize: 12, marginTop: 2 },
  errorText: {
    color: "#F44336",
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
  },
  periodText: {
    color: "#666",
    fontSize: 12,
    marginBottom: 10,
  },

  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 15,
  },

  quickButton: {
    backgroundColor: "#6C63FF",
    color: "#FFF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    fontSize: 12,
    overflow: "hidden",
  },
  dateRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },

  dateInput: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDD",
    fontSize: 12,
  },
});
