import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  I18nManager,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Colors, Spacing } from "../constants/theme";
import type { SettingsScreenProps } from "../navigation/types";
import type { ContentLanguage } from "../i18n/translations";

interface LanguageOption {
  code: ContentLanguage;
  label: string; // display name
  localLabel: string; // name in the language itself
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "en", label: "English", localLabel: "English" },
  { code: "he", label: "Hebrew", localLabel: "עברית" },
];

export default function SettingsScreen(_: SettingsScreenProps) {
  const { user, signOut } = useAuth();
  const { lang: currentLang, setLang, t } = useLanguage();

  const [savingLang, setSavingLang] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Persist language selection ───────────────────────────────
  const handleSelectLanguage = async (lang: ContentLanguage) => {
    if (lang === currentLang || savingLang) return;

    setSavingLang(true);
    setSaveError(null);

    const { error } = await supabase
      .from("profiles")
      .update({ content_language: lang })
      .eq("id", user!.id);

    if (error) {
      setSaveError(t("settings.saveFailed"));
      setSavingLang(false);
      return;
    }

    setLang(lang);
    setSavingLang(false);

    // ── RTL handling ──────────────────────────────────────────
    const needsRTL = lang === "he";
    if (I18nManager.isRTL !== needsRTL) {
      I18nManager.allowRTL(needsRTL);
      I18nManager.forceRTL(needsRTL);

      // Restart the app to apply the layout direction change
      try {
        await Updates.reloadAsync();
      } catch {
        // expo-updates throws in dev mode — fall back to a manual restart prompt
        Alert.alert(t("settings.restartTitle"), t("settings.restartMsg"));
      }
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page header ── */}
        <Text style={styles.pageTitle}>{t("settings.title")}</Text>

        {/* ── Content Language ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("settings.contentLanguage")}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {t("settings.contentLanguageDesc")}
          </Text>

          <View style={styles.langRow}>
            {LANGUAGE_OPTIONS.map((opt) => {
              const isActive = currentLang === opt.code;
              return (
                <TouchableOpacity
                  key={opt.code}
                  style={[styles.langBtn, isActive && styles.langBtnActive]}
                  activeOpacity={0.75}
                  onPress={() => handleSelectLanguage(opt.code)}
                  disabled={savingLang}
                >
                  {isActive && savingLang ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <>
                      {isActive && (
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color={Colors.primary}
                          style={styles.langCheckIcon}
                        />
                      )}
                      <Text
                        style={[
                          styles.langBtnLabel,
                          isActive && styles.langBtnLabelActive,
                        ]}
                      >
                        {opt.localLabel}
                      </Text>
                      {opt.code !== opt.localLabel.toLowerCase() && (
                        <Text style={styles.langBtnSublabel}>
                          {opt.label}
                        </Text>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {saveError && <Text style={styles.saveError}>{saveError}</Text>}

          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={15}
              color={Colors.textSecondary}
            />
            <Text style={styles.infoText}>
              {t("settings.contentLanguageNote")}
            </Text>
          </View>
        </View>

        {/* ── Account ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("settings.account")}</Text>

          <View style={styles.infoRow}>
            <Ionicons
              name="mail-outline"
              size={16}
              color={Colors.textSecondary}
            />
            <Text style={styles.infoRowText} numberOfLines={1}>
              {user?.email ?? "\u2014"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.signOutBtn}
            activeOpacity={0.8}
            onPress={signOut}
          >
            <Ionicons name="log-out-outline" size={17} color={Colors.error} />
            <Text style={styles.signOutText}>{t("settings.signOut")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.xl,
  },

  // ── Page header ──
  pageTitle: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: Spacing.xl,
  },

  // ── Section ──
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: Spacing.md,
  },

  // ── Language buttons ──
  langRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  langBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  langBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "15",
  },
  langCheckIcon: {
    marginEnd: 2,
  },
  langBtnLabel: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  langBtnLabelActive: {
    color: Colors.primary,
  },
  langBtnSublabel: {
    color: Colors.textSecondary,
    fontSize: 11,
  },

  // ── Save error ──
  saveError: {
    color: Colors.error,
    fontSize: 12,
    marginBottom: Spacing.sm,
  },

  // ── Info box ──
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
  },
  infoText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },

  // ── Account section ──
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    marginBottom: Spacing.sm,
  },
  infoRowText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.error + "55",
    backgroundColor: Colors.error + "10",
  },
  signOutText: {
    color: Colors.error,
    fontSize: 15,
    fontWeight: "600",
  },
});
