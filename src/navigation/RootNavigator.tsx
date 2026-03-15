import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import SignInScreen from "../screens/SignInScreen";
import SignUpScreen from "../screens/SignUpScreen";
import LearnScreen from "../screens/LearnScreen";
import PracticeNavigator from "./PracticeNavigator";
import ReadinessScreen from "../screens/ReadinessScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { Colors } from "../constants/theme";
import type { AuthStackParamList, AppTabParamList } from "./types";
import type { TranslationKey } from "../i18n/translations";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppTab = createBottomTabNavigator<AppTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthStack.Navigator>
  );
}

const TAB_ICONS: Record<
  keyof AppTabParamList,
  { focused: string; default: string }
> = {
  Learn: { focused: "library", default: "library-outline" },
  Practice: { focused: "book", default: "book-outline" },
  Progress: { focused: "bar-chart", default: "bar-chart-outline" },
  Settings: { focused: "settings", default: "settings-outline" },
};

const TAB_LABEL_KEY: Record<keyof AppTabParamList, TranslationKey> = {
  Learn: "tab.learn",
  Practice: "tab.practice",
  Progress: "tab.progress",
  Settings: "tab.settings",
};

function AppNavigator() {
  const { t } = useLanguage();

  return (
    <AppTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarLabel: t(TAB_LABEL_KEY[route.name]),
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const icon = focused ? icons.focused : icons.default;
          return <Ionicons name={icon as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      })}
    >
      <AppTab.Screen name="Learn" component={LearnScreen} />
      <AppTab.Screen name="Practice" component={PracticeNavigator} />
      <AppTab.Screen name="Progress" component={ReadinessScreen} />
      <AppTab.Screen name="Settings" component={SettingsScreen} />
    </AppTab.Navigator>
  );
}

export default function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
