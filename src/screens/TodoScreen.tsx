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
import type { Difficulty, Task } from "../state/types";
import { theme } from "../theme";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "boss"];

const BUG_SCALE: Record<Difficulty, number> = {
  easy: 0.9,
  medium: 1.1,
  hard: 1.3,
  boss: 1.6
};

const difficultyLabel = (difficulty: Difficulty) =>
  difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

const difficultyStyle = (difficulty: Difficulty) => {
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

const bugStyle = (difficulty: Difficulty) => {
  switch (difficulty) {
    case "medium":
      return styles.bugGlow;
    case "hard":
      return styles.bugSpikes;
    case "boss":
      return styles.bugBoss;
    default:
      return styles.bugEasy;
  }
};

const SmashButton = ({
  onSmash
}: {
  onSmash: () => void;
}) => {
  const scale = useState(() => new Animated.Value(1))[0];

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 120,
        useNativeDriver: true
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true
      })
    ]).start(() => {
      onSmash();
    });
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable style={styles.smashButton} onPress={handlePress}>
        <Text style={styles.smashText}>SMASH</Text>
      </Pressable>
    </Animated.View>
  );
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

const TodoRow = ({
  item,
  onFail,
  onUnlock,
  onSmash
}: {
  item: Task;
  onFail: () => void;
  onUnlock: () => void;
  onSmash: () => void;
}) => {
  const showSmash = item.status === "unlocked";
  const isSmashed = item.status === "smashed";
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
        { backgroundColor: bgColor, transform: [{ translateX: shakeX }] },
        isSmashed && styles.cardSmashed
      ]}
    >
      <Pressable style={styles.actionButton} onPress={handleFail}>
        <Text style={styles.actionText}>-</Text>
      </Pressable>
      <View style={styles.center}>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={[styles.badge, difficultyStyle(item.difficulty)]}>
            <Text style={styles.badgeText}>
              {difficultyLabel(item.difficulty)}
            </Text>
          </View>
        </View>
        <View style={styles.bugRow}>
          <View
            style={[
              styles.bug,
              bugStyle(item.difficulty),
              { transform: [{ scale: BUG_SCALE[item.difficulty] }] }
            ]}
          >
            <Text style={styles.bugEmoji}>🐛</Text>
            {item.difficulty === "boss" ? (
              <Text style={styles.bugCrown}>👑</Text>
            ) : null}
          </View>
          <Text style={styles.bugHint}>
            {isSmashed ? "Smashed!" : "Awaiting strike"}
          </Text>
        </View>
      </View>
      <View style={styles.actionColumn}>
        {showSmash ? (
          <SmashButton onSmash={onSmash} />
        ) : (
          <Pressable
            style={[
              styles.actionButton,
              isSmashed && styles.actionButtonDisabled
            ]}
            onPress={onUnlock}
            disabled={isSmashed}
          >
            <Text style={styles.actionText}>+</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
};

export function TodoScreen() {
  const todos = useBugBiteStore((state) => state.todos);
  const addTodo = useBugBiteStore((state) => state.addTodo);
  const unlockTodo = useBugBiteStore((state) => state.unlockTodo);
  const smashTodo = useBugBiteStore((state) => state.smashTodo);
  const failItem = useBugBiteStore((state) => state.failItem);
  const soundOn = useBugBiteStore((state) => state.settings.soundOn);

  const popupIdRef = useRef(0);
  const [popups, setPopups] = useState<
    { id: number; text: string; tone?: "accent" | "alt" }[]
  >([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  const sortedTodos = useMemo(
    () =>
      [...todos].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [todos]
  );

  const handleCreate = () => {
    if (!title.trim()) {
      return;
    }
    addTodo(title.trim(), difficulty);
    setTitle("");
    setDifficulty("easy");
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
    smashTodo(id);
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
          <Text style={styles.title}>To Do</Text>
          <Text style={styles.subtitle}>Track your daily bug targets here.</Text>
        </View>
        <Pressable
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>Add To Do</Text>
        </Pressable>
      </View>

      <FlatList
        data={sortedTodos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No bugs yet.</Text>
            <Text style={styles.emptySubtitle}>
              Add your first target to start smashing.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TodoRow
            item={item}
            onFail={() => failItem("todo", item.id)}
            onUnlock={() => unlockTodo(item.id)}
            onSmash={() => handleSmash(item.id)}
          />
        )}
      />

      <Modal transparent animationType="slide" visible={modalVisible}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New To Do</Text>
            <TextInput
              style={styles.input}
              placeholder="Bug title"
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
    alignItems: "center",
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
    color: theme.colors.accent,
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
  cardSmashed: {
    opacity: 0.6
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f2a36"
  },
  actionButtonDisabled: {
    backgroundColor: "#1a2028"
  },
  actionText: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700"
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
  bugRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.xs,
    gap: theme.spacing.sm
  },
  bug: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10151c"
  },
  bugEmoji: {
    fontSize: 20
  },
  bugEasy: {},
  bugGlow: {
    shadowColor: theme.colors.accent,
    shadowOpacity: 0.9,
    shadowRadius: 8
  },
  bugSpikes: {
    borderWidth: 1,
    borderColor: theme.colors.accentAlt
  },
  bugBoss: {
    borderWidth: 1,
    borderColor: theme.colors.danger,
    shadowColor: theme.colors.danger,
    shadowOpacity: 0.6,
    shadowRadius: 10
  },
  bugCrown: {
    position: "absolute",
    top: -10,
    right: -8,
    fontSize: 14
  },
  bugHint: {
    color: theme.colors.muted,
    fontSize: 12
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
