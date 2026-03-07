import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

export type AppStackParamList = {
  DailyQuestion: undefined;
  // Additional screens (Profile, Progress, etc.) added in later steps.
};

export type SignInScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  "SignIn"
>;
export type SignUpScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  "SignUp"
>;
export type DailyQuestionScreenProps = NativeStackScreenProps<
  AppStackParamList,
  "DailyQuestion"
>;
