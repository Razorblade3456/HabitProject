import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { useBugBiteStore } from "../state/store";
import { playSfx } from "../state/sfx";
import { theme } from "../theme";

const Button = ({
  label,
  onPress
}: {
  label: string;
  onPress: () => void;
}) => (
  <Pressable style={styles.button} onPress={onPress}>
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>
);

export function DebugPanel() {
  const {
    todos,
    recurrent,
    infestation,
    coins,
    monthlyStats,
    smashLog,
    settings,
    warning,
    addTodo,
    unlockTodo,
    smashTodo,
    addRecurrent,
    spawnDueRecurrentBugs,
    completeRecurrent,
    smashRecurrent,
    failItem,
    buyPoison,
    toggleSound
  } = useBugBiteStore();

  const firstTodo = todos[0];
  const firstHabit = recurrent[0];
  const handleBuyPoison = (size: "small" | "medium" | "large") => {
    buyPoison(size);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playSfx("poison", settings.soundOn);
  };

  return (
    <ScrollView style={styles.wrapper} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Debug Panel</Text>
      <Text style={styles.meta}>Coins: {coins}</Text>
      <Text style={styles.meta}>Infestation: {infestation}</Text>
      <Text style={styles.meta}>Warning: {warning ?? "none"}</Text>
      <Text style={styles.meta}>Sound: {settings.soundOn ? "on" : "off"}</Text>

      <View style={styles.row}>
        <Button
          label="Add Todo"
          onPress={() => addTodo("Sample Task", "easy")}
        />
        <Button
          label="Unlock Todo"
          onPress={() => firstTodo && unlockTodo(firstTodo.id)}
        />
        <Button
          label="Smash Todo"
          onPress={() => firstTodo && smashTodo(firstTodo.id)}
        />
      </View>

      <View style={styles.row}>
        <Button
          label="Add Habit"
          onPress={() => addRecurrent("Weekly Patrol", "medium", "weekly", 1)}
        />
        <Button
          label="Spawn Bugs"
          onPress={() => spawnDueRecurrentBugs(new Date().toISOString().slice(0, 10))}
        />
        <Button
          label="Complete Habit"
          onPress={() => firstHabit && completeRecurrent(firstHabit.id)}
        />
        <Button
          label="Smash Habit"
          onPress={() => firstHabit && smashRecurrent(firstHabit.id)}
        />
      </View>

      <View style={styles.row}>
        <Button
          label="Fail Todo"
          onPress={() => firstTodo && failItem("todo", firstTodo.id)}
        />
        <Button
          label="Fail Habit"
          onPress={() => firstHabit && failItem("recurrent", firstHabit.id)}
        />
        <Button label="Buy Small" onPress={() => handleBuyPoison("small")} />
        <Button label="Toggle Sound" onPress={toggleSound} />
      </View>

      <Text style={styles.section}>Monthly Stats</Text>
      <Text style={styles.json}>{JSON.stringify(monthlyStats, null, 2)}</Text>
      <Text style={styles.section}>Smash Log (last {smashLog.length})</Text>
      <Text style={styles.json}>
        {JSON.stringify(smashLog.slice(-5), null, 2)}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.accent
  },
  meta: {
    color: theme.colors.text,
    fontSize: 14
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  button: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: "#1f2a36"
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: 12
  },
  section: {
    marginTop: theme.spacing.sm,
    color: theme.colors.accentAlt,
    fontWeight: "600"
  },
  json: {
    color: theme.colors.muted,
    fontSize: 12
  }
});
