export type Difficulty = "easy" | "medium" | "hard" | "boss";

export type TodoStatus = "locked" | "unlocked" | "smashed";

export type Todo = {
  id: string;
  title: string;
  difficulty: Difficulty;
  status: TodoStatus;
  createdAtISO: string;
};
