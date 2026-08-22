import { Redirect } from 'expo-router';

/**
 * Where Google's OAuth redirect lands on Android. Renders nothing and is never
 * navigated to by hand.
 *
 * The redirect arrives as a deep link, and **two things consume it at once**:
 * `openAuthSessionAsync`'s listener resolves the pending sign-in, and
 * expo-router routes the same URL as navigation. The first is what matters and
 * happens with or without this file; the second used to hit the router's
 * "Unmatched Route" screen, stranding the user on an error page *after a
 * successful sign-in*. This route exists purely to give that navigation
 * somewhere to go.
 *
 * So the failure it fixes is cosmetic but total: the account is signed in
 * underneath, and the app looks broken. Nothing here completes the auth —
 * `WebBrowser.maybeCompleteAuthSession()` already runs at module scope in
 * `UserContext`, which is loaded by the root layout on every launch.
 *
 * iOS never reaches this route. There `ASWebAuthenticationSession` intercepts
 * the redirect in-process, so it never becomes a deep link for the router to
 * see — which is why this only showed up on the first Android build.
 *
 * The path must stay in step with `nativeRedirectUri` in `UserContext.tsx`;
 * renaming this file alone sends the redirect back to Unmatched Route.
 */
export default function OAuthRedirect() {
  return <Redirect href="/" />;
}
