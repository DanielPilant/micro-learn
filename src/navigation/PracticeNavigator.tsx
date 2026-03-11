import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import PracticeListScreen from "../screens/PracticeListScreen";
import PracticeDetailScreen from "../screens/PracticeDetailScreen";
import type { PracticeStackParamList } from "./types";

const Stack = createNativeStackNavigator<PracticeStackParamList>();

export default function PracticeNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PracticeList" component={PracticeListScreen} />
      <Stack.Screen name="PracticeDetail" component={PracticeDetailScreen} />
    </Stack.Navigator>
  );
}
