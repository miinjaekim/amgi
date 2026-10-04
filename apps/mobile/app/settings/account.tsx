import React, { useMemo, useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, DevSettings } from 'react-native';
import { t } from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import SettingsScreen, { useSettingsStyles } from '../../src/components/SettingsScreen';
import { clearAllLocalData } from '../../src/services/offlineReview';
import type { Palette } from '../../src/theme';

/**
 * Signing out and deleting the account — the two actions that end something,
 * on a screen of their own so neither sits beside a row tapped daily.
 *
 * ⚠️ **App Store review is routed here** for guideline 5.1.1(v): Progress →
 * gear → Account → Delete account. `docs/testflight-beta-info.md` spells the
 * path out, so moving this screen means editing those notes too.
 */
export default function AccountSettings() {
  const { C } = useSettingsStyles();
  const s = useMemo(() => makeStyles(C), [C]);
  const { user, interfaceLanguage, deleteAccount, handleSignIn, handleSignOut } = useUser();
  const [deleting, setDeleting] = useState(false);

  /**
   * Two confirmations rather than the typed one the web uses. Making someone
   * type an email address on a phone keyboard to close their account is
   * hostile, and a destructive iOS alert is the platform's own idiom for
   * "this is irreversible".
   */
  const handleDeleteAccount = () => {
    Alert.alert(
      t(interfaceLanguage, 'deleteAccountConfirmTitle'),
      `${t(interfaceLanguage, 'deleteAccountWarning')}\n\n${t(interfaceLanguage, 'deleteAccountExportHint')}`,
      [
        { text: t(interfaceLanguage, 'cancel'), style: 'cancel' },
        {
          text: t(interfaceLanguage, 'deleteAccount'),
          style: 'destructive',
          onPress: () => Alert.alert(
            t(interfaceLanguage, 'deleteAccountConfirmTitle'),
            t(interfaceLanguage, 'deleteAccountWarning'),
            [
              { text: t(interfaceLanguage, 'cancel'), style: 'cancel' },
              { text: t(interfaceLanguage, 'deleteAccountAction'), style: 'destructive', onPress: runDelete },
            ],
          ),
        },
      ],
    );
  };

  const runDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      // The account is gone and the Delete User Data extension is already
      // sweeping Firestore server-side; everything here is the device catching
      // up with a decision that has been made.
      await clearAllLocalData();
      Alert.alert(t(interfaceLanguage, 'deleteAccountSignedOut'));
    } catch (error) {
      // Backing out of the Google prompt is a decision, not a failure.
      if ((error as Error)?.message !== 'Reauthentication cancelled.') {
        Alert.alert(t(interfaceLanguage, 'deleteAccountFailed'));
      }
    } finally {
      setDeleting(false);
    }
  };

  /**
   * Development only: put this device back to before first run.
   *
   * Signing out is not enough, because the language answers stay cached and
   * first run is gated on there being none. The reload is what makes it work
   * signed out too: nothing re-reads the cache without an auth change.
   * The account itself is untouched, so signing back in to it skips setup.
   */
  const resetFirstRun = async () => {
    if (user) await handleSignOut();
    await clearAllLocalData();
    DevSettings.reload();
  };

  return (
    <SettingsScreen titleKey="settingsAccount">
      {user ? (
        <>
          <Text style={s.email}>{user.email}</Text>
          <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
            <Text style={s.signOutBtnText}>{t(interfaceLanguage, 'signOut')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.deleteBtn}
            onPress={handleDeleteAccount}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={C.error} />
            ) : (
              <Text style={s.deleteBtnText}>{t(interfaceLanguage, 'deleteAccount')}</Text>
            )}
          </TouchableOpacity>
          <Text style={s.deleteHint}>{t(interfaceLanguage, 'deleteAccountBlurb')}</Text>
        </>
      ) : (
        <>
          <Text style={s.email}>{t(interfaceLanguage, 'settingsNotSignedIn')}</Text>
          <TouchableOpacity style={s.signInBtn} onPress={handleSignIn}>
            <Text style={s.signInBtnText}>{t(interfaceLanguage, 'settingsSignInWithGoogle')}</Text>
          </TouchableOpacity>
        </>
      )}
      {/* Never in a build: `__DEV__` is false there. English only, since
          it is not copy anyone but a developer reads. */}
      {__DEV__ && (
        <TouchableOpacity style={[s.signOutBtn, s.devReset]} onPress={resetFirstRun}>
          <Text style={s.signOutBtnText}>Dev: reset to first run</Text>
        </TouchableOpacity>
      )}
    </SettingsScreen>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    // Which account, said once more above the buttons that act on it.
    email: { fontSize: 14, color: C.muted, marginBottom: 18 },
    devReset: { marginTop: 12 },
    signOutBtn: {
      borderWidth: 1.5, borderColor: C.error, borderRadius: 12,
      paddingVertical: 13, alignItems: 'center',
    },
    signOutBtnText: { color: C.error, fontSize: 15, fontWeight: '600' },
    // Deliberately quieter than sign out: findable, as the App Store requires,
    // but not sitting at the same visual weight as the thing people click daily.
    deleteBtn: { marginTop: 14, paddingVertical: 11, alignItems: 'center' },
    deleteBtnText: { color: C.error, fontSize: 14, fontWeight: '600' },
    deleteHint: { color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 2, lineHeight: 17 },
    signInBtn: {
      backgroundColor: C.highlight, borderRadius: 12,
      paddingVertical: 13, alignItems: 'center',
    },
    signInBtnText: { color: C.bg, fontSize: 15, fontWeight: '700' },
  });
}
