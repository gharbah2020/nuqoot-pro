const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// حل مشكلة استدعاء المكتبات الخاصة بـ Node داخل الأندرويد
config.resolver.extraNodeModules = {
  fs: require.resolve('expo-file-system'),
  stream: require.resolve('expo-file-system'),
  crypto: require.resolve('expo-file-system'),
  path: require.resolve('expo-file-system'),
};

module.exports = config;
