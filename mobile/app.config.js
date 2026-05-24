export default {
  expo: {
    name: 'GitaFlow',
    slug: 'gitaflow',
    owner: 'shishirendu',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'gitaflow',
    updates: {
      url: 'https://u.expo.dev/8fbbc027-bb0b-4b1b-bfce-bee63471c649',
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#F4ECDD',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.gitaflow.app',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#F4ECDD',
      },
      package: 'com.gitaflow.bhagavad',
    },
    web: {
      bundler: 'metro',
    },
    plugins: ['expo-font'],
    experiments: {
      typedRoutes: false,
    },
    // Environment variables (read with process.env.EXPO_PUBLIC_*).
    // Override API_BASE in .env.local if your backend isn't on localhost:8000.
    extra: {
      apiBase: process.env.EXPO_PUBLIC_API_BASE,
      eas: {
        projectId: '8fbbc027-bb0b-4b1b-bfce-bee63471c649',
      },
    },
  },
};
