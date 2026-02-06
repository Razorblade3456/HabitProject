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

type MonthlyItem = {
  id: string;
  title: string;
  dateISO: string;
  difficulty: Difficulty;
  type: "todo" | "recurrent";
};

type MonthlyStats = {
  smashedCount: number;
  missedCount: number;
  smashedItems: MonthlyItem[];
  missedItems: MonthlyItem[];
};

type MonthlyStatsMap = Record<string, MonthlyStats>;

type BugBiteState = {
  todos: Todo[];
  recurrent: Recurrent[];
  coins: number;
  infestation: number;
  monthlyStats: MonthlyStatsMap;
  loading: boolean;
  recentlyDeleted: {
    type: "todo" | "recurrent";
    item: Todo | Recurrent;
    deletedAtISO: string;
  } | null;
  lastAction: (
    | {
        type: "todo";
        itemId: string;
        prevTodo: Todo;
        prevCoins: number;
        prevInfestation: number;
        prevMonthlyStats: MonthlyStatsMap;
        actionAtISO: string;
      }
    | {
        type: "recurrent";
        itemId: string;
        prevRecurrent: Recurrent;
        prevCoins: number;
        prevInfestation: number;
        prevMonthlyStats: MonthlyStatsMap;
        actionAtISO: string;
      }
  ) | null;
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
  failRecurrent: (id: string) => void;
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

const ensureMonthlyStats = (monthlyStats: MonthlyStatsMap, monthKey: string) =>
  monthlyStats[monthKey] ?? {
    smashedCount: 0,
    missedCount: 0,
    smashedItems: [],
    missedItems: []
  };

const pushMonthlyItem = (items: MonthlyItem[], item: MonthlyItem) =>
  [item, ...items].slice(0, 200);

const updateMonthlyStats = (
  monthlyStats: MonthlyStatsMap,
  monthKey: string,
  update: {
    smashedDelta?: number;
    missedDelta?: number;
    smashedItem?: MonthlyItem;
    missedItem?: MonthlyItem;
  }
) => {
  const current = ensureMonthlyStats(monthlyStats, monthKey);
  const smashedCount = Math.max(
    0,
    current.smashedCount + (update.smashedDelta ?? 0)
  );
  const missedCount = Math.max(
    0,
    current.missedCount + (update.missedDelta ?? 0)
  );
  return {
    ...monthlyStats,
    [monthKey]: {
      smashedCount,
      missedCount,
      smashedItems: update.smashedItem
        ? pushMonthlyItem(current.smashedItems, update.smashedItem)
        : current.smashedItems,
      missedItems: update.missedItem
        ? pushMonthlyItem(current.missedItems, update.missedItem)
        : current.missedItems
    }
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
      monthlyStats: {},
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
            checklist,
            lastOutcome: null
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
          checklist,
          lastOutcome: null
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
                  activeBugState: "locked",
                  lastOutcome: null
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
              lastOutcome: "plus",
              activeBugState:
                remainingToday - 1 === 0 ? "unlocked" : item.activeBugState
            };
          })
        }));
      },
      failRecurrent: (id) => {
        const nowISO = new Date().toISOString();
        const monthKey = getMonthKey(nowISO);
        set((state) => {
          let prevRecurrent: Recurrent | null = null;
          let missedItem: MonthlyItem | null = null;
          const recurrent = state.recurrent.map((item) => {
            if (item.id !== id) {
              return item;
            }
            prevRecurrent = item;
            missedItem = {
              id: item.id,
              title: item.title,
              dateISO: nowISO,
              difficulty: item.difficulty,
              type: "recurrent"
            };
            return { ...item, lastOutcome: "minus" };
          });
          return {
            recurrent,
            monthlyStats: missedItem
              ? updateMonthlyStats(state.monthlyStats, monthKey, {
                  missedDelta: 1,
                  smashedDelta: -1,
                  missedItem: missedItem
                })
              : state.monthlyStats,
            lastAction: prevRecurrent
              ? {
                  type: "recurrent",
                  itemId: id,
                  prevRecurrent,
                  prevCoins: state.coins,
                  prevInfestation: state.infestation,
                  prevMonthlyStats: state.monthlyStats,
                  actionAtISO: nowISO
                }
              : state.lastAction
          };
        });
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
              todo.id === id
                ? { ...todo, status: "unlocked", lastOutcome: "plus" }
                : todo
            ),
            lastAction: {
              type: "todo",
              itemId: id,
              prevTodo: target,
              prevCoins: state.coins,
              prevInfestation: state.infestation,
              prevMonthlyStats: state.monthlyStats,
              actionAtISO: nowISO
            }
          };
        });
      },
      smashTodo: (id) => {
        const nowISO = new Date().toISOString();
        const monthKey = getMonthKey(nowISO);
        set((state) => {
          let coinsEarned = 0;
          let smashItem: MonthlyItem | null = null;
          const todos = state.todos.map((todo) => {
            if (todo.id !== id) {
              return todo;
            }
            coinsEarned = COIN_REWARDS[todo.difficulty];
            smashItem = {
              id: todo.id,
              title: todo.title,
              dateISO: nowISO,
              difficulty: todo.difficulty,
              type: "todo"
            };
            return { ...todo, status: "smashed", lastOutcome: null };
          });
          return {
            todos,
            coins: state.coins + coinsEarned,
            monthlyStats: smashItem
              ? updateMonthlyStats(state.monthlyStats, monthKey, {
                  smashedDelta: 1,
                  smashedItem: smashItem
                })
              : state.monthlyStats
          };
        });
      },
      smashRecurrent: (id) => {
        const nowISO = new Date().toISOString();
        const monthKey = getMonthKey(nowISO);
        set((state) => {
          let coinsEarned = 0;
          let smashItem: MonthlyItem | null = null;
          const recurrent = state.recurrent.map((item) => {
            if (item.id !== id) {
              return item;
            }
            if (item.activeBugState !== "unlocked") {
              return item;
            }
            coinsEarned = COIN_REWARDS[item.difficulty];
            smashItem = {
              id: item.id,
              title: item.title,
              dateISO: nowISO,
              difficulty: item.difficulty,
              type: "recurrent"
            };
            return {
              ...item,
              activeBugState: null,
              remainingToday: 0,
              lastOutcome: null,
              nextDueDateISO: addIntervalDays(
                item.nextDueDateISO ?? toDateOnly(new Date().toISOString()),
                item.intervalType
              )
            };
          });
          return {
            recurrent,
            coins: state.coins + coinsEarned,
            monthlyStats: smashItem
              ? updateMonthlyStats(state.monthlyStats, monthKey, {
                  smashedDelta: 1,
                  smashedItem: smashItem
                })
              : state.monthlyStats
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
          if (state.lastAction.type === "todo") {
            const {
              itemId,
              prevTodo,
              prevCoins,
              prevInfestation,
              prevMonthlyStats
            } = state.lastAction;
            return {
              todos: state.todos.map((todo) =>
                todo.id === itemId ? prevTodo : todo
              ),
              coins: prevCoins,
              infestation: prevInfestation,
              monthlyStats: prevMonthlyStats,
              lastAction: null
            };
          }
          const {
            itemId,
            prevRecurrent,
            prevCoins,
            prevInfestation,
            prevMonthlyStats
          } = state.lastAction;
          return {
            recurrent: state.recurrent.map((item) =>
              item.id === itemId ? prevRecurrent : item
            ),
            coins: prevCoins,
            infestation: prevInfestation,
            monthlyStats: prevMonthlyStats,
            lastAction: null
          };
        });
      },
      clearLastAction: () => {
        set({ lastAction: null });
      },
      failTodo: (id) => {
        const nowISO = new Date().toISOString();
        const monthKey = getMonthKey(nowISO);
        set((state) => {
          let failWeight = 0;
          let prevTodo: Todo | null = null;
          let missedItem: MonthlyItem | null = null;
          const todos = state.todos.map((todo) => {
            if (todo.id !== id) {
              return todo;
            }
            prevTodo = todo;
            failWeight = FAIL_WEIGHTS[todo.difficulty];
            missedItem = {
              id: todo.id,
              title: todo.title,
              dateISO: nowISO,
              difficulty: todo.difficulty,
              type: "todo"
            };
            return { ...todo, lastOutcome: "minus" };
          });
          return {
            todos,
            infestation: Math.min(10, state.infestation + failWeight),
            monthlyStats: missedItem
              ? updateMonthlyStats(state.monthlyStats, monthKey, {
                  missedDelta: 1,
                  smashedDelta: -1,
                  missedItem: missedItem
                })
              : state.monthlyStats,
            lastAction: prevTodo
              ? {
                  type: "todo",
                  itemId: id,
                  prevTodo,
                  prevCoins: state.coins,
                  prevInfestation: state.infestation,
                  prevMonthlyStats: state.monthlyStats,
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
        if (!state) {
          return;
        }
        const legacyProgress = (state as unknown as { monthlyProgress?: Record<string, number> })
          .monthlyProgress;
        if (legacyProgress && Object.keys(legacyProgress).length > 0) {
          const migrated: MonthlyStatsMap = {};
          Object.entries(legacyProgress).forEach(([key, value]) => {
            migrated[key] = {
              smashedCount: value,
              missedCount: 0,
              smashedItems: [],
              missedItems: []
            };
          });
          (state as { monthlyStats?: MonthlyStatsMap }).monthlyStats = migrated;
        }
        state.setLoading(false);
        state.clearRecentlyDeleted();
        state.clearLastAction();
      }
    }
  )
);

export { getMonthKey };
