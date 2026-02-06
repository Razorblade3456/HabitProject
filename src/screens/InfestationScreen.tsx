import { useEffect, useMemo } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useBugBiteStore, MAX_INFESTATION } from "../state/store";
import { theme } from "../theme";

const getBugCount = (infestation: number) => {
  if (infestation <= 0) {
    return 0;
  }
  if (infestation <= 3) {
    return 6;
  }
  if (infestation <= 7) {
    return 14;
  }
  return 24;
};

const BugSwarm = ({ infestation }: { infestation: number }) => {
  const bugCount = getBugCount(infestation);
  const isSwarm = infestation >= 8;
  const positions = useMemo(
    () =>
      Array.from({ length: bugCount }).map(() => ({
        left: Math.random() * 260,
        top: Math.random() * 200
      })),
    [bugCount]
  );
  const bugAnims = useMemo(
    () => Array.from({ length: bugCount }).map(() => new Animated.Value(0)),
    [bugCount]
  );

  useEffect(() => {
    const loops = bugAnims.map((anim) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 1400 + Math.random() * 1200,
            useNativeDriver: true
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 1400 + Math.random() * 1200,
            useNativeDriver: true
          })
        ])
      )
    );
    loops.forEach((loop) => loop.start());
    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, [bugAnims]);

  return (
    <View style={styles.swarmArea}>
      {positions.map((pos, index) => {
        const jitter = bugAnims[index];
        const translateX = jitter.interpolate({
          inputRange: [0, 1],
          outputRange: [0, (Math.random() - 0.5) * 18]
        });
        const translateY = jitter.interpolate({
          inputRange: [0, 1],
          outputRange: [0, (Math.random() - 0.5) * 18]
        });

        return (
          <Animated.View
            key={`${index}`}
            style={[
              styles.bugSprite,
              {
                left: pos.left,
                top: pos.top,
                transform: [{ translateX }, { translateY }]
              }
            ]}
          >
            <Text style={[styles.bugEmoji, isSwarm && styles.bugEmojiSwarm]}>
              🪲
            </Text>
          </Animated.View>
        );
      })}
    </View>
  );
};

export function InfestationScreen() {
  const navigation = useNavigation();
  const infestation = useBugBiteStore((state) => state.infestation);
  const overrunActive = infestation >= MAX_INFESTATION;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Infestation</Text>
      <Text style={styles.subtitle}>
        Missed tasks gather here. Guard against Overrun.
      </Text>

      {overrunActive ? (
        <View style={styles.overrunBanner}>
          <Text style={styles.overrunText}>OVERRUN ACTIVE</Text>
        </View>
      ) : null}

      <View
        style={[
          styles.counterCard,
          overrunActive && styles.counterCardOverrun
        ]}
      >
        <Text style={styles.counterLabel}>Current Infestation</Text>
        <Text style={styles.counterValue}>{infestation}</Text>
        <BugSwarm infestation={infestation} />
      </View>

      <Pressable
        style={styles.shopButton}
        onPress={() => navigation.navigate("Shop" as never)}
      >
        <Text style={styles.shopButtonText}>Go to Shop</Text>
      </Pressable>
      <Text style={styles.tipText}>
        Clear infestation to restore rewards
      </Text>
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
  title: {
    color: theme.colors.danger,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: theme.spacing.sm
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 16,
    textAlign: "center"
  },
  overrunBanner: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.danger,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md
  },
  overrunText: {
    color: "#23030a",
    fontWeight: "800",
    letterSpacing: 1
  },
  counterCard: {
    marginTop: theme.spacing.lg,
    width: "100%",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    alignItems: "center"
  },
  counterCardOverrun: {
    borderWidth: 1,
    borderColor: theme.colors.danger,
    shadowColor: theme.colors.danger,
    shadowOpacity: 0.6,
    shadowRadius: 12
  },
  counterLabel: {
    color: theme.colors.muted,
    fontSize: 14
  },
  counterValue: {
    color: theme.colors.text,
    fontSize: 48,
    fontWeight: "800",
    marginTop: theme.spacing.xs
  },
  swarmArea: {
    marginTop: theme.spacing.md,
    width: "100%",
    height: 220,
    backgroundColor: "#10151c",
    borderRadius: theme.radius.md,
    overflow: "hidden"
  },
  bugSprite: {
    position: "absolute"
  },
  bugEmoji: {
    fontSize: 20,
    color: theme.colors.accent
  },
  bugEmojiSwarm: {
    color: theme.colors.danger
  },
  shopButton: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.accentAlt,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md
  },
  shopButtonText: {
    color: theme.colors.text,
    fontWeight: "600"
  },
  tipText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.muted,
    fontSize: 13
  }
});
