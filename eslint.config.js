import boundaries from "eslint-plugin-boundaries";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
  {
    files: [
      "modules/**/*.{ts,tsx}",
      "use-cases/**/*.{ts,tsx}",
      "shared/**/*.{ts,tsx}",
      "scenarios/**/*.ts",
      "scripts/**/*.ts",
      "app/**/*.{ts,tsx}",
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { boundaries },
    settings: {
      "import/resolver": {
        typescript: { project: "./tsconfig.json" },
      },
      "boundaries/include": [
        "modules/**/*",
        "use-cases/**/*",
        "shared/**/*",
        "scenarios/**/*",
        "scripts/**/*",
        "app/**/*",
      ],
      "boundaries/elements": [
        {
          type: "module-public",
          pattern: "modules/*/index.ts",
          mode: "file",
          capture: ["moduleName"],
        },
        {
          type: "module-internal",
          pattern: "modules/*/internal/**/*",
          capture: ["moduleName"],
        },
        { type: "use-case", pattern: "use-cases/**/*" },
        { type: "shared", pattern: "shared/**/*" },
        { type: "route", pattern: "app/**/*" },
        { type: "scenario", pattern: "scenarios/**/*" },
        { type: "script", pattern: "scripts/**/*" },
      ],
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            // 모듈 public(index.ts) → 자기 internal + shared
            {
              from: [["module-public", { moduleName: "${from.moduleName}" }]],
              allow: [
                ["module-internal", { moduleName: "${from.moduleName}" }],
                "shared",
              ],
            },
            // 모듈 internal → 자기 internal + shared (수평 import 금지)
            {
              from: [["module-internal", { moduleName: "${from.moduleName}" }]],
              allow: [
                ["module-internal", { moduleName: "${from.moduleName}" }],
                "shared",
              ],
            },
            // use-case → module public + shared (use-case끼리 import 금지)
            { from: ["use-case"], allow: ["module-public", "shared"] },
            // shared → shared only (도메인 0% 강제)
            { from: ["shared"], allow: ["shared"] },
            // app → use-case + module public + shared
            { from: ["route"], allow: ["use-case", "module-public", "shared"] },
            // scenario → use-case + module public + shared
            {
              from: ["scenario"],
              allow: ["use-case", "module-public", "shared"],
            },
            // script → shared only when project code is needed
            { from: ["script"], allow: ["shared"] },
          ],
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/modules/*/internal/*", "@/modules/*/internal"],
              message:
                "다른 모듈의 internal/ 직접 접근 금지. index.ts(public API)만 사용하세요.",
            },
          ],
        },
      ],
    },
  },
];
