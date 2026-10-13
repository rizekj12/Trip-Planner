// ESLint flat config. Run with: npm run lint
import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  { ignores: ["dist", "dev-dist", "node_modules", "coverage"] },

  js.configs.recommended,

  // Frontend (React, runs in the browser)
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "18.3" } },
    plugins: { react, "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      "react/prop-types": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },

  // Server, shared code and tooling (Node)
  {
    files: ["server/**/*.js", "shared/**/*.js", "*.config.{js,cjs}"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: globals.node },
  },
  { files: ["**/*.cjs"], languageOptions: { sourceType: "commonjs" } },

  // Tests
  {
    files: ["**/*.test.{js,jsx}", "src/test/**"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },

  {
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^(_|React$)", ignoreRestSiblings: true }],
    },
  },
];
