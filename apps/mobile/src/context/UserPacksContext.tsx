import React, { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  getPackText, setUserVocabPacks, settleUserPacks, t, userPackId, userPackProgress,
  userVocabPacksByLanguage, type UserPack,
} from '@amgi/core';
import { useUser } from './UserContext';
import { useTheme } from './ThemeContext';
import { subscribeToUserPacks } from '../services/userPacks';
import { readCachedUserPacks, writeCachedUserPacks } from '../services/offlineReview';
import type { Palette } from '../theme';

interface UserPacksContextType {
  /** Null until the device snapshot or the first listener answer, and while signed out. */
  userPacks: UserPack[] | null;
}

const UserPacksContext = createContext<UserPacksContextType>({ userPacks: null });

/**
 * Keeps the learner's own packs live, hands them to the pack registry so every
 * pack surface sees them, and raises the notice when one finishes — the same
 * job web's provider does.
 *
 * The notice is in-app only: it shows if the app is open when sourcing ends.
 * A pack that finishes while the app is closed is simply there on Packs.
 *
 * **Offline, the packs come from the device.** Firestore's cache here is
 * memory only, so an app opened without a connection hears an empty
 * from-cache snapshot (or an error) where its packs should be. The last
 * server snapshot is kept in AsyncStorage and seeds this before the listener
 * answers; `settleUserPacks` is the rule for which answer replaces which.
 */
export function UserPacksProvider({ children }: { children: ReactNode }) {
  const { user, interfaceLanguage } = useUser();
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(C), [C]);
  const [userPacks, setUserPacks] = useState<UserPack[] | null>(null);
  const [notices, setNotices] = useState<UserPack[]>([]);
  const unfinished = useRef(new Set<string>());

  useEffect(() => {
    unfinished.current = new Set();
    if (!user) {
      setUserPacks(null);
      setUserVocabPacks({});
      return;
    }
    const { uid } = user;
    let held: UserPack[] | null = null;
    let serverAnswered = false;
    let cancelled = false;
    // The registry first: a screen re-rendering on `userPacks` reads it.
    const hold = (packs: UserPack[]) => {
      held = packs;
      setUserVocabPacks(userVocabPacksByLanguage(packs));
      setUserPacks(packs);
    };

    // Over anything the cache said in the meantime, which offline is an empty
    // list, but never over the server.
    void readCachedUserPacks(uid).then(cached => {
      if (!cancelled && cached && !serverAnswered) hold(cached);
    });

    const unsubscribe = subscribeToUserPacks(
      uid,
      (incoming, fromCache) => {
        const packs = settleUserPacks(held, incoming, fromCache);
        if (packs === held) return;
        if (!fromCache) {
          serverAnswered = true;
          void writeCachedUserPacks(uid, packs);
        }

        const finished: UserPack[] = [];
        for (const pack of packs) {
          const { done, ready } = userPackProgress(pack);
          if (!done) unfinished.current.add(pack.id);
          else if (unfinished.current.delete(pack.id) && ready > 0) finished.push(pack);
        }
        if (finished.length) setNotices(current => [...current, ...finished]);
        hold(packs);
      },
      // With nothing held this ends the wait; it does not empty what is.
      () => { if (held === null) hold([]); },
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user]);

  const dismiss = (id: string) => setNotices(current => current.filter(p => p.id !== id));

  return (
    <UserPacksContext.Provider value={{ userPacks }}>
      {children}
      {notices.length > 0 && (
        <View style={[s.wrap, { top: insets.top + 8 }]} pointerEvents="box-none">
          {notices.map(pack => (
            <View key={pack.id} style={s.notice} accessibilityRole="alert">
              <Text style={s.text}>
                {t(interfaceLanguage, 'userPackReady', { name: getPackText(pack.name, interfaceLanguage) })}
              </Text>
              <View style={s.actions}>
                <TouchableOpacity
                  hitSlop={8}
                  onPress={() => { dismiss(pack.id); router.push(`/decks/${userPackId(pack.id)}`); }}
                >
                  <Text style={s.open}>{t(interfaceLanguage, 'userPackOpen')}</Text>
                </TouchableOpacity>
                <TouchableOpacity hitSlop={8} onPress={() => dismiss(pack.id)}>
                  <Text style={s.dismiss}>{t(interfaceLanguage, 'userPackDismiss')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </UserPacksContext.Provider>
  );
}

export const useUserPacks = () => useContext(UserPacksContext);

function makeStyles(C: Palette) {
  return StyleSheet.create({
    // At the top rather than the bottom: the floating tab bar owns the bottom.
    wrap: { position: 'absolute', left: 16, right: 16, gap: 8 },
    notice: {
      padding: 14, borderRadius: 14, borderWidth: 1, borderColor: C.highlight,
      backgroundColor: C.surface,
    },
    text: { fontSize: 14, color: C.text },
    actions: { flexDirection: 'row', gap: 18, marginTop: 8 },
    open: { fontSize: 14, fontWeight: '700', color: C.highlight },
    dismiss: { fontSize: 14, color: C.muted },
  });
}
