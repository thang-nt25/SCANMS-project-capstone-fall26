module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(iosClientId || "")) {
    return config;
  }
  const client = iosClientId.split(".")[0];
  return {
    ...config,
    plugins: [
      ...(config.plugins || []),
      ["@react-native-google-signin/google-signin", {
        iosUrlScheme: `com.googleusercontent.apps.${client}`,
      }],
    ],
  };
};
