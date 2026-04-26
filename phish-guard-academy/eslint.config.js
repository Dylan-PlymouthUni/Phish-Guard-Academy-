/**
 * ESLint configuration for the frontend TypeScript/React project.
 * This configuration extends recommended rules from ESLint, TypeScript ESLint, React Hooks, and React Refresh plugins.
 * It also sets the ECMAScript version to 2020 and includes browser globals.
 * The 'dist' directory is globally ignored to prevent linting of build artifacts.
 */

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
