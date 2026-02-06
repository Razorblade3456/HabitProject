import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  ChecklistItem,
  Difficulty,
  IntervalType,
  Recurrent,
  Todo
} from "./types";

type MonthlyProgress = Record<string, number>;

type BugBiteState = {
  todos: Todo[];
  recurrent: Recurrent[];
  coins: number;
  infestation: number;
  monthlyProgress: MonthlyProgress;
  loading: boolean;
  recentlyDeleted: {
    type: "todo" | "recurrent";
    item: Todo | Recurrent;
    deletedAtISO: string;
  } | null;
  lastAction: {
    type: "todo";
    itemId: string;
    prevTodo: Todo;
    prevCoins: number;
    prevInfestation: number;
    prevMonthlyProgress: MonthlyProgress;
    actionAtISO: string;
  } | null;
  addTodo: (
    title: string,
    difficulty: Difficulty,
    options?: {
      count?: number;
      note?: string;
      checklist?: ChecklistItem[];
    }
  ) => void;
  unlockTodo: (id: string) => void;
  smashTodo: (id: string) => void;
  failTodo: (id: string) => void;
  updateTodo: (
    id: string,
    updates: {
      title: string;
      difficulty: Difficulty;
      note?: string;
      checklist?: ChecklistItem[];
    }
  ) => void;
  deleteTodo: (id: string) => void;
  addRecurrent: (
    title: string,
    difficulty: Difficulty,
    intervalType: IntervalType,
    timesPerDay: number,
    options?: {
      note?: string;
      checklist?: ChecklistItem[];
    }
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
      note?: string;
      checklist?: ChecklistItem[];
    }
  ) => void;
  deleteRecurrent: (id: string) => void;
  undoRecentlyDeleted: () => void;
  clearRecentlyDeleted: () => void;
  undoLastAction: () => void;
  clearLastAction: () => void;
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

const toDateOnly = (dateISO: string) => dateISO.slice(0, 10);

