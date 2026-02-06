export type Difficulty = "easy" | "medium" | "hard" | "boss";

export type TodoStatus = "locked" | "unlocked" | "smashed";

export type Todo = {
  id: string;
  title: string;
  difficulty: Difficulty;
  status: TodoStatus;
  createdAtISO: string;
};

export type RecurrentCadence = "daily" | "weekly" | "monthly";

export type ActiveBugState = "locked" | "unlocked";

export type Recurrent = {
  id: string;
  title: string;
  difficulty: Difficulty;
  cadence: RecurrentCadence;
  activeBugState: ActiveBugState | null;
  createdAtISO: string;
};
