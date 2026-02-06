import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  Difficulty,
  Habit,
  IntervalType,
  SmashEvent,
  SmashSourceType,
  Task
} from "./types";

export const MAX_INFESTATION = 10;

const COINS_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  boss: 5
};

const INFESTATION_WEIGHT: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  boss: 4
};

const STORAGE_KEY = "bugbite-state";

const getTodayISO = () => new Date().toISOString().slice(0, 10);

const getMonthKey = (dateISO: string) => dateISO.slice(0, 7);

const addDays = (dateISO: string, days: number) => {
  const date = new Date(dateISO);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const addMonths = (dateISO: string, months: number) => {
  const date = new Date(dateISO);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const targetMonth = month + months;
  const targetDate = new Date(year, targetMonth, 1);
  const lastDay = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth() + 1,
    0
  ).getDate();
  const clampedDay = Math.min(day, lastDay);
  const result = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    clampedDay
  );
  return result.toISOString().slice(0, 10);
};

const advanceDueDate = (dateISO: string, intervalType: IntervalType) => {
  switch (intervalType) {
    case "weekly":
      return addDays(dateISO, 7);
    case "biweekly":
      return addDays(dateISO, 14);
    case "monthly":
      return addMonths(dateISO, 1);
    default:
      return addDays(dateISO, 7);
  }
};

const createId = () => `id-${Math.random().toString(36).slice(2, 10)}`;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

type Settings = {
  soundOn: boolean;
};

type BugBiteState = {
  todos: Task[];
  recurrent: Habit[];
  infestation: number;
  coins: number;
  monthlyProgress: Record<string, number>;
  smashLog: SmashEvent[];
  settings: Settings;
  overrunActive: boolean;
  warning: string | null;
  addTodo: (title: string, difficulty: Difficulty) => void;
  unlockTodo: (id: string) => void;
  smashTodo: (id: string) => void;
  addRecurrent: (
    title: string,
    difficulty: Difficulty,
    intervalType: IntervalType,
    startDateISO?: string
  ) => void;
  spawnDueRecurrentBugs: (todayISO: string) => void;
  completeRecurrent: (id: string) => void;
  smashRecurrent: (id: string) => void;
  failItem: (sourceType: SmashSourceType, id: string) => void;
  buyPoison: (size: "small" | "medium" | "large") => void;
  toggleSound: () => void;
};

const ensureOverrun = (infestation: number) => ({
  overrunActive: infestation >= MAX_INFESTATION,
  warning: infestation >= MAX_INFESTATION ? "OVERRUN" : null
});

const applySmashRewards = (
  state: BugBiteState,
  sourceType: SmashSourceType,
  sourceId: string,
  difficulty: Difficulty
) => {
  const dateISO = new Date().toISOString();
  const monthKey = getMonthKey(dateISO);
  const baseCoins = COINS_BY_DIFFICULTY[difficulty];
  const coinMultiplier = Math.max(0.5, 1 - 0.05 * state.infestation);
  const coinsEarned = Math.max(0, Math.round(baseCoins * coinMultiplier));
  const updatedMonthly = {
    ...state.monthlyProgress,
    [monthKey]: (state.monthlyProgress[monthKey] ?? 0) + 1
  };
  const smashEvent: SmashEvent = {
    id: createId(),
    sourceType,
    sourceId,
    dateISO,
    monthKey,
    coinsEarned
  };
  const updatedLog = [...state.smashLog, smashEvent].slice(-500);

  return {
    coins: state.coins + coinsEarned,
    monthlyProgress: updatedMonthly,
    smashLog: updatedLog
  };
};

