import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import playwright from "eslint-plugin-playwright";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Playwright rules apply to the e2e folder only.
    files: ["e2e/**/*.ts"],
    extends: [playwright.configs["flat/recommended"]],
    rules: {
      // Recommended rules that stay errors, listed so the strictness is visible.
      "playwright/expect-expect": "error",
      "playwright/no-focused-test": "error",
      "playwright/no-skipped-test": "error",
      "playwright/no-wait-for-timeout": "error",
      "playwright/no-force-option": "error",
      "playwright/no-conditional-in-test": "error",
      "playwright/no-conditional-expect": "error",
      "playwright/prefer-web-first-assertions": "error",
      "playwright/no-networkidle": "error",
      "playwright/missing-playwright-await": "error",
      "playwright/valid-expect": "error",
      "playwright/no-element-handle": "error",
      "playwright/no-eval": "error",
      "playwright/no-page-pause": "error",
      "playwright/no-wait-for-selector": "error",
      "playwright/no-useless-await": "error",
      "playwright/no-useless-not": "error",
      "playwright/no-standalone-expect": "error",
      "playwright/no-unsafe-references": "error",
      // Stricter than recommended.
      "playwright/no-wait-for-navigation": "error",
      "playwright/no-identical-title": "error",
      "playwright/no-duplicate-hooks": "error",
      "playwright/no-commented-out-tests": "error",
      "playwright/no-unnecessary-assertions": "error",
      "playwright/no-slowed-test": "error",
      "playwright/no-get-by-title": "error",
      "playwright/prefer-locator": "error",
      "playwright/prefer-native-locators": "error",
      "playwright/prefer-to-have-count": "error",
      "playwright/prefer-to-have-length": "error",
      "playwright/prefer-strict-equal": "error",
      "playwright/max-nested-describe": ["error", { max: 1 }],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "supabase/.temp/**", "coverage/**", "test-results/**", "playwright-report/**"]),
]);
