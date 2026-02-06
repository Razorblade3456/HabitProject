import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useBugBiteStore } from "../state/store";
import { theme } from "../theme";

const formatMonthLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

const getMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export function ProgressScreen() {
  const monthlyProgress = useBugBiteStore((state) => state.monthlyProgress);
  const [monthOffset, setMonthOffset] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const currentDate = useMemo(() => new Date(), []);
  const selectedDate = useMemo(() => {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() + monthOffset);
    return date;
  }, [currentDate, monthOffset]);

  const monthKey = useMemo(() => getMonthKey(selectedDate), [selectedDate]);
  const feeds = monthlyProgress[monthKey] ?? 0;
  const targetScale = Math.min(2, 1 + Math.sqrt(feeds) * 0.1);

  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: targetScale,
      duration: 260,
      useNativeDriver: true
    }).start();
  }, [scaleAnim, targetScale]);

  const canGoNext = monthOffset < 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable
          style={styles.arrowButton}
          onPress={() => setMonthOffset((value) => value - 1)}
        >
          <Text style={styles.arrowText}>◀</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{formatMonthLabel(selectedDate)}</Text>
          <Text style={styles.subtitle}>
            Feeds collected: {feeds.toString()}
          </Text>
        </View>
        <Pressable
          style={[styles.arrowButton, !canGoNext && styles.arrowDisabled]}
          onPress={() => canGoNext && setMonthOffset((value) => value + 1)}
        >
          <Text style={styles.arrowText}>▶</Text>
        </Pressable>
      </View>

      <View style={styles.progressWrapper}>
        <Animated.View
          style={[
            styles.bugShell,
            {
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <Text style={styles.bugEmoji}>🐞</Text>
          <View style={styles.feedBadge}>
            <Text style={styles.feedText}>{feeds}</Text>
          </View>
        </Animated.View>
        <Text style={styles.progressHint}>
          Bigger bug = more feeds earned this month.
        </Text>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: theme.spacing.lg
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f2a36"
  },
  arrowDisabled: {
    opacity: 0.4
  },
  arrowText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700"
  },
  headerText: {
    alignItems: "center",
    flex: 1
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
  progressWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md
  },
  bugShell: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.accentAlt,
    shadowOpacity: 0.6,
    shadowRadius: 20
  },
  bugEmoji: {
    fontSize: 72
  },
  feedBadge: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.md
  },
  feedText: {
    color: "#04110a",
    fontWeight: "800",
    fontSize: 16
  },
  progressHint: {
    color: theme.colors.muted,
    fontSize: 14,
    textAlign: "center"
  }
});
