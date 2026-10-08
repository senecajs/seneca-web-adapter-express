'use strict'

const js = require('@eslint/js')
const globals = require('globals')

module.exports = [
  {
    ignores: ['node_modules/**', 'coverage/**', '.nyc_output/**'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.mocha,
      },
    },
  },
]
