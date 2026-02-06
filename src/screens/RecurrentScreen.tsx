import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import * as Haptics from "expo-haptics";
import { useBugBiteStore } from "../state/store";
import { playSfx } from "../state/sfx";
import type { Difficulty, Habit, IntervalType } from "../state/types";
import { theme } from "../theme";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "boss"];
const INTERVALS: IntervalType[] = ["weekly", "biweekly", "monthly"];

const difficultyLabel = (difficulty: Difficulty) =>
  difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

const intervalLabel = (interval: IntervalType) =>
  interval.charAt(0).toUpperCase() + interval.slice(1);

const badgeStyle = (difficulty: Difficulty) => {
  switch (difficulty) {
    case "medium":
      return styles.badgeMedium;
    case "hard":
      return styles.badgeHard;
    case "boss":
      return styles.badgeBoss;
    default:
      return styles.badgeEasy;
  }
};

const Popup = ({
  text,
  tone = "accent",
  onDone
}: {
  text: string;
  tone?: "accent" | "alt";
  onDone: () => void;
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true
      }),
      Animated.timing(anim, {
        toValue: 0,
        duration: 300,
        delay: 400,
        useNativeDriver: true
      })
    ]).start(onDone);
  }, [anim, onDone]);

  return (
    <Animated.View
      style={[
        styles.popup,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -12]
              })
            }
          ]
        }
      ]}
    >
      <Text
        style={[
          styles.popupText,
          tone === "alt" ? styles.popupTextAlt : styles.popupTextAccent
        ]}
      >
        {text}
      </Text>
    </Animated.View>
  );
};

