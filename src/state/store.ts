import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Difficulty, IntervalType, Recurrent, Todo } from "./types";

type MonthlyProgress = Record<string, number>;

type BugBiteState = {
  todos: Todo[];
  recurrent: Recurrent[];
  coins: number;
  infestation: number;
  monthlyProgress: MonthlyProgress;
  loading: boolean;
  addTodo: (title: string, difficulty: Difficulty) => void;
  unlockTodo: (id: string) => void;
  smashTodo: (id: string) => void;
  failTodo: (id: string) => void;
  updateTodo: (id: string, updates: { title: string; difficulty: Difficulty }) => void;
  deleteTodo: (id: string) => void;
  addRecurrent: (
    title: string,
    difficulty: Difficulty,
    intervalType: IntervalType,
    timesPerDay: number
  ) => void;
  spawnDueRecurrentBugs: (dateISO: string) => void;
  completeRecurrent: (id: string) => void;
  smashRecurrent: (id: string) => void;
  updateRecurrent: (
    id: string,
    updates: {
      title: string;
      difficulty: Difficulty;
      intervalType: IntervalType;
      timesPerDay: number;
    }
  ) => void;
  deleteRecurrent: (id: string) => void;
  setLoading: (loading: boolean) => void;
};

const COIN_REWARDS: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  boss: 5
};

const FAIL_WEIGHTS: Record<Difficulty, number> = {
  easy: 1,
  medium: 1,
  hard: 2,
  boss: 3
};

const getMonthKey = (dateISO: string) => {
  const date = new Date(dateISO);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const updateMonthlyProgress = (
  monthlyProgress: MonthlyProgress,
  monthKey: string,
  delta: number
) => {
  const current = monthlyProgress[monthKey] ?? 0;
  const next = Math.max(0, current + delta);
  return {
    ...monthlyProgress,
    [monthKey]: next
  };
};

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useBugBiteStore = create<BugBiteState>()(
  persist(
    (set, get) => ({
      todos: [],
      recurrent: [],
      coins: 0,
      infestation: 0,
      monthlyProgress: {},
      loading: true,
      setLoading: (loading) => set({ loading }),
      addTodo: (title, difficulty) => {
        const nowISO = new Date().toISOString();
        const newTodo: Todo = {
          id: generateId(),
          title,
          difficulty,
          status: "locked",
          createdAtISO: nowISO
        };
        set((state) => ({
          todos: [newTodo, ...state.todos]
        }));
      },
      updateTodo: (id, updates) => {
        set((state) => ({
          todos: state.todos.map((todo) =>
            todo.id === id ? { ...todo, ...updates } : todo
          )
        }));
      },
      deleteTodo: (id) => {
        set((state) => ({
          todos: state.todos.filter((todo) => todo.id !== id)
        }));
      },
      addRecurrent: (title, difficulty, intervalType, timesPerDay) => {
        const nowISO = new Date().toISOString();
        const newRecurrent: Recurrent = {
          id: generateId(),
          title,
          difficulty,
          intervalType,
          timesPerDay,
          activeBugState: null,
          createdAtISO: nowISO
        };
        set((state) => ({
          recurrent: [newRecurrent, ...state.recurrent]
        }));
      },
      spawnDueRecurrentBugs: () => {
        set((state) => ({
          recurrent: state.recurrent.map((item) =>
            item.activeBugState === null
              ? { ...item, activeBugState: "unlocked" }
              : item
          )
        }));
      },
      completeRecurrent: (id) => {
        set((state) => ({
          recurrent: state.recurrent.map((item) =>
            item.id === id ? { ...item, activeBugState: null } : item
          )
        }));
      },
      unlockTodo: (id) => {
        set((state) => ({
          todos: state.todos.map((todo) =>
            todo.id === id ? { ...todo, status: "unlocked" } : todo
          )
        }));
      },
      smashTodo: (id) => {
        const monthKey = getMonthKey(new Date().toISOString());
        set((state) => {
          let coinsEarned = 0;
          const todos = state.todos.map((todo) => {
            if (todo.id !== id) {
              return todo;
            }
            coinsEarned = COIN_REWARDS[todo.difficulty];
            return { ...todo, status: "smashed" };
          });
          return {
            todos,
            coins: state.coins + coinsEarned,
            monthlyProgress: updateMonthlyProgress(
              state.monthlyProgress,
              monthKey,
              1
            )
          };
        });
      },
      smashRecurrent: (id) => {
        const monthKey = getMonthKey(new Date().toISOString());
        set((state) => {
          let coinsEarned = 0;
          const recurrent = state.recurrent.map((item) => {
            if (item.id !== id) {
              return item;
            }
            if (item.activeBugState !== "unlocked") {
              return item;
            }
            coinsEarned = COIN_REWARDS[item.difficulty];
            return { ...item, activeBugState: null };
          });
          return {
            recurrent,
            coins: state.coins + coinsEarned,
            monthlyProgress: updateMonthlyProgress(
              state.monthlyProgress,
              monthKey,
              1
            )
          };
        });
      },
      updateRecurrent: (id, updates) => {
        set((state) => ({
          recurrent: state.recurrent.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          )
        }));
      },
      deleteRecurrent: (id) => {
        set((state) => ({
          recurrent: state.recurrent.filter((item) => item.id !== id)
        }));
      },
      failTodo: (id) => {
        const monthKey = getMonthKey(new Date().toISOString());
        set((state) => {
          let failWeight = 0;
          const todos = state.todos.map((todo) => {
            if (todo.id !== id) {
              return todo;
            }
            failWeight = FAIL_WEIGHTS[todo.difficulty];
            return todo;
          });
          return {
            todos,
            infestation: Math.min(10, state.infestation + failWeight),
            monthlyProgress: updateMonthlyProgress(
              state.monthlyProgress,
              monthKey,
              -1
            )
          };
        });
      }
    }),
    {
      name: "bugbite-store",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setLoading(false);
      }
    }
  )
);

export { getMonthKey };
