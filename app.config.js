// The development build gets its own app id, name and URL scheme so it can sit on the same iPhone beside the TestFlight / App Store build.
// Everything else comes from app.json. In-app purchases and Sign in with Apple belong to the real app id: test those on the TestFlight build.
module.exports = ({ config }) => {
  if (process.env.APP_VARIANT !== 'development') return config;
  return {
    ...config,
    name: `${config.name}(開発)`,
    scheme: `${config.scheme}-dev`,
    ios: { ...config.ios, bundleIdentifier: `${config.ios.bundleIdentifier}.dev` },
  };
};
