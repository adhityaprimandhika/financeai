import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchAllFinanceData, getCustomDateRange } from "../../services/notion";
import { useDateStore } from "@/services/store";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

interface FinanceData {
  income: any[];
  expenses: any[];
  saving: any[];
  investment: any[];
}

interface Insight {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

interface Message {
  role: "user" | "ai";
  text: string;
}

function buildFinanceSummary(
  data: FinanceData,
  transactions: any[],
  start?: Date,
  end?: Date,
) {
  const totalIncome = data.income.reduce((s, i) => s + (i.amount || 0), 0);
  const totalExpenses = data.expenses.reduce((s, i) => s + (i.amount || 0), 0);
  const totalSavings = data.saving.reduce((s, i) => s + (i.amount || 0), 0);
  const totalInvestment = data.investment.reduce(
    (s, i) => s + (i.amount || 0),
    0,
  );
  const balance =
    totalIncome - (totalExpenses + totalSavings + totalInvestment);

  const expensesByCategory = data.expenses.reduce(
    (acc: Record<string, number>, item) => {
      const cat = item.category || "Uncategorized";
      acc[cat] = (acc[cat] || 0) + (item.amount || 0);
      return acc;
    },
    {},
  );

  const topCategories = Object.entries(expensesByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(
      ([cat, amt]) => `${cat}: IDR ${(amt as number).toLocaleString("id-ID")}`,
    )
    .join(", ");

  const formattedTransactions = transactions.slice(0, 50).map((t) => ({
    name: t.name,
    amount: t.amount,
    type: t.type,
    category: t.category,
    date: t.date,
  }));

  const fmt = (d: Date) =>
    d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return {
    totalIncome,
    totalExpenses,
    totalSavings,
    totalInvestment,
    balance,
    topCategories,
    expensesByCategory,
    formattedTransactions,
    context: `You are FinanceAI, a smart personal finance assistant.

IMPORTANT:
- ONLY analyze transactions within this period
- DO NOT assume data outside this range

SUMMARY:
- Balance: IDR ${balance.toLocaleString("id-ID")}
- Income: IDR ${totalIncome.toLocaleString("id-ID")}
- Expenses: IDR ${totalExpenses.toLocaleString("id-ID")}
- Savings: IDR ${totalSavings.toLocaleString("id-ID")}
- Investment: IDR ${totalInvestment.toLocaleString("id-ID")}
- Top categories: ${topCategories || "No data"}

TRANSACTIONS:
${JSON.stringify(formattedTransactions, null, 2)}

INSTRUCTION:
- Answer ONLY using the data above
- Be concise and actionable
- Always use IDR currency
`,
  };
}

// Pure function outside component — no hook issues
function generateInsightsFromData(
  financeData: FinanceData,
  transactions: any[],
): Insight[] {
  const {
    totalIncome,
    totalExpenses,
    totalSavings,
    totalInvestment,
    expensesByCategory,
  } = buildFinanceSummary(financeData, transactions);

  const newInsights: Insight[] = [];

  if (totalIncome > 0) {
    const savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100;
    if (savingsRate < 0) {
      newInsights.push({
        id: "1",
        title: "Spending Alert",
        description: `Expenses exceed income by IDR ${Math.abs(totalIncome - totalExpenses).toLocaleString("id-ID")}. Review your budget.`,
        icon: "⚠️",
        color: "#F44336",
      });
    } else if (savingsRate > 20) {
      newInsights.push({
        id: "1",
        title: "Great Saver!",
        description: `You're saving ${Math.round(savingsRate)}% of your income. Keep it up!`,
        icon: "🎉",
        color: "#4CAF50",
      });
    } else {
      newInsights.push({
        id: "1",
        title: "Savings Opportunity",
        description: `Your savings rate is ${Math.round(savingsRate)}%. Try to reach 20% for financial health.`,
        icon: "💡",
        color: "#FFC107",
      });
    }
  }

  const highestCategory = Object.entries(expensesByCategory).sort(
    (a, b) => b[1] - a[1],
  )[0];
  if (highestCategory) {
    newInsights.push({
      id: "2",
      title: "Top Spending",
      description: `Highest spending: ${highestCategory[0]} at IDR ${highestCategory[1].toLocaleString("id-ID")}.`,
      icon: "💳",
      color: "#2196F3",
    });
  }

  if (totalSavings > 0) {
    newInsights.push({
      id: "3",
      title: "Savings Progress",
      description: `You've saved IDR ${totalSavings.toLocaleString("id-ID")} this period.`,
      icon: "🏦",
      color: "#4CAF50",
    });
  }

  if (totalInvestment > 0) {
    newInsights.push({
      id: "4",
      title: "Investment Activity",
      description: `You've invested IDR ${totalInvestment.toLocaleString("id-ID")} this period.`,
      icon: "📈",
      color: "#9C27B0",
    });
  }

  return newInsights;
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <View style={{ gap: 6 }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <View key={i} style={{ height: 4 }} />;

        const isBoldLine = line.startsWith("**") && line.endsWith("**");
        if (isBoldLine) {
          return (
            <Text
              key={i}
              style={{
                color: "#1A1A2E",
                fontWeight: "700",
                fontSize: 14,
                marginTop: 6,
              }}
            >
              {line.replace(/\*\*/g, "")}
            </Text>
          );
        }

        const isBullet = line.trimStart().startsWith("* ");
        if (isBullet) {
          return (
            <View
              key={i}
              style={{ flexDirection: "row", gap: 8, paddingLeft: 8 }}
            >
              <Text style={{ color: "#6C63FF", fontSize: 14 }}>•</Text>
              <Text
                style={{ color: "#333", fontSize: 14, lineHeight: 21, flex: 1 }}
              >
                {line.replace(/^\s*\*\s/, "").replace(/\*\*(.*?)\*\*/g, "$1")}
              </Text>
            </View>
          );
        }

        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <Text key={i} style={{ color: "#333", fontSize: 14, lineHeight: 21 }}>
            {parts.map((part, j) =>
              j % 2 === 1 ? (
                <Text key={j} style={{ fontWeight: "700" }}>
                  {part}
                </Text>
              ) : (
                part
              ),
            )}
          </Text>
        );
      })}
    </View>
  );
}

