import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import SignInScreen from "../screens/SignInScreen";
import SignUpScreen from "../screens/SignUpScreen";
import LearnScreen from "../screens/LearnScreen";
import DailyQuestionScreen from "../screens/DailyQuestionScreen";
import ReadinessScreen from "../screens/ReadinessScreen";
import { Colors } from "../constants/theme";
import type { AuthStackParamList, AppTabParamList } from "./types";

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
};

function AppNavigator() {
  return (
    <AppTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
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
      <AppTab.Screen name="Practice" component={DailyQuestionScreen} />
      <AppTab.Screen name="Progress" component={ReadinessScreen} />
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
