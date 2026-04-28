// Use environment variable or default to localhost
// For mobile devices, you need to use your machine's local IP address
const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

const DB_IDS = {
  income: process.env.EXPO_PUBLIC_DB_IDS_INCOME,
  expenses: process.env.EXPO_PUBLIC_DB_IDS_EXPENSES,
  saving: process.env.EXPO_PUBLIC_DB_IDS_SAVING,
  investment: process.env.EXPO_PUBLIC_DB_IDS_INVESTMENT,
};

// Export so other screens can use the same range
export function getCustomDateRange(startDate?: Date, endDate?: Date) {
  const now = new Date();

  let start = new Date(now.getFullYear(), now.getMonth(), 25);
  let end = new Date(now.getFullYear(), now.getMonth() + 1, 24);

  if (now.getDate() < 25) {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 25);
    end = new Date(now.getFullYear(), now.getMonth(), 24);
  }
  if (startDate == null || endDate == null) {
    let start = startDate;
    let end = endDate;
  }

  return {
    start,
    end,
    startStr: start.toISOString().split("T")[0],
    endStr: end.toISOString().split("T")[0],
  };
}

async function queryDatabase(dbId: string, start: Date, end: Date) {
  try {
    // const { start, end } = getCustomDateRange();

    console.log(`Fetching from: ${API_BASE}/notion/query/${dbId}`);

    const res = await fetch(`${API_BASE}/notion/query/${dbId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filter: {
          property: "Date",
          date: {
            on_or_after: start,
            on_or_before: end,
          },
        },
        sorts: [{ property: "Date", direction: "descending" }],
      }),
    });

    if (!res.ok) {
      console.error(`HTTP error! status: ${res.status} for DB: ${dbId}`);
      return [];
    }

    const data = await res.json();

    console.log("Date range:", start, "→", end);
    console.log("Notion response for", dbId, JSON.stringify(data, null, 2));

    if (!data.results) {
      console.error("No results for DB:", dbId, "Error:", data);
      return [];
    }

    return data.results;
  } catch (err) {
    console.error("queryDatabase failed for", dbId, "Error:", err);
    throw new Error(
      `Failed to connect to API at ${API_BASE}. ` +
        `Make sure: 1) API server is running, 2) Use your computer's IP instead of localhost`,
    );
  }
}

function parsePage(page: any, type: string) {
  const props = page.properties;
  return {
    id: page.id,
    type,
    name:
      props["Spend On"]?.title?.[0]?.plain_text ??
      props["Name"]?.title?.[0]?.plain_text ??
      "",
    amount: props["Amount"]?.number ?? 0,
    category: props["Category"]?.select?.name ?? "",
    account: props["Account"]?.select?.name ?? "",
    date: props["Date"]?.date?.start ?? "",
    notes: props["Notes"]?.rich_text?.[0]?.plain_text ?? "",
  };
}

export async function fetchAllFinanceData(start: Date, end: Date) {
  try {
    const [incomeRaw, expensesRaw, savingRaw, investmentRaw] =
      await Promise.all([
        queryDatabase(DB_IDS.income, start, end),
        queryDatabase(DB_IDS.expenses, start, end),
        queryDatabase(DB_IDS.saving, start, end),
        queryDatabase(DB_IDS.investment, start, end),
      ]);

    return {
      income: (incomeRaw ?? []).map((p: any) => parsePage(p, "income")),
      expenses: (expensesRaw ?? []).map((p: any) => parsePage(p, "expense")),
      saving: (savingRaw ?? []).map((p: any) => parsePage(p, "saving")),
      investment: (investmentRaw ?? []).map((p: any) =>
        parsePage(p, "investment"),
      ),
    };
  } catch (err) {
    console.error("fetchAllFinanceData failed:", err);
    return { income: [], expenses: [], saving: [], investment: [] };
  }
}

export async function addEntry(
  type: "income" | "expenses" | "saving" | "investment",
  data: {
    name: string;
    amount: number;
    category: string;
    date: string;
    notes?: string;
  },
) {
  const res = await fetch(`${API_BASE}/notion/pages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      parent: { database_id: DB_IDS[type] },
      properties: {
        "Spend On": { title: [{ text: { content: data.name } }] },
        Amount: { number: data.amount },
        Category: { select: { name: data.category } },
        Date: { date: { start: data.date } },
        Notes: { rich_text: [{ text: { content: data.notes ?? "" } }] },
      },
    }),
  });
  return res.json();
}
