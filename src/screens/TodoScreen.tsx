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
import type { ChecklistItem, Difficulty, Todo } from "../state/types";
import { getDifficultyStyle } from "../utils/difficulty";

export const TodoScreen = () => {
  const loading = useBugBiteStore((state) => state.loading);
  const todos = useBugBiteStore((state) => state.todos);
  const addTodo = useBugBiteStore((state) => state.addTodo);
  const failTodo = useBugBiteStore((state) => state.failTodo);
  const unlockTodo = useBugBiteStore((state) => state.unlockTodo);
  const smashTodo = useBugBiteStore((state) => state.smashTodo);
  const updateTodo = useBugBiteStore((state) => state.updateTodo);
  const deleteTodo = useBugBiteStore((state) => state.deleteTodo);
  const recentlyDeleted = useBugBiteStore((state) => state.recentlyDeleted);
  const undoRecentlyDeleted = useBugBiteStore(
    (state) => state.undoRecentlyDeleted
  );
  const lastAction = useBugBiteStore((state) => state.lastAction);
  const undoLastAction = useBugBiteStore((state) => state.undoLastAction);
  const coins = useBugBiteStore((state) => state.coins);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [note, setNote] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [checklistText, setChecklistText] = useState("");
  const [count, setCount] = useState(1);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Todo | null>(null);
  const [lastActionById, setLastActionById] = useState<
    Record<string, "plus" | "minus">
  >({});
  const actionOpacityMap = useRef(new Map<string, Animated.Value>()).current;
  const [popupText, setPopupText] = useState<string | null>(null);
  const popupOpacity = useRef(new Animated.Value(0)).current;

  const canCreate = title.trim().length > 0;
  const lastActionActive =
    lastAction &&
    lastAction.type === "todo" &&
    Date.now() - new Date(lastAction.actionAtISO).getTime() <= 10000;

  const orderedTodos = useMemo(() => todos, [todos]);

  const canUndoAction = (id: string) =>
    Boolean(lastActionActive && lastAction?.itemId === id);

  const undoHandler = (id: string) => {
    if (canUndoAction(id)) {
      undoLastAction();
    }
  };

  const handleOpenModal = () => {
    setEditingTodo(null);
    setTitle("");
    setDifficulty("easy");
    setNote("");
    setChecklist([]);
    setChecklistText("");
    setCount(1);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setTitle("");
    setDifficulty("easy");
    setNote("");
    setChecklist([]);
    setChecklistText("");
    setCount(1);
    setEditingTodo(null);
  };

  const handleOpenEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setTitle(todo.title);
    setDifficulty(todo.difficulty);
    setNote(todo.note ?? "");
    setChecklist(todo.checklist ?? []);
    setChecklistText("");
    setIsModalVisible(true);
  };

  const handleSave = () => {
    if (!canCreate) {
      return;
    }
    if (editingTodo) {
      updateTodo(editingTodo.id, {
        title: title.trim(),
        difficulty,
        note,
        checklist
      });
    } else {
      addTodo(title.trim(), difficulty, {
        count,
        note,
        checklist
      });
    }
    handleCloseModal();
  };

  const addChecklistItem = () => {
    const trimmed = checklistText.trim();
    if (!trimmed) {
      return;
    }
    setChecklist((current) => [
      ...current,
      { id: `${Date.now()}-${Math.random()}`, text: trimmed, done: false }
    ]);
    setChecklistText("");
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist((current) =>
      current.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      )
    );
  };

  const removeChecklistItem = (id: string) => {
    setChecklist((current) => current.filter((item) => item.id !== id));
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
    const isBoss = item.difficulty === "boss";
    const difficultyStyle = getDifficultyStyle(item.difficulty);
    const checklistTotal = item.checklist?.length ?? 0;
    const checklistDone = item.checklist?.filter((entry) => entry.done).length ?? 0;
    const notePreview = item.note?.trim();
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
            styles.bugOuter,
            difficultyStyle.shadowStyle,
            { borderColor: difficultyStyle.borderColor }
          ]}
        >
          <View
            style={[
              styles.bugInner,
              { backgroundColor: difficultyStyle.color }
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
                style={[
                  styles.iconButton,
                  !canUndoAction(item.id) && styles.iconButtonDisabled
                ]}
                onPress={() => undoHandler(item.id)}
                disabled={!canUndoAction(item.id)}
              >
                <Text style={styles.iconText}>↩️</Text>
              </Pressable>
              <Pressable
                style={styles.iconButton}
                onPress={() => setDeleteTarget(item)}
              >
                <Text style={styles.iconText}>🗑️</Text>
              </Pressable>
            </View>
          </View>
          {notePreview && (
            <Text style={styles.notePreview} numberOfLines={1}>
              {notePreview}
            </Text>
          )}
          {checklistTotal > 0 && (
            <Text style={styles.checklistMeta}>
              Checklist: {checklistDone}/{checklistTotal}
            </Text>
          )}
          <View style={styles.metaRow}>
            <View
              style={[styles.badge, { backgroundColor: difficultyStyle.color }]}
            >
              <Text style={styles.badgeText}>
                {difficultyLabel(item.difficulty)}
              </Text>
            </View>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          {item.lastOutcome === "minus" && (
            <View style={[styles.outcomePill, styles.outcomePillMissed]}>
              <Text style={styles.outcomePillText}>MISSED</Text>
            </View>
          )}
          {item.lastOutcome === "plus" && (
            <View style={[styles.outcomePill, styles.outcomePillDone]}>
              <Text style={styles.outcomePillText}>DONE</Text>
            </View>
          )}
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
      <Text style={styles.legendLabel}>Difficulty Legend</Text>
      <View style={styles.legendRow}>
        {(["easy", "medium", "hard", "boss"] as Difficulty[]).map((level) => (
          <View key={level} style={styles.legendItem}>
            <View
              style={[
                styles.legendSwatch,
                { backgroundColor: getDifficultyStyle(level).color }
              ]}
            />
            <Text style={styles.legendText}>{difficultyLabel(level)}</Text>
          </View>
        ))}
      </View>
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
            {!editingTodo && (
              <>
                <Text style={styles.modalLabel}>Count</Text>
                <View style={styles.stepperRow}>
                  <Pressable
                    style={styles.stepperButton}
                    onPress={() => setCount((value) => Math.max(1, value - 1))}
                  >
                    <Text style={styles.stepperText}>-</Text>
                  </Pressable>
                  <Text style={styles.stepperValue}>{count}</Text>
                  <Pressable
                    style={styles.stepperButton}
                    onPress={() => setCount((value) => Math.min(10, value + 1))}
                  >
                    <Text style={styles.stepperText}>+</Text>
                  </Pressable>
                </View>
              </>
            )}
            <Text style={styles.modalLabel}>Notes</Text>
            <TextInput
              placeholder="Optional notes"
              placeholderTextColor={theme.colors.muted}
              style={[styles.input, styles.notesInput]}
              multiline
              value={note}
              onChangeText={setNote}
            />
            <Text style={styles.modalLabel}>Checklist</Text>
            <View style={styles.checklistRow}>
              <TextInput
                placeholder="Checklist item"
                placeholderTextColor={theme.colors.muted}
                style={[styles.input, styles.checklistInput]}
                value={checklistText}
                onChangeText={setChecklistText}
              />
              <Pressable style={styles.addChecklistButton} onPress={addChecklistItem}>
                <Text style={styles.addChecklistText}>Add</Text>
              </Pressable>
            </View>
            {checklist.length > 0 && (
              <View style={styles.checklistList}>
                {checklist.map((item) => (
                  <View key={item.id} style={styles.checklistItem}>
                    <Pressable
                      style={[
                        styles.checkbox,
                        item.done && styles.checkboxChecked
                      ]}
                      onPress={() => toggleChecklistItem(item.id)}
                    >
                      <Text style={styles.checkboxText}>
                        {item.done ? "✓" : ""}
                      </Text>
                    </Pressable>
                    <Text style={styles.checklistItemText}>{item.text}</Text>
                    <Pressable
                      style={styles.checklistDelete}
                      onPress={() => removeChecklistItem(item.id)}
                    >
                      <Text style={styles.checklistDeleteText}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
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
      {recentlyDeleted?.type === "todo" && (
        <View style={styles.undoBanner}>
          <Text style={styles.undoBannerText}>Deleted. Undo?</Text>
          <Pressable style={styles.undoBannerButton} onPress={undoRecentlyDeleted}>
            <Text style={styles.undoBannerButtonText}>Undo</Text>
          </Pressable>
        </View>
      )}
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
  legendLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    marginBottom: theme.spacing.xs
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 999
  },
  legendText: {
    color: theme.colors.muted,
    fontSize: 12
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
  bugOuter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center"
  },
  bugInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  bugText: {
    fontSize: 20
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
  notePreview: {
    color: theme.colors.muted,
    fontSize: 12
  },
  checklistMeta: {
    color: theme.colors.muted,
    fontSize: 12
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
  iconButtonDisabled: {
    opacity: 0.4
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
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700"
  },
  statusText: {
    color: theme.colors.muted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  outcomePill: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 999
  },
  outcomePillMissed: {
    backgroundColor: "rgba(255, 107, 107, 0.25)"
  },
  outcomePillDone: {
    backgroundColor: "rgba(76, 175, 80, 0.25)"
  },
  outcomePillText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6
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
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f2a36"
  },
  stepperText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700"
  },
  stepperValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
    minWidth: 24,
    textAlign: "center"
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: "top"
  },
  checklistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  checklistInput: {
    flex: 1
  },
  addChecklistButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.sm
  },
  addChecklistText: {
    color: "#0b0f14",
    fontSize: 12,
    fontWeight: "700"
  },
  checklistList: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#2b3642",
    alignItems: "center",
    justifyContent: "center"
  },
  checkboxChecked: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent
  },
  checkboxText: {
    color: "#0b0f14",
    fontSize: 12,
    fontWeight: "700"
  },
  checklistItemText: {
    color: theme.colors.text,
    fontSize: 13,
    flex: 1
  },
  checklistDelete: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  checklistDeleteText: {
    color: theme.colors.muted,
    fontSize: 12
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
  undoBanner: {
    position: "absolute",
    bottom: theme.spacing.lg,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#2b3642"
  },
  undoBannerText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "600"
  },
  undoBannerButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.sm
  },
  undoBannerButtonText: {
    color: "#0b0f14",
    fontSize: 14,
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
