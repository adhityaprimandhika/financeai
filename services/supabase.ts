import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cksfkttxdbxdjjbzmdev.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_abQyWLR88QdYM7CIjfRr6w_qxnivLJ1";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Budget types
export type Budget = {
  id: string;
  category: string;
  amount: number;
  period: string;
  created_at: string;
};

// Fetch all budgets
export async function fetchBudgets(): Promise<Budget[]> {
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchBudgets error:", error);
    return [];
  }
  return data ?? [];
}

// Add a budget
export async function addBudget(
  category: string,
  amount: number,
): Promise<Budget | null> {
  const { data, error } = await supabase
    .from("budgets")
    .insert({ category, amount, period: "monthly" })
    .select()
    .single();

  if (error) {
    console.error("addBudget error:", error);
    return null;
  }
  return data;
}

// Update a budget
export async function updateBudget(
  id: string,
  amount: number,
): Promise<boolean> {
  const { error } = await supabase
    .from("budgets")
    .update({ amount, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("updateBudget error:", error);
    return false;
  }
  return true;
}

// Delete a budget
export async function deleteBudget(id: string): Promise<boolean> {
  const { error } = await supabase.from("budgets").delete().eq("id", id);

  if (error) {
    console.error("deleteBudget error:", error);
    return false;
  }
  return true;
}
