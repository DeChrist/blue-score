import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import unicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";
import vitest from "@vitest/eslint-plugin";

export default tseslint.config(
  { ignores: ["dist", "coverage", "node_modules", "vite.config.d.ts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
      unicorn,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "react/prefer-read-only-props": "error",
      "react/jsx-child-element-spacing": "error",
      "unicorn/no-array-push-push": "error",
      "unicorn/prefer-global-this": "error",
      "no-negated-condition": "error",
      "no-nested-ternary": "error",
      "@typescript-eslint/prefer-for-of": "error",
      "@typescript-eslint/require-array-sort-compare": "error",
      "@typescript-eslint/no-redundant-type-constituents": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector:
            'TemplateLiteral BinaryExpression[operator="+"][left.property.name="length"][right.value=1]',
          message:
            "IDs derived from array length collide after removals (PIT-1, docs/agent-pitfalls.md). Use crypto.randomUUID().",
        },
        {
          selector:
            'TemplateLiteral BinaryExpression[operator="+"][left.value=1][right.property.name="length"]',
          message:
            "IDs derived from array length collide after removals (PIT-1, docs/agent-pitfalls.md). Use crypto.randomUUID().",
        },
      ],
    },
  },
  {
    files: ["**/*.test.{ts,tsx}"],
    plugins: { vitest },
    rules: {
      "vitest/valid-expect": "error",
      "vitest/no-identical-title": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector:
            'TemplateLiteral BinaryExpression[operator="+"][left.property.name="length"][right.value=1]',
          message:
            "IDs derived from array length collide after removals (PIT-1, docs/agent-pitfalls.md). Use crypto.randomUUID().",
        },
        {
          selector:
            'TemplateLiteral BinaryExpression[operator="+"][left.value=1][right.property.name="length"]',
          message:
            "IDs derived from array length collide after removals (PIT-1, docs/agent-pitfalls.md). Use crypto.randomUUID().",
        },
        {
          selector:
            'CallExpression[callee.property.name="toContain"] > CallExpression[callee.object.name="expect"]',
          message:
            "Asymmetric matchers never match inside toContain — this assertion is a no-op (PIT-5, docs/agent-pitfalls.md). Assert on the literal string/array.",
        },
      ],
    },
  },
);