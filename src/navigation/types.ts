import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

export type AppTabParamList = {
  Learn: undefined;
  Practice: undefined;
  Progress: undefined;
};

export type SignInScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  "SignIn"
>;
export type SignUpScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  "SignUp"
>;

export type LearnScreenProps = BottomTabScreenProps<AppTabParamList, "Learn">;
export type DailyQuestionScreenProps = BottomTabScreenProps<
  AppTabParamList,
  "Practice"
>;
export type ReadinessScreenProps = BottomTabScreenProps<
  AppTabParamList,
  "Progress"
>;
