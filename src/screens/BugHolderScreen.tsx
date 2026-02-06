import { useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { theme } from "../theme";
import { useBugBiteStore } from "../state/store";
import type { Difficulty } from "../state/types";

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

const COIN_REWARDS: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  boss: 5
};

const BUG_COLORS: Record<Difficulty, string> = {
  easy: "#3b2a1f",
  medium: "#2e6a3b",
  hard: "#5a2f7a",
  boss: "#d1a649"
};

const BUG_SIZES: Record<Difficulty, number> = {
  easy: 40,
  medium: 55,
  hard: 70,
  boss: 90
};

const BUG_LIMIT = 20;

const getBugSize = (difficulty: Difficulty) => BUG_SIZES[difficulty];

const getBugRotation = (seed: string) => {
  const hash = seed
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return (hash % 11) - 5;
};

export const BugHolderScreen = () => {
  const { width, height } = useWindowDimensions();
  const todos = useBugBiteStore((state) => state.todos);
  const recurrent = useBugBiteStore((state) => state.recurrent);
  const smashTodo = useBugBiteStore((state) => state.smashTodo);
  const smashRecurrent = useBugBiteStore((state) => state.smashRecurrent);

  const positionMap = useRef(new Map<string, { x: number; y: number }>());
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

  const positions = useMemo(() => {
    const next = new Map<string, { x: number; y: number }>();
    bugs.forEach((bug) => {
      const existing = positionMap.current.get(bug.id);
      const size = getBugSize(bug.difficulty);
      const maxX = Math.max(0, width - size - 16);
      const maxY = Math.max(0, height - size - 120);
      if (existing) {
        next.set(bug.id, {
          x: Math.min(existing.x, maxX),
          y: Math.min(existing.y, maxY)
        });
        return;
      }
      const x = Math.random() * maxX + 8;
      const y = Math.random() * maxY + 80;
      next.set(bug.id, { x, y });
    });
    positionMap.current = next;
    return next;
  }, [bugs, height, width]);

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
    const position = positions.get(bug.id);
    if (!position) {
      return;
    }

    if (bug.kind === "todo") {
      smashTodo(bug.id);
    } else {
      smashRecurrent(bug.id);
    }

    triggerEffect(bug, position.x, position.y);
  };

  return (
    <View style={styles.container}>
      {bugs.map((bug) => {
        const position = positions.get(bug.id);
        if (!position) {
          return null;
        }
        const size = getBugSize(bug.difficulty);
        const rotation = getBugRotation(bug.id);
        const shakeValue =
          shakeMap.current.get(bug.id) ?? new Animated.Value(0);
        if (!shakeMap.current.has(bug.id)) {
          shakeMap.current.set(bug.id, shakeValue);
        }

        return (
          <Animated.View
            key={`${bug.kind}-${bug.id}`}
            style={[
              styles.bugWrapper,
              {
                width: size,
                height: size,
                left: position.x,
                top: position.y,
                transform: [{ translateX: shakeValue }]
              }
            ]}
          >
            <Pressable
              onPress={() =>
                bug.isUnlocked ? handleSmash(bug) : runShake(bug.id)
              }
              style={({ pressed }) => [
                styles.bugBody,
                {
                  backgroundColor: BUG_COLORS[bug.difficulty],
                  transform: [
                    { rotate: `${rotation}deg` },
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
            </Pressable>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eadfc9"
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
  }
});
