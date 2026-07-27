const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Remove the `aps-environment` entitlement that `expo-notifications` adds.
 *
 * That plugin stamps the entitlement on unconditionally — there is no option
 * for it — because it cannot tell local notifications from remote push. Amgi
 * only schedules locally: notifications are planned on the device from cached
 * cards, there is no server, no push tokens and no APNs key.
 *
 * Keeping the entitlement is not free. It requires the provisioning profile to
 * carry the Push Notifications capability, which means enabling it on the App
 * ID in the Apple Developer Portal — an account we are borrowing. It also
 * declares a capability to App Review that the app never exercises.
 *
 * Registered *first* in app.json, which is what makes it run *last*: Expo
 * composes entitlement mods so the most recently registered runs first, so
 * being earlier in the list is how you get the final word. Putting it after
 * `expo-notifications` — the intuitive reading — silently does nothing, because
 * it deletes the key before that plugin has added it.
 * If real push is ever added, delete this file — the build will then fail until
 * the profile is regenerated with the capability, which is the correct order to
 * discover that in.
 */
module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (modConfig) => {
    delete modConfig.modResults['aps-environment'];
    return modConfig;
  });
};