const HabitRow = ({
  item,
  onFail,
  onComplete,
  onSmash
}: {
  item: Habit;
  onFail: () => void;
  onComplete: () => void;
  onSmash: () => void;
}) => {
  const status =
    item.activeBugState === null
      ? "Not due"
      : item.activeBugState === "locked"
        ? "Locked"
        : "Unlocked";
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const tintAnim = useRef(new Animated.Value(0)).current;

  const handleFail = () => {
    onFail();
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true
      }),
      Animated.timing(shakeAnim, {
        toValue: -1,
        duration: 80,
        useNativeDriver: true
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 80,
        useNativeDriver: true
      })
    ]).start();
    Animated.sequence([
      Animated.timing(tintAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: false
      }),
      Animated.timing(tintAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: false
      })
    ]).start();
  };

  const shakeX = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-6, 6]
  });
  const bgColor = tintAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.surface, "#2b141a"]
  });

  return (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: bgColor, transform: [{ translateX: shakeX }] }
      ]}
    >
      <Pressable style={styles.actionButton} onPress={handleFail}>
        <Text style={styles.actionText}>-</Text>
      </Pressable>
      <View style={styles.center}>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={[styles.badge, badgeStyle(item.difficulty)]}>
            <Text style={styles.badgeText}>
              {difficultyLabel(item.difficulty)}
            </Text>
          </View>
        </View>
        <Text style={styles.meta}>
          Next due: {item.nextDueDate} • {intervalLabel(item.intervalType)}
        </Text>
        <Text style={styles.statusText}>Status: {status}</Text>
      </View>
      <View style={styles.actionColumn}>
        {item.activeBugState === "locked" ? (
          <Pressable style={styles.completeButton} onPress={onComplete}>
            <Text style={styles.completeText}>+</Text>
          </Pressable>
        ) : item.activeBugState === "unlocked" ? (
          <Pressable style={styles.smashButton} onPress={onSmash}>
            <Text style={styles.smashText}>SMASH</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
};

export function RecurrentScreen() {
  const habits = useBugBiteStore((state) => state.recurrent);
  const addRecurrent = useBugBiteStore((state) => state.addRecurrent);
  const spawnDueRecurrentBugs = useBugBiteStore(
    (state) => state.spawnDueRecurrentBugs
  );
  const completeRecurrent = useBugBiteStore((state) => state.completeRecurrent);
  const smashRecurrent = useBugBiteStore((state) => state.smashRecurrent);
  const failItem = useBugBiteStore((state) => state.failItem);
  const soundOn = useBugBiteStore((state) => state.settings.soundOn);

  const popupIdRef = useRef(0);
  const [popups, setPopups] = useState<
    { id: number; text: string; tone?: "accent" | "alt" }[]
  >([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [intervalType, setIntervalType] = useState<IntervalType>("weekly");

  useEffect(() => {
    spawnDueRecurrentBugs(new Date().toISOString().slice(0, 10));
  }, [spawnDueRecurrentBugs]);

  const sortedHabits = useMemo(
    () => [...habits].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)),
    [habits]
  );

  const handleCreate = () => {
    if (!title.trim()) {
      return;
    }
    addRecurrent(title.trim(), difficulty, intervalType);
    setTitle("");
    setDifficulty("easy");
    setIntervalType("weekly");
    setModalVisible(false);
  };

  const showSmashPopups = (coins: number) => {
    const popupId = popupIdRef.current + 1;
    popupIdRef.current = popupId;
    setPopups((current) => [
      ...current,
      { id: popupId, text: `+${coins} coins`, tone: "accent" },
      { id: popupId + 1, text: "+1 feed", tone: "alt" }
    ]);
    popupIdRef.current += 1;
  };

  const handleSmash = (id: string) => {
    smashRecurrent(id);
    const { smashLog } = useBugBiteStore.getState();
    const event = [...smashLog].reverse().find((item) => item.sourceId === id);
    const coins = event?.coinsEarned ?? 0;
    showSmashPopups(coins);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playSfx("smash", soundOn);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Recurrent</Text>
          <Text style={styles.subtitle}>
            Build habits and swat bugs on repeat.
          </Text>
        </View>
        <Pressable
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>Add Habit</Text>
        </Pressable>
      </View>

      <FlatList
        data={sortedHabits}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No habits yet.</Text>
            <Text style={styles.emptySubtitle}>
              Add a recurring bug to start the loop.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <HabitRow
            item={item}
            onFail={() => failItem("recurrent", item.id)}
            onComplete={() => completeRecurrent(item.id)}
            onSmash={() => handleSmash(item.id)}
          />
        )}
      />

      <Modal transparent animationType="slide" visible={modalVisible}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Habit</Text>
            <TextInput
              style={styles.input}
              placeholder="Habit title"
              placeholderTextColor={theme.colors.muted}
              value={title}
              onChangeText={setTitle}
            />
            <Text style={styles.modalLabel}>Difficulty</Text>
            <View style={styles.pickerRow}>
              {DIFFICULTIES.map((level) => {
                const isActive = level === difficulty;
                return (
                  <Pressable
                    key={level}
                    style={[
                      styles.pickerButton,
                      isActive && styles.pickerButtonActive
                    ]}
                    onPress={() => setDifficulty(level)}
                  >
                    <Text
                      style={[
                        styles.pickerText,
                        isActive && styles.pickerTextActive
                      ]}
                    >
                      {difficultyLabel(level)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.modalLabel}>Interval</Text>
            <View style={styles.pickerRow}>
              {INTERVALS.map((interval) => {
                const isActive = interval === intervalType;
                return (
                  <Pressable
                    key={interval}
                    style={[
                      styles.pickerButton,
                      isActive && styles.pickerButtonActive
                    ]}
                    onPress={() => setIntervalType(interval)}
                  >
                    <Text
                      style={[
                        styles.pickerText,
                        isActive && styles.pickerTextActive
                      ]}
                    >
                      {intervalLabel(interval)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalSecondary}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalPrimary} onPress={handleCreate}>
                <Text style={styles.modalPrimaryText}>Create</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <View pointerEvents="none" style={styles.popupLayer}>
        {popups.map((popup) => (
          <Popup
            key={popup.id}
            text={popup.text}
            tone={popup.tone}
            onDone={() =>
              setPopups((current) =>
                current.filter((item) => item.id !== popup.id)
              )
            }
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md
  },
  title: {
    color: theme.colors.accentAlt,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: theme.spacing.sm
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 16,
    textAlign: "center"
  },
  addButton: {
    backgroundColor: theme.colors.accentAlt,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md
  },
  addButtonText: {
    color: theme.colors.text,
    fontWeight: "600"
  },
  listContent: {
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.sm
  },
  popupLayer: {
    position: "absolute",
    top: 120,
    right: 24,
    gap: theme.spacing.xs
  },
  popup: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    backgroundColor: "#1f2a36"
  },
  popupText: {
    fontSize: 12,
    fontWeight: "700"
  },
  popupTextAccent: {
    color: theme.colors.accent
  },
  popupTextAlt: {
    color: theme.colors.accentAlt
  },
  emptyState: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.md,
    alignItems: "center"
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "600"
  },
  emptySubtitle: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: theme.spacing.xs,
    textAlign: "center"
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f2a36"
  },
  actionText: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700"
  },
  completeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.accentAlt
  },
  completeText: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700"
  },
  smashButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent
  },
  smashText: {
    color: "#04110a",
    fontWeight: "800",
    letterSpacing: 1
  },
  actionColumn: {
    alignItems: "center",
    justifyContent: "center"
  },
  center: {
    flex: 1
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600"
  },
  badge: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.radius.sm
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    color: theme.colors.text
  },
  badgeEasy: {
    backgroundColor: "#2c3a49"
  },
  badgeMedium: {
    backgroundColor: "#245a4b",
    shadowColor: theme.colors.accent,
    shadowOpacity: 0.6,
    shadowRadius: 6
  },
  badgeHard: {
    backgroundColor: "#3b2b4a",
    borderWidth: 1,
    borderColor: theme.colors.accentAlt
  },
  badgeBoss: {
    backgroundColor: "#4a2b2b",
    borderWidth: 1,
    borderColor: theme.colors.danger
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: theme.spacing.xs
  },
  statusText: {
    color: theme.colors.text,
    fontSize: 12,
    marginTop: theme.spacing.xs
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: theme.spacing.lg
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.md
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: theme.spacing.sm
  },
  modalLabel: {
    color: theme.colors.muted,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs
  },
  input: {
    backgroundColor: "#10151c",
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text
  },
  pickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  pickerButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    backgroundColor: "#1f2a36"
  },
  pickerButtonActive: {
    backgroundColor: theme.colors.accentAlt
  },
  pickerText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "600"
  },
  pickerTextActive: {
    color: "#f1ecff"
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md
  },
  modalSecondary: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  modalSecondaryText: {
    color: theme.colors.muted,
    fontWeight: "600"
  },
  modalPrimary: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accent
  },
  modalPrimaryText: {
    color: "#04110a",
    fontWeight: "700"
  }
});
