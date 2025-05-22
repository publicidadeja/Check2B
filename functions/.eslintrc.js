module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 2022, // Atualizado de 2017 para 2022
  },
  rules: {
    'no-unused-vars': 'warn',
    'node/no-unsupported-features/es-syntax': 'off', // Pode ser útil se usar um plugin node
  },
};
