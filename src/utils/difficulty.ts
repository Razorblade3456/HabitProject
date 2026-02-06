import type { Difficulty } from "../state/types";

export const getDifficultyColor = (difficulty: Difficulty) => {
  switch (difficulty) {
    case "medium":
      return "#2DD4BF";
    case "hard":
      return "#8B5CF6";
    case "boss":
      return "#FBBF24";
    default:
      return "#34C759";
  }
};

export const getDifficultyBorderColor = (difficulty: Difficulty) => {
  switch (difficulty) {
    case "medium":
      return "#23B5A2";
    case "hard":
      return "#7043D6";
    case "boss":
      return "#D99A1B";
    default:
      return "#2EA84A";
  }
};

const buildDifficultyStyle = (color: string, glowColor: string) => ({
  color,
  glowColor,
  borderColor: color,
  shadowStyle: {
    shadowColor: glowColor,
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 }
  }
});

export const getDifficultyStyle = (difficulty: Difficulty) => {
  switch (difficulty) {
    case "medium":
      return buildDifficultyStyle("#2bb3b1", "rgba(43, 179, 177, 0.6)");
    case "hard":
      return buildDifficultyStyle("#7b4fe3", "rgba(123, 79, 227, 0.6)");
    case "boss":
      return buildDifficultyStyle("#d1a649", "rgba(209, 166, 73, 0.6)");
    default:
      return buildDifficultyStyle("#4caf50", "rgba(76, 175, 80, 0.6)");
  }
};
