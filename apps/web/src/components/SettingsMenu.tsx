'use client';
import React, { useState } from 'react';
import { useUser } from '@/components/UserContext';
import { useTheme } from '@/components/ThemeContext';
import { usePronunciation } from '@/components/PronunciationContext';
import { SUPPORTED_NATIVE_LANGUAGES } from '@/services/userPreferences';
import { HANJA_PARTITIONS, getStudyLanguageConfig, type HanjaPartition, type StudyLanguage } from '@amgi/core';
import { t } from '@/lib/i18n';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import AddLanguageModal from '@/components/AddLanguageModal';

/**
 * The languages you have added, and the way to add another.
 *
 * ⚠️ **Only added languages appear.** This used to list every language the app
 * supports, which made switching decks a scroll through nine options — eight of
 * which the user had never asked for — and gave the choice no memory: each one
 * silently inherited whatever native language happened to be set globally.
 *
 * Each row names the pair, because the pair is what a deck *is*: the language
 * and the language it is explained in. Two people studying Japanese do not have
 * the same deck if one reads Korean backs and the other English.
 *
 * Used inside SettingsMenu and standalone in the sidebar's language popover.
 */
export function StudyLanguageList({ onSelect }: { onSelect?: () => void }) {
  const { interfaceLanguage, languages, studyLanguage, setStudyLanguage } = useUser();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      {languages.map(pair => {
        const active = studyLanguage === pair.study;
        return (
          <button
            key={pair.study}
            onClick={() => { void setStudyLanguage(pair.study); onSelect?.(); }}
            className="w-full flex items-center justify-between gap-2 text-left px-3 py-2.5 text-sm font-mono transition-colors hover:bg-[var(--color-muted)]/30"
            style={active ? { color: 'var(--color-highlight)', fontWeight: 700 } : { color: 'var(--color-text)' }}
          >
            <span className="min-w-0">
              <span className="block truncate">
                {t(interfaceLanguage, getStudyLanguageConfig(pair.study).studyLabelKey)}
              </span>
              {/* The half that used to be invisible. Without it two decks read
                  as the same choice made twice. */}
              <span className="block text-xs font-normal opacity-60 truncate">
                {t(interfaceLanguage, 'languagePairSummary', {
                  native: t(interfaceLanguage, pair.native === 'Korean' ? 'labelKorean' : 'labelEnglish'),
                })}
              </span>
            </span>
            {active && (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        );
      })}

      <button
        onClick={() => setAddOpen(true)}
        className="w-full flex items-center gap-2 text-left px-3 py-2.5 text-sm font-mono border-t border-[var(--color-muted)]/40 transition-colors hover:bg-[var(--color-muted)]/30"
        style={{ color: 'var(--color-muted)' }}
      >
        <span className="text-base leading-none">+</span>
        {t(interfaceLanguage, 'addLanguage')}
      </button>

      {addOpen && <AddLanguageModal onClose={() => { setAddOpen(false); onSelect?.(); }} />}
    </>
  );
}

/** i18n keys for a partition, kept next to each other so neither is guessed. */
function partitionLabelKey(partition: HanjaPartition) {
  if (partition === 'hun') return 'hanjaPartitionHun' as const;
  if (partition === 'eum') return 'hanjaPartitionEum' as const;
  return 'hanjaPartitionCharacter' as const;
}

function partitionExampleKey(partition: HanjaPartition) {
  if (partition === 'hun') return 'hanjaPartitionHunExample' as const;
  if (partition === 'eum') return 'hanjaPartitionEumExample' as const;
  return 'hanjaPartitionCharacterExample' as const;
}

/** Shared settings panel body — rendered inside the header dropdown (mobile)
 *  and the sidebar popover (desktop). The container provides positioning. */
export default function SettingsMenu({ onClose }: { onClose: () => void }) {
  const {
    user, interfaceLanguage, languages, studyLanguage, hanjaPartition,
    setInterfaceLanguage, setHanjaPartition, removeLanguage, handleSignOut,
  } = useUser();
  const { theme, setTheme, themes } = useTheme();
  const { speed, setSpeed, speeds } = usePronunciation();
  const [langListOpen, setLangListOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const current = languages.find(pair => pair.study === studyLanguage);

  /**
   * Removing a deck takes it off the switcher and leaves every card where it
   * is — which the confirmation says, because "remove" beside a language is
   * otherwise easy to read as "erase everything I have learned in it".
   */
  const confirmRemove = (study: StudyLanguage) => {
    const name = t(interfaceLanguage, getStudyLanguageConfig(study).studyLabelKey);
    if (!window.confirm(
      `${t(interfaceLanguage, 'removeLanguageTitle', { study: name })}\n\n${t(interfaceLanguage, 'removeLanguageBody')}`
    )) return;
    void removeLanguage(study);
  };

  return (
    <>
      {/* Study language — the decks you have added */}
      <div className="px-4 py-3 border-b border-[var(--color-muted)]/50">
        <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'settingsStudyLanguage')}
        </p>
        <button
          onClick={() => setLangListOpen((v) => !v)}
          className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg text-sm font-mono border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)]"
          style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-muted)' }}
        >
          <span className="min-w-0 text-left">
            <span className="block truncate">
              {t(interfaceLanguage, getStudyLanguageConfig(studyLanguage).studyLabelKey)}
            </span>
            {current && (
              <span className="block text-xs opacity-60 truncate">
                {t(interfaceLanguage, 'languagePairSummary', {
                  native: t(interfaceLanguage, current.native === 'Korean' ? 'labelKorean' : 'labelEnglish'),
                })}
              </span>
            )}
          </span>
          <svg
            className={`w-4 h-4 flex-shrink-0 transition-transform ${langListOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--color-muted)' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {langListOpen && (
          <div
            className="mt-2 rounded-lg border overflow-hidden"
            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-muted)' }}
          >
            <StudyLanguageList onSelect={() => { setLangListOpen(false); onClose(); }} />
          </div>
        )}
      </div>

      {/* Your languages — the management view, where a deck can be removed.
          Separate from the switcher above on purpose: switching is a thing you
          do daily and removing is a thing you do once, so a destructive control
          does not sit in the row you tap to change decks. Hidden while there is
          only one, where there is nothing to manage and removing the last deck
          is refused anyway. */}
      {languages.length > 1 && (
        <div className="px-4 py-3 border-b border-[var(--color-muted)]/50">
          <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'settingsYourLanguages')}
          </p>
          <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'settingsYourLanguagesDesc')}
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {languages.map(pair => (
              <li key={pair.study} className="flex items-center justify-between gap-2 text-sm font-mono">
                <span className="min-w-0 truncate" style={{ color: 'var(--color-text)' }}>
                  {t(interfaceLanguage, getStudyLanguageConfig(pair.study).studyLabelKey)}
                  <span className="opacity-60">
                    {' · '}
                    {t(interfaceLanguage, 'languagePairSummary', {
                      native: t(interfaceLanguage, pair.native === 'Korean' ? 'labelKorean' : 'labelEnglish'),
                    })}
                  </span>
                </span>
                <button
                  onClick={() => confirmRemove(pair.study)}
                  className="text-xs px-2 py-1 rounded-md border flex-shrink-0 transition-colors hover:border-[var(--color-text)]"
                  style={{ borderColor: 'var(--color-muted)', color: 'var(--color-muted)' }}
                >
                  {t(interfaceLanguage, 'removeLanguage')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* App language. Deliberately *not* called "native language" any more:
          it no longer decides what your cards are explained in — each deck
          carries that itself — so naming it for the app is what stops it
          reading as a second answer to the question the rows above ask. */}
      <div className="px-4 py-3 border-b border-[var(--color-muted)]/50">
        <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'settingsAppLanguage')}
        </p>
        <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'settingsAppLanguageDesc')}
        </p>
        <div className="flex gap-2 mt-2">
          {SUPPORTED_NATIVE_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { void setInterfaceLanguage(lang.code); onClose(); }}
              className="flex-1 py-2.5 rounded-lg text-sm font-mono border transition-colors"
              style={
                interfaceLanguage === lang.code
                  ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
                  : { background: 'transparent', color: 'var(--color-text)', borderColor: 'var(--color-muted)' }
              }
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* The hanja partition — which part of the card is on the front.
          Shown only on the deck it describes, and only here: a control that
          reaches into the review session would become a per-session toggle,
          and every switch inherits intervals earned answering a different
          question. Chosen once, like the study language above it. */}
      {studyLanguage === 'Hanja' && (
        <div className="px-4 py-3 border-b border-[var(--color-muted)]/50">
          <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'settingsHanjaPartition')}
          </p>
          <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'settingsHanjaPartitionDesc')}
          </p>
          <div className="flex flex-col gap-2 mt-2">
            {HANJA_PARTITIONS.map((partition) => (
              <button
                key={partition}
                onClick={() => setHanjaPartition(partition)}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-mono border transition-colors"
                style={
                  hanjaPartition === partition
                    ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
                    : { background: 'transparent', color: 'var(--color-text)', borderColor: 'var(--color-muted)' }
                }
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span>{t(interfaceLanguage, partitionLabelKey(partition))}</span>
                  {/* The example on the same line rather than under it. Three
                      two-line rows made this the tallest control in a panel
                      that has five other sections. */}
                  <span className="text-xs opacity-70 shrink-0">
                    {t(interfaceLanguage, partitionExampleKey(partition))}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Theme selector */}
      <div className="px-4 py-3 border-b border-[var(--color-muted)]/50">
        <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'settingsTheme')}
        </p>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {themes.map((th) => (
            <button
              key={th.value}
              onClick={() => setTheme(th.value)}
              className="py-2.5 rounded-lg text-sm font-mono border transition-colors"
              style={
                theme === th.value
                  ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
                  : { background: 'transparent', color: 'var(--color-text)', borderColor: 'var(--color-muted)' }
              }
            >
              {th.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pronunciation speed. One control for every play button in the app —
          term, translation and example sentences all render the same
          PronounceButton, so a second setting would have nothing to name. */}
      <div className="px-4 py-3 border-b border-[var(--color-muted)]/50">
        <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'settingsPronunciationSpeed')}
        </p>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {speeds.map((sp) => (
            <button
              key={sp.value}
              onClick={() => setSpeed(sp.value)}
              className="py-2.5 rounded-lg text-sm font-mono border transition-colors"
              style={
                speed === sp.value
                  ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
                  : { background: 'transparent', color: 'var(--color-text)', borderColor: 'var(--color-muted)' }
              }
            >
              {t(interfaceLanguage, sp.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* What is held, in plain language, next to the control that erases it —
          a privacy policy nobody opens is not the same as telling someone. */}
      <div className="px-4 py-3 border-b border-[var(--color-muted)]/50">
        <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'settingsYourData')}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'settingsYourDataBlurb')}
        </p>
      </div>

      <a
        href={interfaceLanguage === 'Korean' ? '/privacy/ko' : '/privacy'}
        onClick={onClose}
        className="block px-4 py-3 text-sm font-mono hover:bg-[var(--color-muted)]/30 transition-colors"
        style={{ color: 'var(--color-text)' }}
      >
        {t(interfaceLanguage, 'settingsPrivacyPolicy')}
      </a>

      {user && (
        <>
          <button
            onClick={() => { handleSignOut(); onClose(); }}
            className="w-full text-left px-4 py-3 text-sm font-mono hover:bg-[var(--color-muted)]/30 transition-colors"
            style={{ color: 'var(--color-text)' }}
          >
            {t(interfaceLanguage, 'signOut')}
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="w-full text-left px-4 py-3 text-sm font-mono hover:bg-[var(--color-muted)]/30 transition-colors"
            style={{ color: 'var(--color-error, #c0392b)' }}
          >
            {t(interfaceLanguage, 'deleteAccount')}
          </button>
        </>
      )}

      {deleteOpen && <DeleteAccountModal onClose={() => setDeleteOpen(false)} />}
    </>
  );
}
