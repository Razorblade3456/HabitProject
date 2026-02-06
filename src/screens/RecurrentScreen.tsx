import { StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";

export function RecurrentScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recurrent</Text>
      <Text style={styles.subtitle}>Build habits and swat bugs on repeat.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg
  },
  title: {
    color: theme.colors.accentAlt,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: theme.spacing.sm
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 16,
    textAlign: "center"
  }
});
