module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated 4 : le plugin worklets doit rester en dernière position.
      'react-native-worklets/plugin',
    ],
  };
};
