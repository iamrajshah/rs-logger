/* eslint-disable @typescript-eslint/naming-convention */
import js from "@eslint/js";
import tseslint from "typescript-eslint";

const cleanGlobals = Object.fromEntries(
  Object.entries({
    ...js.configs.recommended.languageOptions?.globals,
    ...tseslint.configs.recommended[0]?.languageOptions?.globals,
  }).filter(([key]) => key !== "AudioWorkletGlobalScope"),
);

const config = [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  {
    languageOptions: {
      globals: cleanGlobals,
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "no-return-await": "error",
      "require-await": "error",
      "no-console": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^[A-Z]",
        },
      ],
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-duplicate-enum-values": "warn",
      "no-prototype-builtins": "off",
      "@typescript-eslint/max-params": ["warn", { max: 4 }],
      "max-nested-callbacks": ["error", 2],
      "max-lines-per-function": [
        "error",
        { max: 200, skipBlankLines: true, skipComments: true },
      ],
      "max-lines": ["error", 400],
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "default",
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
      ],
      "no-duplicate-imports": "error",
      "block-scoped-var": "warn",
      "logical-assignment-operators": "warn",
      "no-useless-catch": "error",
      "prefer-object-spread": "warn",
      "vars-on-top": "error",
      "no-unreachable-loop": "error",
      "no-template-curly-in-string": "warn",
    },
  },
  {
    ignores: [
      "node_modules/",
      "public/",
      "lib/",
      "templates/",
      "scripts/",
      "secrets/",
      "test/",
      "*.hbs",
      "**/*.js",
    ],
  },
];

export default config;
