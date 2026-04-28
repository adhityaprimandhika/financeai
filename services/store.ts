import { create } from "zustand";

interface DateState {
  startDate: Date;
  endDate: Date;

  setStartDate: (date: Date) => void;
  setEndDate: (date: Date) => void;

  setRange: (start: Date, end: Date) => void;
  setThisMonth: () => void;
  setLastPeriod: () => void;
}

export const useDateStore = create<DateState>((set) => ({
  startDate: new Date(),
  endDate: new Date(),

  setStartDate: (date) =>
    set((state) => ({
      startDate: date,
      endDate: state.endDate < date ? date : state.endDate, // prevent invalid range
    })),

  setEndDate: (date) =>
    set((state) => ({
      endDate: date < state.startDate ? state.startDate : date,
    })),

  setRange: (start, end) =>
    set({
      startDate: start,
      endDate: end < start ? start : end,
    }),

  // 🔥 Quick presets
  setThisMonth: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    set({ startDate: start, endDate: end });
  },

  setLastPeriod: () => {
    const now = new Date();

    let start;
    if (now.getDate() >= 25) {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 25);
    } else {
      start = new Date(now.getFullYear(), now.getMonth() - 2, 25);
    }

    const end = new Date(start.getFullYear(), start.getMonth() + 1, 24);

    set({ startDate: start, endDate: end });
  },
}));
