import type { Difficulty } from "../state/types";

export const getDifficultyColor = (difficulty: Difficulty) => {
  switch (difficulty) {
    case "medium":
      return "#2bb3b1";
    case "hard":
      return "#7b4fe3";
    case "boss":
      return "#d1a649";
    default:
      return "#4caf50";
  }
};
