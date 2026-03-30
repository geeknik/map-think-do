import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';

export default [
  // Add an initial configuration that ignores dist
  {
    ignores: ['dist/**/*'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,js}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier,
    },
    rules: {
      // TypeScript specific rules
      // This codebase handles dynamic MCP/JSON payloads extensively; strict TS remains enabled.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'none',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // General rules
      'no-console': ['warn', { allow: ['error', 'warn', 'info', 'debug'] }],
      'no-unused-vars': 'off',
      'prettier/prettier': 'error',
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      // TypeScript handles type-only symbols; core no-undef produces false positives here.
      'no-undef': 'off',
    },
  },
  {
    files: ['**/test/**/*.ts', '**/tests/**/*.ts', 'examples/**/*.js', 'test/**/*.js'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