const parseDateOnly = (dateISO: string) => {
  const [year, month, day] = dateISO.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatDateOnly = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addIntervalDays = (dateISO: string, intervalType: IntervalType) => {
  const date = parseDateOnly(dateISO);
  if (intervalType === "weekly") {
    date.setDate(date.getDate() + 7);
  } else if (intervalType === "monthly") {
    date.setMonth(date.getMonth() + 1);
  } else {
    date.setDate(date.getDate() + 1);
  }
  return formatDateOnly(date);
};

const isDue = (dateISO: string, nextDueDateISO: string) =>
  parseDateOnly(dateISO).getTime() >= parseDateOnly(nextDueDateISO).getTime();

export const useBugBiteStore = create<BugBiteState>()(
  persist(
    (set, get) => ({
      todos: [],
      recurrent: [],
      coins: 0,
      infestation: 0,
      monthlyProgress: {},
      loading: true,
      recentlyDeleted: null,
      lastAction: null,
      setLoading: (loading) => set({ loading }),
      addTodo: (title, difficulty, options) => {
        const nowISO = new Date().toISOString();
        const count = Math.min(10, Math.max(1, options?.count ?? 1));
        const trimmedTitle = title.trim();
        const checklistTemplate =
          options?.checklist && options.checklist.length > 0
            ? options.checklist
            : undefined;
        const note = options?.note?.trim() || undefined;
        const newTodos: Todo[] = Array.from({ length: count }).map((_, index) => {
          const checklist = checklistTemplate
            ? checklistTemplate.map((item) => ({
                ...item,
                id: generateId()
              }))
            : undefined;
          return {
            id: generateId(),
            title:
              count > 1
                ? `${trimmedTitle} (${index + 1}/${count})`
                : trimmedTitle,
            difficulty,
            status: "locked",
            createdAtISO: nowISO,
            note,
            checklist
          };
        });
        set((state) => ({
          todos: [...newTodos, ...state.todos]
        }));
      },
      updateTodo: (id, updates) => {
        const note = updates.note?.trim() || undefined;
        const checklist =
          updates.checklist && updates.checklist.length > 0
            ? updates.checklist
            : undefined;
        set((state) => ({
          todos: state.todos.map((todo) =>
            todo.id === id
              ? {
                  ...todo,
                  ...updates,
                  note,
                  checklist
                }
              : todo
          )
        }));
      },
      deleteTodo: (id) => {
        const nowISO = new Date().toISOString();
        set((state) => {
          const target = state.todos.find((todo) => todo.id === id);
          if (!target) {
            return state;
          }
          return {
            todos: state.todos.filter((todo) => todo.id !== id),
            recentlyDeleted: {
              type: "todo",
              item: target,
              deletedAtISO: nowISO
            }
          };
        });
      },
      addRecurrent: (title, difficulty, intervalType, timesPerDay, options) => {
        const nowISO = new Date().toISOString();
        const todayISO = toDateOnly(nowISO);
        const checklist =
          options?.checklist && options.checklist.length > 0
            ? options.checklist
            : undefined;
        const note = options?.note?.trim() || undefined;
        const newRecurrent: Recurrent = {
          id: generateId(),
          title,
          difficulty,
          intervalType,
          timesPerDay,
          remainingToday: 0,
          lastSpawnDateISO: null,
          nextDueDateISO: todayISO,
          activeBugState: null,
          createdAtISO: nowISO,
          note,
          checklist
        };
        set((state) => ({
          recurrent: [newRecurrent, ...state.recurrent]
        }));
      },
      spawnDueRecurrentBugs: (dateISO) => {
        const todayISO = toDateOnly(dateISO);
        set((state) => ({
          recurrent: state.recurrent.map((item) =>
            isDue(todayISO, item.nextDueDateISO ?? todayISO) &&
            item.lastSpawnDateISO !== todayISO
              ? {
                  ...item,
                  remainingToday: item.timesPerDay,
                  lastSpawnDateISO: todayISO,
                  nextDueDateISO: item.nextDueDateISO ?? todayISO,
                  activeBugState: "locked"
                }
              : item
          )
        }));
      },
      completeRecurrent: (id) => {
        set((state) => ({
          recurrent: state.recurrent.map((item) => {
            const remainingToday = item.remainingToday ?? 0;
            if (item.id !== id || remainingToday <= 0) {
              return item;
            }
            return {
              ...item,
              remainingToday: remainingToday - 1,
              activeBugState:
                remainingToday - 1 === 0 ? "unlocked" : item.activeBugState
            };
          })
        }));
      },
      unlockTodo: (id) => {
        const nowISO = new Date().toISOString();
        set((state) => {
          const target = state.todos.find((todo) => todo.id === id);
          if (!target || target.status !== "locked") {
            return state;
          }
          return {
            todos: state.todos.map((todo) =>
              todo.id === id ? { ...todo, status: "unlocked" } : todo
            ),
            lastAction: {
              type: "todo",
              itemId: id,
              prevTodo: target,
              prevCoins: state.coins,
              prevInfestation: state.infestation,
              prevMonthlyProgress: state.monthlyProgress,
              actionAtISO: nowISO
            }
          };
        });
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
            return {
              ...item,
              activeBugState: null,
              remainingToday: 0,
              nextDueDateISO: addIntervalDays(
                item.nextDueDateISO ?? toDateOnly(new Date().toISOString()),
                item.intervalType
              )
            };
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
        const note = updates.note?.trim() || undefined;
        const checklist =
          updates.checklist && updates.checklist.length > 0
            ? updates.checklist
            : undefined;
        set((state) => ({
          recurrent: state.recurrent.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...updates,
                  remainingToday: Math.min(
                    item.remainingToday ?? 0,
                    updates.timesPerDay
                  ),
                  note,
                  checklist
                }
              : item
          )
        }));
      },
      deleteRecurrent: (id) => {
        const nowISO = new Date().toISOString();
        set((state) => {
          const target = state.recurrent.find((item) => item.id === id);
          if (!target) {
            return state;
          }
          return {
            recurrent: state.recurrent.filter((item) => item.id !== id),
            recentlyDeleted: {
              type: "recurrent",
              item: target,
              deletedAtISO: nowISO
            }
          };
        });
      },
      undoRecentlyDeleted: () => {
        set((state) => {
          if (!state.recentlyDeleted) {
            return state;
          }
          const { type, item } = state.recentlyDeleted;
          if (type === "todo") {
            return {
              todos: [item as Todo, ...state.todos],
              recentlyDeleted: null
            };
          }
          return {
            recurrent: [item as Recurrent, ...state.recurrent],
            recentlyDeleted: null
          };
        });
      },
      clearRecentlyDeleted: () => {
        set({ recentlyDeleted: null });
      },
      undoLastAction: () => {
        set((state) => {
          if (!state.lastAction) {
            return state;
          }
          const { itemId, prevTodo, prevCoins, prevInfestation, prevMonthlyProgress } =
            state.lastAction;
          return {
            todos: state.todos.map((todo) =>
              todo.id === itemId ? prevTodo : todo
            ),
            coins: prevCoins,
            infestation: prevInfestation,
            monthlyProgress: prevMonthlyProgress,
            lastAction: null
          };
        });
      },
      clearLastAction: () => {
        set({ lastAction: null });
      },
      failTodo: (id) => {
        const monthKey = getMonthKey(new Date().toISOString());
        const nowISO = new Date().toISOString();
        set((state) => {
          let failWeight = 0;
          let prevTodo: Todo | null = null;
          const todos = state.todos.map((todo) => {
            if (todo.id !== id) {
              return todo;
            }
            prevTodo = todo;
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
            ),
            lastAction: prevTodo
              ? {
                  type: "todo",
                  itemId: id,
                  prevTodo,
                  prevCoins: state.coins,
                  prevInfestation: state.infestation,
                  prevMonthlyProgress: state.monthlyProgress,
                  actionAtISO: nowISO
                }
              : state.lastAction
          };
        });
      }
    }),
    {
      name: "bugbite-store",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setLoading(false);
        state?.clearRecentlyDeleted();
        state?.clearLastAction();
      }
    }
  )
);

export { getMonthKey };
