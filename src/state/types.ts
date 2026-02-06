export type Difficulty = "easy" | "medium" | "hard" | "boss";

export type TodoStatus = "locked" | "unlocked" | "smashed";

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type Todo = {
  id: string;
  title: string;
  difficulty: Difficulty;
  status: TodoStatus;
  createdAtISO: string;
  note?: string;
  checklist?: ChecklistItem[];
};

export type IntervalType = "daily" | "weekly" | "monthly";

export type ActiveBugState = "locked" | "unlocked";

export type Recurrent = {
  id: string;
  title: string;
  difficulty: Difficulty;
  intervalType: IntervalType;
  timesPerDay: number;
  remainingToday: number;
  lastSpawnDateISO: string | null;
  nextDueDateISO: string;
  activeBugState: ActiveBugState | null;
  createdAtISO: string;
  note?: string;
  checklist?: ChecklistItem[];
};
