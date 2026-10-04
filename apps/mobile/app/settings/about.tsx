import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { t } from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import SettingsScreen, { useSettingsStyles } from '../../src/components/SettingsScreen';

// The policy is hosted on the web app; Korean speakers get the Korean version.
const PRIVACY_URL_BASE = 'https://amgi-iota.vercel.app/privacy';

export default function AboutSettings() {
  const { C, s } = useSettingsStyles();
  const { interfaceLanguage } = useUser();

  const openPrivacyPolicy = () => {
    const url = interfaceLanguage === 'Korean' ? `${PRIVACY_URL_BASE}/ko` : PRIVACY_URL_BASE;
    WebBrowser.openBrowserAsync(url);
  };

  return (
    <SettingsScreen titleKey="settingsAbout">
      <View style={s.card}>
        <TouchableOpacity style={a.linkRow} onPress={openPrivacyPolicy}>
          <Text style={s.rowText}>{t(interfaceLanguage, 'settingsPrivacyPolicy')}</Text>
          <Ionicons name="open-outline" size={18} color={C.muted} />
        </TouchableOpacity>
      </View>
    </SettingsScreen>
  );
}

const a = StyleSheet.create({
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
