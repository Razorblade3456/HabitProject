import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";
import { useBugBiteStore } from "../state/store";

export const TodoScreen = () => {
  const loading = useBugBiteStore((state) => state.loading);
  const todos = useBugBiteStore((state) => state.todos);
  const addTodo = useBugBiteStore((state) => state.addTodo);

  const handleAddDebug = () => {
    addTodo("Sample task", "easy");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>To Do</Text>
      {loading ? (
        <Text style={styles.subtitle}>Loading tasks...</Text>
      ) : (
        <Text style={styles.subtitle}>
          Coming next: add / smash loop ({todos.length} tasks)
        </Text>
      )}
      <Pressable style={styles.debugButton} onPress={handleAddDebug}>
        <Text style={styles.debugButtonText}>Debug: Add sample todo</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: theme.spacing.sm
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 16
  },
  debugButton: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accent
  },
  debugButtonText: {
    color: "#0b0f14",
    fontSize: 14,
    fontWeight: "700"
  }
});
