import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import prettier from "eslint-config-prettier";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  js.configs.recommended,
  ...compat.extends("expo"),
  prettier,
  {
    rules: {
      // DevSettings.reload() must be a runtime require() behind __DEV__
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    ignores: ["node_modules/", "supabase/functions/", ".expo/"],
  },
];
