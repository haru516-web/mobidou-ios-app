/** Home screen widget: today's steps and the chosen Mobby walking in place. */
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: 'widget',
  name: 'MobiWalkWidget',
  displayName: 'もび道',
  deploymentTarget: '17.0',
  // The widget reads the app group from its own bundle id (<app id>.widget), so keep this name.
  bundleIdentifier: '.widget',
  entitlements: {
    // The app and the widget share the steps through this group (see src/services/widgetSync.ts).
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