export const useBugBiteStore = create<BugBiteState>()(
  persist(
    (set, get) => ({
      todos: [],
      recurrent: [],
      infestation: 0,
      coins: 0,
      monthlyProgress: {},
      smashLog: [],
      settings: { soundOn: true },
      overrunActive: false,
      warning: null,
      addTodo: (title, difficulty) => {
        const newTask: Task = {
          id: createId(),
          title,
          difficulty,
          createdAt: new Date().toISOString(),
          status: "locked"
        };
        set((state) => ({ todos: [...state.todos, newTask] }));
      },
      unlockTodo: (id) => {
        set((state) => ({
          todos: state.todos.map((todo) =>
            todo.id === id && todo.status === "locked"
              ? { ...todo, status: "unlocked" }
              : todo
          )
        }));
      },
      smashTodo: (id) => {
        set((state) => {
          const target = state.todos.find((todo) => todo.id === id);
          if (!target || target.status !== "unlocked") {
            return state;
          }
          const rewards = applySmashRewards(
            state,
            "todo",
            target.id,
            target.difficulty
          );
          return {
            ...state,
            ...rewards,
            todos: state.todos.map((todo) =>
              todo.id === id ? { ...todo, status: "smashed" } : todo
            )
          };
        });
      },
      addRecurrent: (title, difficulty, intervalType, startDateISO) => {
        const startDate = startDateISO ?? getTodayISO();
        const habit: Habit = {
          id: createId(),
          title,
          difficulty,
          intervalType,
          nextDueDate: startDate,
          activeBugState: null,
          lastCompletedDate: null
        };
        set((state) => ({ recurrent: [...state.recurrent, habit] }));
      },
      spawnDueRecurrentBugs: (todayISO) => {
        set((state) => ({
          recurrent: state.recurrent.map((habit) => {
            if (
              habit.activeBugState === null &&
              todayISO >= habit.nextDueDate
            ) {
              return { ...habit, activeBugState: "locked" };
            }
            return habit;
          })
        }));
      },
      completeRecurrent: (id) => {
        set((state) => ({
          recurrent: state.recurrent.map((habit) => {
            if (habit.id !== id) {
              return habit;
            }
            const unlocked = habit.activeBugState ?? "unlocked";
            return {
              ...habit,
              activeBugState: unlocked,
              lastCompletedDate: getTodayISO(),
              nextDueDate: advanceDueDate(habit.nextDueDate, habit.intervalType)
            };
          })
        }));
      },
      smashRecurrent: (id) => {
        set((state) => {
          const target = state.recurrent.find((habit) => habit.id === id);
          if (!target || target.activeBugState !== "unlocked") {
            return state;
          }
          const rewards = applySmashRewards(
            state,
            "recurrent",
            target.id,
            target.difficulty
          );
          return {
            ...state,
            ...rewards,
            recurrent: state.recurrent.map((habit) =>
              habit.id === id ? { ...habit, activeBugState: null } : habit
            )
          };
        });
      },
      failItem: (sourceType, id) => {
        set((state) => {
          const monthKey = getMonthKey(new Date().toISOString());
          const currentFeeds = state.monthlyProgress[monthKey] ?? 0;
          const updatedFeeds = Math.max(0, currentFeeds - 1);
          let difficulty: Difficulty | null = null;

          if (sourceType === "todo") {
            const todo = state.todos.find((item) => item.id === id);
            difficulty = todo?.difficulty ?? null;
          } else {
            const habit = state.recurrent.find((item) => item.id === id);
            difficulty = habit?.difficulty ?? null;
          }

          const infestationDelta = difficulty
            ? INFESTATION_WEIGHT[difficulty]
            : 1;
          const nextInfestation = clamp(
            state.infestation + infestationDelta,
            0,
            MAX_INFESTATION
          );
          return {
            ...state,
            infestation: nextInfestation,
            monthlyProgress: {
              ...state.monthlyProgress,
              [monthKey]: updatedFeeds
            },
            ...ensureOverrun(nextInfestation)
          };
        });
      },
      buyPoison: (size) => {
        const table = {
          small: { cost: 5, clear: 1 },
          medium: { cost: 12, clear: 3 },
          large: { cost: 18, clear: 5 }
        };
        set((state) => {
          const option = table[size];
          if (!option || state.coins < option.cost) {
            return state;
          }
          const nextInfestation = clamp(
            state.infestation - option.clear,
            0,
            MAX_INFESTATION
          );
          return {
            ...state,
            coins: state.coins - option.cost,
            infestation: nextInfestation,
            ...ensureOverrun(nextInfestation)
          };
        });
      },
      toggleSound: () => {
        set((state) => ({
          settings: { ...state.settings, soundOn: !state.settings.soundOn }
        }));
      }
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        todos: state.todos,
        recurrent: state.recurrent,
        infestation: state.infestation,
        coins: state.coins,
        monthlyProgress: state.monthlyProgress,
        smashLog: state.smashLog,
        settings: state.settings
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return;
        }
        const { infestation } = state;
        const updates = ensureOverrun(infestation);
        state.overrunActive = updates.overrunActive;
        state.warning = updates.warning;
      }
    }
  )
);
