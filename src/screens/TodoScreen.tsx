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
  const coins = useBugBiteStore((state) => state.coins);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
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
  };

  const handleCreate = () => {
    if (!canCreate) {
      return;
    }
    addTodo(title.trim(), difficulty);
    handleCloseModal();
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

  const renderTodo = ({ item }: { item: Todo }) => {
    const isUnlockDisabled = item.status !== "locked";
    const isSmashable = item.status === "unlocked";
    const isSmashed = item.status === "smashed";
    return (
      <View style={styles.card}>
        <Pressable
          style={styles.failButton}
          onPress={() => failTodo(item.id)}
        >
          <Text style={styles.failButtonText}>-</Text>
        </Pressable>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={styles.metaRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {difficultyLabel(item.difficulty)}
              </Text>
            </View>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
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
          onPress={() => unlockTodo(item.id)}
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
            <Text style={styles.modalTitle}>New To Do</Text>
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
                onPress={handleCreate}
                disabled={!canCreate}
              >
                <Text style={styles.createButtonText}>Create</Text>
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
  cardContent: {
    flex: 1
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginBottom: theme.spacing.xs
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