export default function Insights() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [allItems, setAllItems] = useState<any[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<
    "checking" | "online" | "offline"
  >("checking");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const { startDate, endDate, setStartDate, setEndDate } = useDateStore();

  useEffect(() => {
    loadFinanceData();
    checkOllama();
  }, [startDate, endDate]);

  async function checkOllama() {
    try {
      const res = await fetch(`${API_BASE}/ollama/health`);
      setOllamaStatus(res.ok ? "online" : "offline");
    } catch {
      setOllamaStatus("offline");
    }
  }

  // const { startDate, endDate, setStartDate, setEndDate } = useDateStore();

  const start = startDate;
  const end = endDate;

  async function loadFinanceData() {
    try {
      // const { start, end } = getCustomDateRange();
      const raw = await fetchAllFinanceData(start, end);

      fetchAllFinanceData(start, end).then((data) => {
        const combine = [
          ...data.income.map((i: any) => ({ ...i, type: "income" })),
          ...data.expenses.map((i: any) => ({ ...i, type: "expense" })),
          ...data.saving.map((i: any) => ({ ...i, type: "saving" })),
          ...data.investment.map((i: any) => ({ ...i, type: "investment" })),
        ]
          .filter((i: any) => inRange(i.date))
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          );
        setAllItems(combine);
      });

      function inRange(dateStr: string) {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d >= start && d <= end;
      }

      // ✅ Combine + filter sekali saja
      const combined = [
        ...raw.income.map((i: any) => ({ ...i, type: "income" })),
        ...raw.expenses.map((i: any) => ({ ...i, type: "expense" })),
        ...raw.saving.map((i: any) => ({ ...i, type: "saving" })),
        ...raw.investment.map((i: any) => ({ ...i, type: "investment" })),
      ]
        .filter((i) => inRange(i.date))
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

      setAllItems(combined);

      // ✅ Filter per category (consistent with combined)
      const filtered: FinanceData = {
        income: combined.filter((i) => i.type === "income"),
        expenses: combined.filter((i) => i.type === "expense"),
        saving: combined.filter((i) => i.type === "saving"),
        investment: combined.filter((i) => i.type === "investment"),
      };

      setData(filtered);

      // ✅ IMPORTANT: use combined, not stale allItems
      setInsights(generateInsightsFromData(filtered, combined));
    } catch {
      setError("Failed to load financial data");
    } finally {
      setLoading(false);
    }
  }

  async function askAI() {
    if (!question.trim() || !data) return;

    const userQuestion = question.trim();
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", text: userQuestion }]);
    setLoadingAI(true);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    const { context } = buildFinanceSummary(data, allItems, start, end);

    try {
      const res = await fetch(`${API_BASE}/ollama/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userQuestion, context }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const result = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: result.text ?? "No response." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "⚠️ Could not reach Ollama. Make sure it's running.",
        },
      ]);
    } finally {
      setLoadingAI(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

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

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>AI Insights ✨</Text>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  // const { start, end } = getCustomDateRange();
  const fmt = (d: Date) =>
    d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>AI Insights ✨</Text>

      {/* Status row */}
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor:
                ollamaStatus === "online"
                  ? "#4CAF50"
                  : ollamaStatus === "offline"
                    ? "#F44336"
                    : "#FFC107",
            },
          ]}
        />
        <Text style={styles.statusText}>
          {ollamaStatus === "online"
            ? "Gemma 4 · Local AI online"
            : ollamaStatus === "offline"
              ? "Local AI offline — run: ollama serve"
              : "Checking AI status..."}
        </Text>
      </View>

      {/* Period badge */}
      <View style={styles.periodBadge}>
        <Text style={styles.periodText}>
          📅 {fmt(start)} – {fmt(end)}
        </Text>
      </View>

      {/* Auto Insights */}
      {insights.length === 0 ? (
        <Text style={styles.emptyText}>
          Add some transactions to see insights!
        </Text>
      ) : (
        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
          {insights.map((insight) => (
            <View
              key={insight.id}
              style={[styles.insightCard, { borderLeftColor: insight.color }]}
            >
              <Text style={styles.insightIcon}>{insight.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightDesc}>{insight.description}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Chat section */}
      <Text style={styles.sectionTitle}>Ask FinanceAI</Text>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
        {/* Chat history */}
        {messages.map((msg, i) => (
          <View
            key={i}
            style={msg.role === "user" ? styles.bubbleUser : styles.bubbleAI}
          >
            {msg.role === "ai" && (
              <Text style={styles.answerLabel}>🤖 Gemma 4</Text>
            )}
            {msg.role === "user" ? (
              <Text style={styles.bubbleUserText}>{msg.text}</Text>
            ) : (
              <MarkdownText text={msg.text} />
            )}
          </View>
        ))}

        {/* Loading bubble */}
        {loadingAI && (
          <View style={styles.bubbleAI}>
            <ActivityIndicator color="#6C63FF" size="small" />
          </View>
        )}
      </ScrollView>
      {/* Input */}
      <TextInput
        style={styles.input}
        placeholder="Ask about your finances..."
        placeholderTextColor="#888"
        value={question}
        onChangeText={setQuestion}
        multiline
      />
      <TouchableOpacity
        style={[
          styles.askBtn,
          (!question.trim() || loadingAI || ollamaStatus === "offline") &&
            styles.askBtnDisabled,
        ]}
        onPress={askAI}
        disabled={loadingAI || !question.trim() || ollamaStatus === "offline"}
      >
        {loadingAI ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.askBtnText}>
            {ollamaStatus === "offline" ? "AI Offline" : "Ask AI →"}
          </Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA", padding: 20 },
  title: {
    color: "#1A1A2E",
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: "#666", fontSize: 12 },
  periodBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF0FF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 20,
  },
  periodText: { color: "#6C63FF", fontSize: 12, fontWeight: "500" },
  emptyText: {
    color: "#888",
    fontSize: 15,
    textAlign: "center",
    marginTop: 40,
    marginBottom: 40,
  },
  insightCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    gap: 12,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  insightIcon: { fontSize: 24 },
  insightTitle: {
    color: "#1A1A2E",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  insightDesc: { color: "#666", fontSize: 13, lineHeight: 19 },
  sectionTitle: {
    color: "#1A1A2E",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 12,
  },
  bubbleUser: {
    backgroundColor: "#6C63FF",
    alignSelf: "flex-end",
    borderRadius: 14,
    borderBottomRightRadius: 4,
    padding: 14,
    marginBottom: 10,
    maxWidth: "85%",
  },
  bubbleAI: {
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    padding: 14,
    marginBottom: 10,
    width: "100%",
  },
  bubbleUserText: { color: "#fff", fontSize: 14, lineHeight: 21 },
  answerLabel: {
    color: "#6C63FF",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    color: "#1A1A2E",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  askBtn: {
    backgroundColor: "#6C63FF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 24,
  },
  askBtnDisabled: { backgroundColor: "#A0A0A0" },
  askBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  errorText: {
    color: "#F44336",
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
  },
});
