export type Difficulty = "easy" | "medium" | "hard" | "boss";

export type TaskStatus = "locked" | "unlocked" | "smashed";

export type Task = {
  id: string;
  title: string;
  difficulty: Difficulty;
  createdAt: string;
  status: TaskStatus;
};

export type IntervalType = "weekly" | "biweekly" | "monthly";

export type Habit = {
  id: string;
  title: string;
  difficulty: Difficulty;
  intervalType: IntervalType;
  nextDueDate: string;
  activeBugState: null | "locked" | "unlocked";
  lastCompletedDate?: string | null;
};

export type SmashSourceType = "todo" | "recurrent";

export type SmashEvent = {
  id: string;
  sourceType: SmashSourceType;
  sourceId: string;
  dateISO: string;
  monthKey: string;
  coinsEarned: number;
};
