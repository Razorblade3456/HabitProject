import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { theme } from "../theme";
import { useBugBiteStore } from "../state/store";
import type { Difficulty } from "../state/types";
import { getDifficultyStyle } from "../utils/difficulty";

type BugKind = "todo" | "recurrent";

type BugData = {
  id: string;
  kind: BugKind;
  difficulty: Difficulty;
  isUnlocked: boolean;
};

type BugEffect = {
  id: string;
  x: number;
  y: number;
  scale: Animated.Value;
  opacity: Animated.Value;
  floatY: Animated.Value;
  coins: number;
};

type BugAnimation = {
  posX: Animated.Value;
  posY: Animated.Value;
  rot: Animated.Value;
  bob: Animated.Value;
  jitterX: Animated.Value;
  jitterY: Animated.Value;
};

type BugLoopState = {
  wanderTimeout?: ReturnType<typeof setTimeout>;
  jitterTimeout?: ReturnType<typeof setTimeout>;
  wiggleTimeout?: ReturnType<typeof setTimeout>;
  bobTimeout?: ReturnType<typeof setTimeout>;
  wiggleDirection?: 1 | -1;
  bobDirection?: 1 | -1;
};

const COIN_REWARDS: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  boss: 5
};

const BUG_SIZES: Record<Difficulty, number> = {
  easy: 40,
  medium: 55,
  hard: 70,
  boss: 90
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const BUG_LIMIT = 25;
const QUEUE_OFFSET = 170;
const BOTTOM_OFFSET = 140;

const getBugSize = (difficulty: Difficulty) => BUG_SIZES[difficulty];

const getBugRotation = (seed: string) => {
  const hash = seed
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return (hash % 11) - 5;
};

const randomBetween = (min: number, max: number) =>
  Math.random() * (max - min) + min;

const getMotionConfig = (difficulty: Difficulty) => {
  switch (difficulty) {
    case "easy":
      return {
        wanderRange: [1500, 2400],
        jitterRange: [4, 6],
        wiggleRange: 4,
        bobRange: 2
      };
    case "medium":
      return {
        wanderRange: [1800, 2800],
        jitterRange: [3, 5],
        wiggleRange: 5,
        bobRange: 2.5
      };
    case "hard":
      return {
        wanderRange: [2200, 3200],
        jitterRange: [2, 4],
        wiggleRange: 6,
        bobRange: 3
      };
    default:
      return {
        wanderRange: [2600, 3500],
        jitterRange: [1, 3],
        wiggleRange: 6,
        bobRange: 4
      };
  }
};

export const BugHolderScreen = () => {
  const { width, height } = useWindowDimensions();
  const todos = useBugBiteStore((state) => state.todos);
  const recurrent = useBugBiteStore((state) => state.recurrent);
  const smashTodo = useBugBiteStore((state) => state.smashTodo);
  const smashRecurrent = useBugBiteStore((state) => state.smashRecurrent);
  const resetAllData = useBugBiteStore((state) => state.resetAllData);

  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetNotice, setResetNotice] = useState(false);
  const animationMap = useRef(new Map<string, BugAnimation>());
  const loopStateMap = useRef(new Map<string, BugLoopState>());
  const shakeMap = useRef(new Map<string, Animated.Value>());
  const [effects, setEffects] = useState<BugEffect[]>([]);

  const bugs = useMemo<BugData[]>(() => {
    const todoBugs = todos
      .filter((todo) => todo.status === "locked" || todo.status === "unlocked")
      .map((todo) => ({
        id: todo.id,
        kind: "todo" as const,
        difficulty: todo.difficulty,
        isUnlocked: todo.status === "unlocked"
      }));

    const recurrentBugs = recurrent
      .filter((item) => item.activeBugState !== null)
      .map((item) => ({
        id: item.id,
        kind: "recurrent" as const,
        difficulty: item.difficulty,
        isUnlocked: item.activeBugState === "unlocked"
      }));

    return [...todoBugs, ...recurrentBugs].slice(0, BUG_LIMIT);
  }, [recurrent, todos]);

  const dueHabits = useMemo(
    () => recurrent.filter((item) => (item.remainingToday ?? 0) > 0),
    [recurrent]
  );

  const owedTodos = useMemo(
    () =>
      todos.filter((todo) => todo.status === "locked" || todo.status === "unlocked"),
    [todos]
  );

  const owedCount = useMemo(() => {
    const habitCount = dueHabits.reduce(
      (sum, habit) => sum + (habit.remainingToday ?? 0),
      0
    );
    return habitCount + owedTodos.length;
  }, [dueHabits, owedTodos]);

  const containerWidth = layout.width || width;
  const containerHeight = layout.height || height;

  const getBounds = (difficulty: Difficulty) => {
    const size = getBugSize(difficulty);
    const maxX = Math.max(0, containerWidth - size - 16);
    const maxY = Math.max(QUEUE_OFFSET, containerHeight - size - BOTTOM_OFFSET);
    return {
      minX: 8,
      maxX,
      minY: QUEUE_OFFSET,
      maxY
    };
  };

  const getLoopState = (id: string) => {
    const existing = loopStateMap.current.get(id);
    if (existing) {
      return existing;
    }
    const nextState: BugLoopState = {};
    loopStateMap.current.set(id, nextState);
    return nextState;
  };

  const getAnimatedValue = (value: Animated.Value) => {
    if (typeof value.__getValue === "function") {
      return value.__getValue() as number;
    }
    return 0;
  };

  const createAnimation = (bug: BugData) => {
    const bounds = getBounds(bug.difficulty);
    const startX = randomBetween(bounds.minX, bounds.maxX);
    const startY = randomBetween(bounds.minY, bounds.maxY);
    const animation: BugAnimation = {
      posX: new Animated.Value(startX),
      posY: new Animated.Value(startY),
      rot: new Animated.Value(0),
      bob: new Animated.Value(0),
      jitterX: new Animated.Value(0),
      jitterY: new Animated.Value(0)
    };
    animationMap.current.set(bug.id, animation);
    return animation;
  };

  const getAnimation = (bug: BugData) =>
    animationMap.current.get(bug.id) ?? createAnimation(bug);

  const stopLoops = (id: string) => {
    const loopState = loopStateMap.current.get(id);
    if (!loopState) {
      return;
    }
    if (loopState.wanderTimeout) {
      clearTimeout(loopState.wanderTimeout);
    }
    if (loopState.jitterTimeout) {
      clearTimeout(loopState.jitterTimeout);
    }
    if (loopState.wiggleTimeout) {
      clearTimeout(loopState.wiggleTimeout);
    }
    if (loopState.bobTimeout) {
      clearTimeout(loopState.bobTimeout);
    }
    loopStateMap.current.delete(id);
  };

  const startWanderLoop = (bug: BugData, animation: BugAnimation) => {
    const loopState = getLoopState(bug.id);
    if (loopState.wanderTimeout) {
      return;
    }

    const run = () => {
      const bounds = getBounds(bug.difficulty);
      const targetX = randomBetween(bounds.minX, bounds.maxX);
      const targetY = randomBetween(bounds.minY, bounds.maxY);
      const { wanderRange } = getMotionConfig(bug.difficulty);
      const duration = randomBetween(wanderRange[0], wanderRange[1]);
      Animated.parallel([
        Animated.timing(animation.posX, {
          toValue: targetX,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        }),
        Animated.timing(animation.posY, {
          toValue: targetY,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        })
      ]).start(() => {
        const pause =
          Math.random() < 0.2 ? randomBetween(300, 900) : 0;
        loopState.wanderTimeout = setTimeout(run, pause);
      });
    };

    loopState.wanderTimeout = setTimeout(run, 0);
  };

  const startJitterLoop = (bug: BugData, animation: BugAnimation) => {
    const loopState = getLoopState(bug.id);
    if (loopState.jitterTimeout) {
      return;
    }

    const run = () => {
      const { jitterRange } = getMotionConfig(bug.difficulty);
      const jitterAmplitude = randomBetween(jitterRange[0], jitterRange[1]);
      const jitterX = randomBetween(-jitterAmplitude, jitterAmplitude);
      const jitterY = randomBetween(-jitterAmplitude, jitterAmplitude);
      const duration = randomBetween(80, 140);
      Animated.parallel([
        Animated.timing(animation.jitterX, {
          toValue: jitterX,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        }),
        Animated.timing(animation.jitterY, {
          toValue: jitterY,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        })
      ]).start(() => {
        loopState.jitterTimeout = setTimeout(run, randomBetween(60, 140));
      });
    };

    loopState.jitterTimeout = setTimeout(run, 0);
  };

  const startWiggleLoop = (bug: BugData, animation: BugAnimation) => {
    const loopState = getLoopState(bug.id);
    if (loopState.wiggleTimeout) {
      return;
    }

    const run = () => {
      const { wiggleRange } = getMotionConfig(bug.difficulty);
      const direction = loopState.wiggleDirection ?? 1;
      loopState.wiggleDirection = direction === 1 ? -1 : 1;
      const duration =
        bug.difficulty === "hard"
          ? randomBetween(700, 1100)
          : bug.difficulty === "boss"
          ? randomBetween(800, 1200)
          : randomBetween(500, 900);
      Animated.timing(animation.rot, {
        toValue: direction * wiggleRange,
        duration,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true
      }).start(() => {
        loopState.wiggleTimeout = setTimeout(run, randomBetween(0, 120));
      });
    };

    loopState.wiggleTimeout = setTimeout(run, 0);
  };

  const startBobLoop = (bug: BugData, animation: BugAnimation) => {
    const loopState = getLoopState(bug.id);
    if (loopState.bobTimeout) {
      return;
    }

    const run = () => {
      const { bobRange } = getMotionConfig(bug.difficulty);
      const direction = loopState.bobDirection ?? 1;
      loopState.bobDirection = direction === 1 ? -1 : 1;
      const duration =
        bug.difficulty === "boss"
          ? randomBetween(900, 1400)
          : randomBetween(600, 1000);
      Animated.timing(animation.bob, {
        toValue: direction * bobRange,
        duration,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true
      }).start(() => {
        loopState.bobTimeout = setTimeout(run, randomBetween(80, 200));
      });
    };

    loopState.bobTimeout = setTimeout(run, 0);
  };

  useEffect(() => {
    if (!containerWidth || !containerHeight) {
      return;
    }

    const activeIds = new Set(bugs.map((bug) => bug.id));
    animationMap.current.forEach((_, id) => {
      if (!activeIds.has(id)) {
        stopLoops(id);
        animationMap.current.delete(id);
        shakeMap.current.delete(id);
      }
    });

    bugs.forEach((bug) => {
      const animation = getAnimation(bug);
      const bounds = getBounds(bug.difficulty);
      const currentX = getAnimatedValue(animation.posX);
      const currentY = getAnimatedValue(animation.posY);
      const clampedX = Math.min(bounds.maxX, Math.max(bounds.minX, currentX));
      const clampedY = Math.min(bounds.maxY, Math.max(bounds.minY, currentY));
      if (clampedX !== currentX) {
        animation.posX.setValue(clampedX);
      }
      if (clampedY !== currentY) {
        animation.posY.setValue(clampedY);
      }
      startWanderLoop(bug, animation);
      startJitterLoop(bug, animation);
      startWiggleLoop(bug, animation);
      startBobLoop(bug, animation);
    });
  }, [bugs, containerHeight, containerWidth]);

  useEffect(() => {
    if (!resetNotice) {
      return;
    }
    const timer = setTimeout(() => setResetNotice(false), 2000);
    return () => clearTimeout(timer);
  }, [resetNotice]);

  const runShake = (bugId: string) => {
    const existing = shakeMap.current.get(bugId);
    const shakeValue = existing ?? new Animated.Value(0);
    if (!existing) {
      shakeMap.current.set(bugId, shakeValue);
    }
    shakeValue.setValue(0);
    Animated.sequence([
      Animated.timing(shakeValue, {
        toValue: 6,
        duration: 60,
        useNativeDriver: true
      }),
      Animated.timing(shakeValue, {
        toValue: -6,
        duration: 60,
        useNativeDriver: true
      }),
      Animated.timing(shakeValue, {
        toValue: 4,
        duration: 60,
        useNativeDriver: true
      }),
      Animated.timing(shakeValue, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true
      })
    ]).start();
  };

  const triggerEffect = (bug: BugData, x: number, y: number) => {
    const effect: BugEffect = {
      id: `${bug.kind}-${bug.id}-${Date.now()}`,
      x,
      y,
      scale: new Animated.Value(0),
      opacity: new Animated.Value(1),
      floatY: new Animated.Value(0),
      coins: COIN_REWARDS[bug.difficulty]
    };

    setEffects((current) => [...current, effect]);

    Animated.parallel([
      Animated.timing(effect.scale, {
        toValue: 1.4,
        duration: 250,
        useNativeDriver: true
      }),
      Animated.timing(effect.opacity, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true
      }),
      Animated.timing(effect.floatY, {
        toValue: -24,
        duration: 450,
        useNativeDriver: true
      })
    ]).start(() => {
      setEffects((current) => current.filter((item) => item.id !== effect.id));
    });
  };

  const handleSmash = (bug: BugData) => {
    const animation = animationMap.current.get(bug.id);
    if (!animation) {
      return;
    }

    if (bug.kind === "todo") {
      smashTodo(bug.id);
    } else {
      smashRecurrent(bug.id);
    }

    const x =
      getAnimatedValue(animation.posX) + getAnimatedValue(animation.jitterX);
    const y =
      getAnimatedValue(animation.posY) +
      getAnimatedValue(animation.jitterY) +
      getAnimatedValue(animation.bob);
    triggerEffect(bug, x, y);
  };

  return (
    <View
      style={styles.container}
      onLayout={(event) => {
        const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
        setLayout({ width: nextWidth, height: nextHeight });
      }}
    >
      <View style={styles.queuePanel}>
        <Text style={styles.queueTitle}>Bug Queue</Text>
        <Text style={styles.queueCount}>Owed bugs: {owedCount}</Text>
        {owedCount > BUG_LIMIT && (
          <Text style={styles.queueMeta}>
            Showing {BUG_LIMIT} of {owedCount}
          </Text>
        )}
        {owedCount === 0 ? (
          <Text style={styles.queueEmpty}>No bugs owed today.</Text>
        ) : (
          <>
            {dueHabits.map((habit) => {
              const remainingToday = habit.remainingToday ?? 0;
              const visibleCount = Math.min(10, remainingToday);
              const extraCount = remainingToday - visibleCount;
              return (
                <View key={habit.id} style={styles.queueRow}>
                  <View style={styles.queueRowHeader}>
                    <View
                      style={[
                        styles.queueBugIcon,
                        {
                          backgroundColor: getDifficultyStyle(habit.difficulty)
                            .color
                        }
                      ]}
                    >
                      <View style={styles.tinyEyeRow}>
                        <View style={styles.tinyEye} />
                        <View style={styles.tinyEye} />
                      </View>
                    </View>
                    <Text style={styles.queueLabel}>{habit.title}</Text>
                  </View>
                  <Text style={styles.queueMeta}>
                    remainingToday: {remainingToday}
                  </Text>
                  <View style={styles.queueBugs}>
                    {Array.from({ length: visibleCount }).map((_, index) => (
                      <View
                        key={`${habit.id}-${index}`}
                        style={[
                          styles.tinyBug,
                          {
                            backgroundColor: getDifficultyStyle(habit.difficulty)
                              .color
                          }
                        ]}
                      >
                        <View style={styles.tinyEyeRow}>
                          <View style={styles.tinyEye} />
                          <View style={styles.tinyEye} />
                        </View>
                      </View>
                    ))}
                    {extraCount > 0 && (
                      <Text style={styles.queueMore}>+{extraCount} more</Text>
                    )}
                  </View>
                </View>
              );
            })}
            {owedTodos.map((todo) => (
              <View key={todo.id} style={styles.queueRow}>
                <View style={styles.queueRowHeader}>
                  <View
                    style={[
                      styles.queueBugIcon,
                      { backgroundColor: getDifficultyStyle(todo.difficulty).color }
                    ]}
                  >
                    <View style={styles.tinyEyeRow}>
                      <View style={styles.tinyEye} />
                      <View style={styles.tinyEye} />
                    </View>
                  </View>
                  <Text style={styles.queueLabel}>{todo.title}</Text>
                </View>
                <Text style={styles.queueMeta}>
                  Status: {todo.status === "locked" ? "Locked" : "Unlocked"}
                </Text>
              </View>
            ))}
          </>
        )}
      </View>
      {bugs.map((bug) => {
        const animation = animationMap.current.get(bug.id);
        if (!animation) {
          return null;
        }
        const size = getBugSize(bug.difficulty);
        const rotation = getBugRotation(bug.id);
        const shakeValue =
          shakeMap.current.get(bug.id) ?? new Animated.Value(0);
        if (!shakeMap.current.has(bug.id)) {
          shakeMap.current.set(bug.id, shakeValue);
        }
        const rotateValue = Animated.add(
          animation.rot,
          new Animated.Value(rotation)
        );
        const rotate = rotateValue.interpolate({
          inputRange: [-360, 360],
          outputRange: ["-360deg", "360deg"]
        });

        return (
          <Animated.View
            key={`${bug.kind}-${bug.id}`}
            style={[
              styles.bugWrapper,
              {
                width: size,
                height: size,
                transform: [
                  { translateX: animation.posX },
                  { translateY: animation.posY },
                  { translateX: animation.jitterX },
                  { translateY: animation.jitterY },
                  { translateY: animation.bob },
                  { translateX: shakeValue }
                ]
              }
            ]}
          >
            <AnimatedPressable
              onPress={() =>
                bug.isUnlocked ? handleSmash(bug) : runShake(bug.id)
              }
              style={({ pressed }) => [
                styles.bugBody,
                {
                  backgroundColor: getDifficultyStyle(bug.difficulty).color,
                  transform: [
                    { rotate },
                    { scale: pressed && bug.isUnlocked ? 0.95 : 1 }
                  ],
                  opacity: bug.isUnlocked ? 1 : 0.75
                }
              ]}
            >
              <View style={styles.eyeRow}>
                <View style={styles.eye} />
                <View style={styles.eye} />
              </View>
            </AnimatedPressable>
          </Animated.View>
        );
      })}

      {effects.map((effect) => (
        <View
          key={effect.id}
          pointerEvents="none"
          style={[
            styles.effectWrapper,
            {
              left: effect.x,
              top: effect.y
            }
          ]}
        >
          <Animated.View
            style={[
              styles.splat,
              {
                opacity: effect.opacity,
                transform: [{ scale: effect.scale }]
              }
            ]}
          />
          <Animated.Text
            style={[
              styles.coinText,
              {
                opacity: effect.opacity,
                transform: [{ translateY: effect.floatY }]
              }
            ]}
          >
            +{effect.coins} coins
          </Animated.Text>
        </View>
      ))}
      {resetNotice && (
        <View style={styles.resetNotice}>
          <Text style={styles.resetNoticeText}>Reset complete.</Text>
        </View>
      )}
      <View style={styles.resetButtonContainer}>
        <Pressable
          style={styles.resetButton}
          onPress={() => setShowResetConfirm(true)}
        >
          <Text style={styles.resetButtonText}>Reset All</Text>
        </Pressable>
      </View>
      <Modal
        transparent
        visible={showResetConfirm}
        animationType="fade"
        onRequestClose={() => setShowResetConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reset everything?</Text>
            <Text style={styles.modalBody}>
              This will permanently delete ALL data (coins, progress, habits,
              to-dos, history). This cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setShowResetConfirm(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.resetConfirmButton}
                onPress={async () => {
                  await resetAllData();
                  setShowResetConfirm(false);
                  setResetNotice(true);
                }}
              >
                <Text style={styles.resetConfirmButtonText}>Reset</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eadfc9"
  },
  queuePanel: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md
  },
  queueTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3b2a1f",
    marginBottom: theme.spacing.xs
  },
  queueCount: {
    color: "#3b2a1f",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: theme.spacing.xs
  },
  queueEmpty: {
    color: "#5b4a3a",
    fontSize: 14
  },
  queueRow: {
    marginTop: theme.spacing.sm
  },
  queueRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  queueBugIcon: {
    width: 18,
    height: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center"
  },
  queueBugs: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6
  },
  queueLabel: {
    color: "#3b2a1f",
    fontSize: 13,
    fontWeight: "600"
  },
  queueMeta: {
    color: "#5b4a3a",
    fontSize: 12,
    marginTop: 2
  },
  queueMore: {
    color: "#3b2a1f",
    fontSize: 12,
    fontWeight: "600"
  },
  tinyBug: {
    width: 16,
    height: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center"
  },
  tinyEyeRow: {
    flexDirection: "row",
    gap: 2
  },
  tinyEye: {
    width: 2.5,
    height: 2.5,
    borderRadius: 999,
    backgroundColor: "#ffffff"
  },
  bugWrapper: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center"
  },
  bugBody: {
    flex: 1,
    width: "100%",
    height: "100%",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1b120b",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 }
  },
  eyeRow: {
    flexDirection: "row",
    gap: 6
  },
  eye: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#ffffff"
  },
  effectWrapper: {
    position: "absolute",
    width: 90,
    height: 90,
    alignItems: "center",
    justifyContent: "center"
  },
  splat: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: "#d94b4b"
  },
  coinText: {
    marginTop: 12,
    color: theme.colors.text,
    fontWeight: "700"
  },
  resetButtonContainer: {
    position: "absolute",
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    bottom: theme.spacing.lg
  },
  resetButton: {
    backgroundColor: "#b93838",
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 }
  },
  resetButtonText: {
    color: "#fff7f2",
    fontWeight: "700",
    fontSize: 16
  },
  resetNotice: {
    position: "absolute",
    bottom: theme.spacing.lg + 56,
    alignSelf: "center",
    backgroundColor: "#1f2a36",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.md
  },
  resetNoticeText: {
    color: "#ffffff",
    fontWeight: "600"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg
  },
  modalCard: {
    width: "100%",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: theme.spacing.sm
  },
  modalBody: {
    color: theme.colors.muted,
    fontSize: 14,
    marginBottom: theme.spacing.lg
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: theme.spacing.sm
  },
  cancelButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    backgroundColor: "#2a3440"
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontWeight: "600"
  },
  resetConfirmButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    backgroundColor: "#b93838"
  },
  resetConfirmButtonText: {
    color: "#ffffff",
    fontWeight: "700"
  }
});
