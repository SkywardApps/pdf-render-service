const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const react = require('eslint-plugin-react');

module.exports = [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        },
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react': react
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...react.configs.recommended.rules,
      'no-console': 'off',
      'prefer-const': ['error', {'destructuring': 'all'}],
      'quotes': ['error', 'single', {'avoidEscape': true, 'allowTemplateLiterals': true}],
      '@typescript-eslint/no-unused-vars': ['error', {'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_'}],
      '@typescript-eslint/member-ordering': ['error', {'default': ['field', 'constructor', 'method']}],
      'react/jsx-boolean-value': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn'
    },
    settings: {
      react: {
        version: '16.12'
      }
    }
  },
  {
    ignores: ['dist/**', 'node_modules/**', '**/*.js']
  }
];
