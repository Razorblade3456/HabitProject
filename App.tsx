import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { theme } from "./src/theme";
import { InfestationScreen } from "./src/screens/InfestationScreen";
import { ProgressScreen } from "./src/screens/ProgressScreen";
import { RecurrentScreen } from "./src/screens/RecurrentScreen";
import { ShopScreen } from "./src/screens/ShopScreen";
import { TodoScreen } from "./src/screens/TodoScreen";

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: "#1f2a36",
    primary: theme.colors.accent
  }
};

export default function App() {
  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: "#1f2a36"
          },
          tabBarActiveTintColor: theme.colors.accent,
          tabBarInactiveTintColor: theme.colors.muted
        }}
      >
        <Tab.Screen name="To Do" component={TodoScreen} />
        <Tab.Screen name="Recurrent" component={RecurrentScreen} />
        <Tab.Screen name="Progress" component={ProgressScreen} />
        <Tab.Screen name="Infestation" component={InfestationScreen} />
        <Tab.Screen name="Shop" component={ShopScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
