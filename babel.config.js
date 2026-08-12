module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 ships its worklet transform in react-native-worklets and it must stay last.
    plugins: ['react-native-worklets/plugin'],
  };
};
