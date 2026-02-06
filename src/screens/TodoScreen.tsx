import { useMemo, useRef, useState } from "react";
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
import { theme } from "../theme";
import { useBugBiteStore } from "../state/store";
import type { Difficulty, Todo } from "../state/types";

export const TodoScreen = () => {
  const loading = useBugBiteStore((state) => state.loading);
  const todos = useBugBiteStore((state) => state.todos);
  const addTodo = useBugBiteStore((state) => state.addTodo);
  const failTodo = useBugBiteStore((state) => state.failTodo);
  const unlockTodo = useBugBiteStore((state) => state.unlockTodo);
  const smashTodo = useBugBiteStore((state) => state.smashTodo);
  const updateTodo = useBugBiteStore((state) => state.updateTodo);
  const deleteTodo = useBugBiteStore((state) => state.deleteTodo);
  const coins = useBugBiteStore((state) => state.coins);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Todo | null>(null);
  const [lastActionById, setLastActionById] = useState<
    Record<string, "plus" | "minus">
  >({});
  const actionOpacityMap = useRef(new Map<string, Animated.Value>()).current;
  const [popupText, setPopupText] = useState<string | null>(null);
  const popupOpacity = useRef(new Animated.Value(0)).current;

  const canCreate = title.trim().length > 0;

  const orderedTodos = useMemo(() => todos, [todos]);

  const handleOpenModal = () => {
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setTitle("");
    setDifficulty("easy");
    setEditingTodo(null);
  };

  const handleOpenEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setTitle(todo.title);
    setDifficulty(todo.difficulty);
    setIsModalVisible(true);
  };

  const handleSave = () => {
    if (!canCreate) {
      return;
    }
    if (editingTodo) {
      updateTodo(editingTodo.id, { title: title.trim(), difficulty });
    } else {
      addTodo(title.trim(), difficulty);
    }
    handleCloseModal();
  };

  const triggerActionChip = (id: string, action: "plus" | "minus") => {
    setLastActionById((current) => ({ ...current, [id]: action }));
    const opacity = actionOpacityMap.get(id) ?? new Animated.Value(0);
    if (!actionOpacityMap.has(id)) {
      actionOpacityMap.set(id, opacity);
    }
    opacity.setValue(1);
    Animated.sequence([
      Animated.delay(1400),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true
      })
    ]).start(() => {
      setLastActionById((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    });
  };

  const showPopup = (text: string) => {
    setPopupText(text);
    popupOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(popupOpacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true
      }),
      Animated.timing(popupOpacity, {
        toValue: 0,
        duration: 400,
        delay: 500,
        useNativeDriver: true
      })
    ]).start(() => {
      setPopupText(null);
    });
  };

  const coinReward = (level: Difficulty) => {
    switch (level) {
      case "medium":
        return 2;
      case "hard":
        return 3;
      case "boss":
        return 5;
      default:
        return 1;
    }
  };

  const difficultyLabel = (value: Difficulty) =>
    value.charAt(0).toUpperCase() + value.slice(1);

  const bugScale = (level: Difficulty) => {
    switch (level) {
      case "medium":
        return 1.15;
      case "hard":
        return 1.35;
      case "boss":
        return 1.6;
      default:
        return 0.9;
    }
  };

  const renderTodo = ({ item }: { item: Todo }) => {
    const isUnlockDisabled = item.status !== "locked";
    const isSmashable = item.status === "unlocked";
    const isSmashed = item.status === "smashed";
    const isMedium = item.difficulty === "medium";
    const isHard = item.difficulty === "hard";
    const isBoss = item.difficulty === "boss";
    return (
      <View style={styles.card}>
        <Pressable
          style={styles.failButton}
          onPress={() => {
            failTodo(item.id);
            triggerActionChip(item.id, "minus");
          }}
        >
          <Text style={styles.failButtonText}>-</Text>
        </Pressable>
        <View
          style={[
            styles.bugWrapper,
            isMedium && styles.bugGlow,
            isHard && styles.bugSpikes
          ]}
        >
          <Text
            style={[
              styles.bugText,
              { transform: [{ scale: bugScale(item.difficulty) }] }
            ]}
          >
            🐛
          </Text>
          {isBoss && <Text style={styles.bugCrown}>👑</Text>}
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <View style={styles.actionRow}>
              <Pressable
                style={styles.iconButton}
                onPress={() => handleOpenEdit(item)}
              >
                <Text style={styles.iconText}>✏️</Text>
              </Pressable>
              <Pressable
                style={styles.iconButton}
                onPress={() => setDeleteTarget(item)}
              >
                <Text style={styles.iconText}>🗑️</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {difficultyLabel(item.difficulty)}
              </Text>
            </View>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          {lastActionById[item.id] && (
            <Animated.View
              style={[
                styles.actionChip,
                lastActionById[item.id] === "plus"
                  ? styles.actionChipPlus
                  : styles.actionChipMinus,
                { opacity: actionOpacityMap.get(item.id) ?? 0 }
              ]}
            >
              <Text style={styles.actionChipText}>
                {lastActionById[item.id] === "plus"
                  ? "Logged ✅"
                  : "Missed ⚠️"}
              </Text>
            </Animated.View>
          )}
          {isSmashable && (
            <Pressable
              style={styles.smashButton}
              onPress={() => {
                smashTodo(item.id);
                showPopup(`+${coinReward(item.difficulty)} coins`);
              }}
            >
              <Text style={styles.smashButtonText}>SMASH</Text>
            </Pressable>
          )}
          {isSmashed && <Text style={styles.smashedText}>Smashed ✅</Text>}
        </View>
        <Pressable
          style={[styles.unlockButton, isUnlockDisabled && styles.buttonDisabled]}
          onPress={() => {
            unlockTodo(item.id);
            triggerActionChip(item.id, "plus");
          }}
          disabled={isUnlockDisabled}
        >
          <Text style={styles.unlockButtonText}>+</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>To Do</Text>
        <Pressable style={styles.addButton} onPress={handleOpenModal}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </Pressable>
      </View>
      <Text style={styles.coinsText}>Coins: {coins}</Text>
      {loading ? (
        <Text style={styles.subtitle}>Loading tasks...</Text>
      ) : (
        <Text style={styles.subtitle}>
          Coming next: add / smash loop ({todos.length} tasks)
        </Text>
      )}
      <FlatList
        data={orderedTodos}
        keyExtractor={(item) => item.id}
        renderItem={renderTodo}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      <Modal
        animationType="slide"
        transparent
        visible={isModalVisible}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingTodo ? "Edit To Do" : "New To Do"}
            </Text>
            <TextInput
              placeholder="Enter title"
              placeholderTextColor={theme.colors.muted}
              style={styles.input}
              value={title}
              onChangeText={setTitle}
            />
            <Text style={styles.modalLabel}>Difficulty</Text>
            <View style={styles.difficultyRow}>
              {(["easy", "medium", "hard", "boss"] as Difficulty[]).map(
                (level) => (
                  <Pressable
                    key={level}
                    style={[
                      styles.difficultyButton,
                      difficulty === level && styles.difficultyButtonActive
                    ]}
                    onPress={() => setDifficulty(level)}
                  >
                    <Text
                      style={[
                        styles.difficultyButtonText,
                        difficulty === level &&
                          styles.difficultyButtonTextActive
                      ]}
                    >
                      {difficultyLabel(level)}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={handleCloseModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.createButton,
                  !canCreate && styles.createButtonDisabled
                ]}
                onPress={handleSave}
                disabled={!canCreate}
              >
                <Text style={styles.createButtonText}>
                  {editingTodo ? "Save" : "Create"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="fade"
        transparent
        visible={deleteTarget !== null}
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.modalTitle}>Delete To Do?</Text>
            <Text style={styles.modalBody}>
              This will remove "{deleteTarget?.title}" immediately.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setDeleteTarget(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.deleteButton}
                onPress={() => {
                  if (deleteTarget) {
                    deleteTodo(deleteTarget.id);
                  }
                  setDeleteTarget(null);
                }}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {popupText && (
        <Animated.View style={[styles.popup, { opacity: popupOpacity }]}>
          <Text style={styles.popupText}>{popupText}</Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: theme.spacing.xs
  },
  coinsText: {
    color: theme.colors.accent,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: theme.spacing.xs
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 16,
    marginBottom: theme.spacing.md
  },
  addButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.sm
  },
  addButtonText: {
    color: "#0b0f14",
    fontSize: 16,
    fontWeight: "700"
  },
  listContent: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.lg
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  bugWrapper: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#0f151c"
  },
  bugText: {
    fontSize: 20
  },
  bugGlow: {
    shadowColor: theme.colors.accent,
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 }
  },
  bugSpikes: {
    borderWidth: 1,
    borderColor: theme.colors.accentAlt
  },
  bugCrown: {
    position: "absolute",
    top: -6,
    right: -2,
    fontSize: 14
  },
  cardContent: {
    flex: 1,
    gap: theme.spacing.xs
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
    flex: 1
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1f2a36",
    alignItems: "center",
    justifyContent: "center"
  },
  iconText: {
    fontSize: 12
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  smashButton: {
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.sm,
    alignSelf: "flex-start"
  },
  smashButtonText: {
    color: "#0b0f14",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.6
  },
  smashedText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: "600"
  },
  badge: {
    backgroundColor: "rgba(57, 255, 176, 0.18)",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm
  },
  badgeText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: "700"
  },
  statusText: {
    color: theme.colors.muted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  actionChip: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 999
  },
  actionChipPlus: {
    backgroundColor: "rgba(57, 255, 176, 0.18)"
  },
  actionChipMinus: {
    backgroundColor: "rgba(255, 107, 107, 0.18)"
  },
  actionChipText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "600"
  },
  failButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.danger,
    alignItems: "center",
    justifyContent: "center"
  },
  failButtonText: {
    color: "#0b0f14",
    fontSize: 18,
    fontWeight: "700"
  },
  unlockButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center"
  },
  unlockButtonText: {
    color: "#0b0f14",
    fontSize: 18,
    fontWeight: "700"
  },
  buttonDisabled: {
    opacity: 0.4
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    padding: theme.spacing.lg
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: theme.spacing.md
  },
  modalLabel: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs
  },
  input: {
    borderWidth: 1,
    borderColor: "#2b3642",
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
    backgroundColor: "#0f151c"
  },
  difficultyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  difficultyButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: "#2b3642"
  },
  difficultyButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent
  },
  difficultyButtonText: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: "600"
  },
  difficultyButtonTextActive: {
    color: "#0b0f14"
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm
  },
  cancelButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md
  },
  cancelButtonText: {
    color: theme.colors.muted,
    fontSize: 16
  },
  createButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.sm
  },
  createButtonDisabled: {
    opacity: 0.5
  },
  createButtonText: {
    color: "#0b0f14",
    fontSize: 16,
    fontWeight: "700"
  },
  confirmCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg
  },
  modalBody: {
    color: theme.colors.muted,
    fontSize: 14,
    marginBottom: theme.spacing.md
  },
  deleteButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radius.sm
  },
  deleteButtonText: {
    color: "#0b0f14",
    fontSize: 16,
    fontWeight: "700"
  },
  popup: {
    position: "absolute",
    bottom: theme.spacing.lg,
    alignSelf: "center",
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: "#2b3642"
  },
  popupText: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: "700"
  }
});
