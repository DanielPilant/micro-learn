import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { Question } from "../types";

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

export type AppTabParamList = {
  Learn: undefined;
  Practice: undefined;
  Progress: undefined;
};

export type PracticeStackParamList = {
  PracticeList: undefined;
  PracticeDetail: { question: Question };
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

export type PracticeListScreenProps = CompositeScreenProps<
  NativeStackScreenProps<PracticeStackParamList, "PracticeList">,
  BottomTabScreenProps<AppTabParamList>
>;

export type PracticeDetailScreenProps = NativeStackScreenProps<
  PracticeStackParamList,
  "PracticeDetail"
>;
