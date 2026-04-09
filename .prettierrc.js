module.exports = {
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': ['error', {
      semi: true,
      singleQuote: true,
      trailingComma: 'es5',
    }],
  },
};