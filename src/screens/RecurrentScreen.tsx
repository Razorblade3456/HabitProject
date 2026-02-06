import { useEffect, useMemo, useState } from "react";
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
import { useBugBiteStore } from "../state/store";
import { theme } from "../theme";
import type {
  ChecklistItem,
  Difficulty,
  IntervalType,
  Recurrent
} from "../state/types";

export const RecurrentScreen = () => {
  const recurrent = useBugBiteStore((state) => state.recurrent);
  const addRecurrent = useBugBiteStore((state) => state.addRecurrent);
  const updateRecurrent = useBugBiteStore((state) => state.updateRecurrent);
  const deleteRecurrent = useBugBiteStore((state) => state.deleteRecurrent);
  const completeRecurrent = useBugBiteStore((state) => state.completeRecurrent);
  const recentlyDeleted = useBugBiteStore((state) => state.recentlyDeleted);
  const undoRecentlyDeleted = useBugBiteStore(
    (state) => state.undoRecentlyDeleted
  );
  const spawnDueRecurrentBugs = useBugBiteStore(
    (state) => state.spawnDueRecurrentBugs
  );
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Recurrent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Recurrent | null>(null);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [intervalType, setIntervalType] = useState<IntervalType>("daily");
  const [timesPerDay, setTimesPerDay] = useState(1);
  const [note, setNote] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [checklistText, setChecklistText] = useState("");
  const [lastActionById, setLastActionById] = useState<
    Record<string, "plus" | "minus">
  >({});
  const actionOpacityMap = useState(
    () => new Map<string, Animated.Value>()
  )[0];

  const orderedHabits = useMemo(() => recurrent, [recurrent]);

  useEffect(() => {
    spawnDueRecurrentBugs(new Date().toISOString());
  }, [spawnDueRecurrentBugs]);

  const handleOpenEdit = (item: Recurrent) => {
    setEditingItem(item);
    setTitle(item.title);
    setDifficulty(item.difficulty);
    setIntervalType(item.intervalType);
    setTimesPerDay(item.timesPerDay);
    setNote(item.note ?? "");
    setChecklist(item.checklist ?? []);
    setChecklistText("");
    setIsModalVisible(true);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setTitle("");
    setDifficulty("easy");
    setIntervalType("daily");
    setTimesPerDay(1);
    setNote("");
    setChecklist([]);
    setChecklistText("");
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingItem(null);
    setTitle("");
    setDifficulty("easy");
    setIntervalType("daily");
    setTimesPerDay(1);
    setNote("");
    setChecklist([]);
    setChecklistText("");
  };

  const handleSave = () => {
    const safeTimes = Math.min(10, Math.max(1, timesPerDay));
    if (editingItem) {
      updateRecurrent(editingItem.id, {
        title: title.trim() || editingItem.title,
        difficulty,
        intervalType,
        timesPerDay: safeTimes,
        note,
        checklist
      });
    } else if (title.trim()) {
      addRecurrent(title.trim(), difficulty, intervalType, safeTimes, {
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

  const difficultyLabel = (value: Difficulty) =>
    value.charAt(0).toUpperCase() + value.slice(1);

  const intervalLabel = (value: IntervalType) =>
    value.charAt(0).toUpperCase() + value.slice(1);

  const renderHabit = ({ item }: { item: Recurrent }) => {
    const remainingToday = item.remainingToday ?? 0;
    const isDue = remainingToday > 0;
    const checklistTotal = item.checklist?.length ?? 0;
    const checklistDone = item.checklist?.filter((entry) => entry.done).length ?? 0;
    const notePreview = item.note?.trim();
    return (
      <View style={styles.card}>
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
                style={[styles.iconButton, styles.iconButtonDisabled]}
                disabled
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
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {difficultyLabel(item.difficulty)}
              </Text>
            </View>
            <View style={styles.badgeAlt}>
              <Text style={styles.badgeTextAlt}>
                {intervalLabel(item.intervalType)}
              </Text>
            </View>
            <Text style={styles.metaText}>x{item.timesPerDay}</Text>
            <Text style={styles.metaText}>{remainingToday} remaining</Text>
          </View>
          <View style={styles.logRow}>
            <Pressable
              style={[styles.logButton, !isDue && styles.logButtonDisabled]}
              onPress={() => {
                completeRecurrent(item.id);
                triggerActionChip(item.id, "plus");
              }}
              disabled={!isDue}
            >
              <Text style={styles.logButtonText}>+</Text>
            </Pressable>
            <Pressable
              style={[styles.logButton, styles.logButtonNegative]}
              onPress={() => triggerActionChip(item.id, "minus")}
            >
              <Text style={styles.logButtonText}>-</Text>
            </Pressable>
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
                    ? "+ recorded"
                    : "- recorded"}
                </Text>
              </Animated.View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Recurrent</Text>
        <Pressable style={styles.addButton} onPress={handleOpenAdd}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Active habits ({recurrent.length} total)
      </Text>
      <FlatList
        data={orderedHabits}
        keyExtractor={(item) => item.id}
        renderItem={renderHabit}
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
              {editingItem ? "Edit Habit" : "New Habit"}
            </Text>
            <TextInput
              placeholder="Enter title"
              placeholderTextColor={theme.colors.muted}
              style={styles.input}
              value={title}
              onChangeText={setTitle}
            />
            <Text style={styles.modalLabel}>Difficulty</Text>
            <View style={styles.rowWrap}>
              {(["easy", "medium", "hard", "boss"] as Difficulty[]).map(
                (level) => (
                  <Pressable
                    key={level}
                    style={[
                      styles.selectButton,
                      difficulty === level && styles.selectButtonActive
                    ]}
                    onPress={() => setDifficulty(level)}
                  >
                    <Text
                      style={[
                        styles.selectButtonText,
                        difficulty === level && styles.selectButtonTextActive
                      ]}
                    >
                      {difficultyLabel(level)}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
            <Text style={styles.modalLabel}>Interval</Text>
            <View style={styles.rowWrap}>
              {(["daily", "weekly", "monthly"] as IntervalType[]).map(
                (interval) => (
                  <Pressable
                    key={interval}
                    style={[
                      styles.selectButton,
                      intervalType === interval && styles.selectButtonActive
                    ]}
                    onPress={() => setIntervalType(interval)}
                  >
                    <Text
                      style={[
                        styles.selectButtonText,
                        intervalType === interval &&
                          styles.selectButtonTextActive
                      ]}
                    >
                      {intervalLabel(interval)}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
            <Text style={styles.modalLabel}>Times per day</Text>
            <View style={styles.stepperRow}>
              <Pressable
                style={styles.stepperButton}
                onPress={() => setTimesPerDay((value) => Math.max(1, value - 1))}
              >
                <Text style={styles.stepperText}>-</Text>
              </Pressable>
              <Text style={styles.stepperValue}>{timesPerDay}</Text>
              <Pressable
                style={styles.stepperButton}
                onPress={() => setTimesPerDay((value) => Math.min(10, value + 1))}
              >
                <Text style={styles.stepperText}>+</Text>
              </Pressable>
            </View>
            <Text style={styles.helperText}>1 to 10 per day</Text>
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
              <Pressable style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>
                  {editingItem ? "Save" : "Create"}
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
            <Text style={styles.modalTitle}>Delete Habit?</Text>
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
                    deleteRecurrent(deleteTarget.id);
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
      {recentlyDeleted?.type === "recurrent" && (
        <View style={styles.undoBanner}>
          <Text style={styles.undoBannerText}>Deleted. Undo?</Text>
          <Pressable style={styles.undoBannerButton} onPress={undoRecentlyDeleted}>
            <Text style={styles.undoBannerButtonText}>Undo</Text>
          </Pressable>
        </View>
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
    marginBottom: theme.spacing.sm
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
  subtitle: {
    color: theme.colors.muted,
    fontSize: 16
  },
  listContent: {
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md
  },
  cardContent: {
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
  badgeAlt: {
    backgroundColor: "rgba(145, 92, 245, 0.2)",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm
  },
  badgeTextAlt: {
    color: theme.colors.accentAlt,
    fontSize: 12,
    fontWeight: "700"
  },
  metaText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "600"
  },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm
  },
  logButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.accent
  },
  logButtonNegative: {
    backgroundColor: theme.colors.danger
  },
  logButtonDisabled: {
    opacity: 0.4
  },
  logButtonText: {
    color: "#0b0f14",
    fontSize: 16,
    fontWeight: "700"
  },
  actionChip: {
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
  helperText: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: theme.spacing.xs
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
  input: {
    borderWidth: 1,
    borderColor: "#2b3642",
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
    backgroundColor: "#0f151c"
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  selectButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: "#2b3642"
  },
  selectButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent
  },
  selectButtonText: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: "600"
  },
  selectButtonTextActive: {
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
  saveButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.sm
  },
  saveButtonText: {
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
  }
});
