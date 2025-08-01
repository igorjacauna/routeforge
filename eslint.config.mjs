// @ts-check
import igorjacauna from '@igorjacauna/eslint-config/basic';
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt(
  // Your custom configs here
  igorjacauna([{
    rules: {
      'no-undef': 'off', // Disable no-undef rule
      'complexity': ['error', 10], // Set complexity limit to 10
      'no-useless-escape': 'off', // Disable no-useless-escape rule
      'vue/multi-word-component-names': 'off',
      '@stylistic/js/max-len': 'off',
    },
  }]),
);
