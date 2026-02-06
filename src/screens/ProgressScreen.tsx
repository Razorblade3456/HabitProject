import { useMemo, useRef, useState, useEffect } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useBugBiteStore, getMonthKey } from "../state/store";
import { theme } from "../theme";

const monthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString("default", { month: "long", year: "numeric" });
};

const parseMonthKey = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
};

const formatMonthKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const addMonths = (date: Date, offset: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + offset);
  next.setDate(1);
  return next;
};

const clamp = (min: number, max: number, value: number) =>
  Math.min(max, Math.max(min, value));

export const ProgressScreen = () => {
  const monthlyStats = useBugBiteStore((state) => state.monthlyStats);
  const currentMonthKey = getMonthKey(new Date().toISOString());
  const [activeMonthKey, setActiveMonthKey] = useState(currentMonthKey);
  const [showDetails, setShowDetails] = useState(false);
  const scaleValue = useRef(new Animated.Value(1)).current;

  const monthKeys = useMemo(() => {
    const keys = Object.keys(monthlyStats).sort();
    const oldestStatsKey = keys[0];
    const fallbackOldest = formatMonthKey(addMonths(new Date(), -11));
    const oldestKey =
      oldestStatsKey && oldestStatsKey < fallbackOldest
        ? oldestStatsKey
        : fallbackOldest;
    const start = parseMonthKey(oldestKey);
    const end = parseMonthKey(currentMonthKey);
    const months: string[] = [];
    let cursor = start;
    while (cursor <= end) {
      months.push(formatMonthKey(cursor));
      cursor = addMonths(cursor, 1);
    }
    return months;
  }, [currentMonthKey, monthlyStats]);

  useEffect(() => {
    if (!monthKeys.includes(activeMonthKey)) {
      setActiveMonthKey(currentMonthKey);
    }
  }, [activeMonthKey, currentMonthKey, monthKeys]);

  const activeIndex = monthKeys.indexOf(activeMonthKey);
  const stats = monthlyStats[activeMonthKey] ?? {
    smashedCount: 0,
    missedCount: 0,
    smashedItems: [],
    missedItems: []
  };
  const smashedCount = stats.smashedCount;
  const scaleTarget = clamp(0.8, 2.0, 0.9 + Math.sqrt(smashedCount) * 0.1);

  useEffect(() => {
    Animated.timing(scaleValue, {
      toValue: scaleTarget,
      duration: 300,
      useNativeDriver: true
    }).start();
  }, [scaleTarget, scaleValue]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable
          style={[styles.navButton, activeIndex <= 0 && styles.navButtonDisabled]}
          onPress={() =>
            setActiveMonthKey(monthKeys[Math.max(0, activeIndex - 1)])
          }
          disabled={activeIndex <= 0}
        >
          <Text style={styles.navButtonText}>◀</Text>
        </Pressable>
        <Text style={styles.title}>{monthLabel(activeMonthKey)}</Text>
        <Pressable
          style={[
            styles.navButton,
            activeIndex === monthKeys.length - 1 && styles.navButtonDisabled
          ]}
          onPress={() =>
            setActiveMonthKey(
              monthKeys[Math.min(monthKeys.length - 1, activeIndex + 1)]
            )
          }
          disabled={activeIndex === monthKeys.length - 1}
        >
          <Text style={styles.navButtonText}>▶</Text>
        </Pressable>
      </View>
      <View style={styles.bugStage}>
        <Animated.View style={[styles.giantBug, { transform: [{ scale: scaleValue }] }]}>
          <View style={styles.giantEyes}>
            <View style={styles.giantEye} />
            <View style={styles.giantEye} />
          </View>
          <Text style={styles.giantCount}>{smashedCount}</Text>
        </Animated.View>
      </View>
      <Pressable style={styles.detailsButton} onPress={() => setShowDetails((v) => !v)}>
        <Text style={styles.detailsButtonText}>
          {showDetails ? "Hide Details" : "Details"}
        </Text>
      </Pressable>
      {showDetails && (
        <View style={styles.detailsCard}>
          <Text style={styles.detailsText}>Smashed: {stats.smashedCount}</Text>
          <Text style={styles.detailsText}>Missed: {stats.missedCount}</Text>
          <ScrollView style={styles.detailsList} showsVerticalScrollIndicator={false}>
            {stats.smashedItems.map((item) => (
              <Text key={`s-${item.id}-${item.dateISO}`} style={styles.detailsItem}>
                ✅ {item.title}
              </Text>
            ))}
            {stats.missedItems.map((item) => (
              <Text key={`m-${item.id}-${item.dateISO}`} style={styles.detailsItem}>
                ⚠️ {item.title}
              </Text>
            ))}
          </ScrollView>
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
    marginBottom: theme.spacing.lg
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700"
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  navButtonDisabled: {
    opacity: 0.4
  },
  navButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700"
  },
  bugStage: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1
  },
  giantBug: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#1f2a36",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    borderWidth: 2,
    borderColor: theme.colors.accent
  },
  giantEyes: {
    flexDirection: "row",
    gap: 12,
    position: "absolute",
    top: 60
  },
  giantEye: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ffffff"
  },
  giantCount: {
    color: theme.colors.text,
    fontSize: 56,
    fontWeight: "800"
  },
  detailsButton: {
    alignSelf: "center",
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    marginTop: theme.spacing.md
  },
  detailsButtonText: {
    color: theme.colors.text,
    fontWeight: "600"
  },
  detailsCard: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    maxHeight: 220
  },
  detailsText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: theme.spacing.xs
  },
  detailsList: {
    marginTop: theme.spacing.sm
  },
  detailsItem: {
    color: theme.colors.muted,
    fontSize: 12,
    marginBottom: theme.spacing.xs
  }
});
