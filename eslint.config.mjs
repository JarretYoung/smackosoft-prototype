import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "supabase/.temp/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  prettierConfig,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "@typescript-eslint": tsPlugin },
    languageOptions: {
      parser: tsParser,
      parserOptions: { projectService: true, tsconfigRootDir: __dirname },
    },
    rules: {
      "@typescript-eslint/naming-convention": [
        "warn",
        { selector: "function", format: ["PascalCase"] },
        // `useState` setters (`const [x, setX] = useState()`) are function-typed
        // but array-destructured, which the plugin can't tag as "destructured"
        // (it only recognizes object-pattern destructuring) — carve them out
        // by name instead so the React `setX` convention isn't flagged.
        {
          selector: "variable",
          types: ["function"],
          filter: { regex: "^set[A-Z]", match: true },
          format: ["camelCase"],
        },
        { selector: "variable", types: ["function"], format: ["PascalCase"] },
        { selector: "variable", format: ["camelCase", "UPPER_CASE"] },
        // Destructured names (useState tuples, external API payloads, etc.) are
        // dictated by the source they come from, not by this codebase. Both
        // selectors are needed: the plugin always checks type-filtered
        // selectors (e.g. the `function` one above) before plain modifier
        // ones, so a destructured setter like `setEmail` needs its own
        // type-filtered exemption, not just a general "destructured" one.
        {
          selector: "variable",
          modifiers: ["destructured"],
          types: ["function"],
          format: null,
        },
        { selector: "variable", modifiers: ["destructured"], format: null },
        {
          selector: "parameter",
          format: ["camelCase"],
          leadingUnderscore: "allow",
        },
      ],
    },
  },
];

export default eslintConfig;
