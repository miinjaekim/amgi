'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { notFound, usePathname } from 'next/navigation';
import { useUser } from '@/components/UserContext';
import { useTheme } from '@/components/ThemeContext';
import { usePronunciation } from '@/components/PronunciationContext';
import { SUPPORTED_NATIVE_LANGUAGES } from '@/services/userPreferences';
import {
  HANJA_PARTITIONS, cardsToAnki, cardsToCSV, getStudyLanguageConfig, modeFromPath,
  type HanjaPartition, type StudyLanguage, type TranslationKey,
} from '@amgi/core';
import { fetchAllCardsForExport } from '@/services/firestore';
import { downloadFile } from '@/lib/download';
import { settingsHome } from '@/lib/mode';
import { t } from '@/lib/i18n';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import StudyLanguageList from '@/components/StudyLanguageList';
import { SettingsRow, RowSeparator, SwitchModeRow, type SettingsIcon } from '@/components/SettingsRows';

/**
 * Settings: a list you skim, and a page per row.
 *
 * The same shape as mobile's `app/settings/`, row for row, minus Reminders —
 * web schedules no notifications. Three groups, and the order is the argument:
 * what you tune, then what you look up, then the account, last and alone,
 * because that is where the destructive actions are.
 *
 * The section names double as the last path segment, so `/settings/languages`
 * is the Languages page on both platforms.
 */
const SECTIONS = {
  languages: { titleKey: 'settingsLanguages', Body: LanguagesSection },
  appearance: { titleKey: 'settingsAppearance', Body: AppearanceSection },
  pronunciation: { titleKey: 'settingsPronunciation', Body: PronunciationSection },
  data: { titleKey: 'settingsYourData', Body: DataSection },
  about: { titleKey: 'settingsAbout', Body: AboutSection },
  account: { titleKey: 'settingsAccount', Body: AccountSection },
} satisfies Partial<Record<SettingsIcon, { titleKey: TranslationKey; Body: React.FC }>>;

type Section = keyof typeof SECTIONS;

function useSettingsHome() {
  return settingsHome(modeFromPath(usePathname()));
}

export function SettingsList() {
  const { user, authLoading, interfaceLanguage } = useUser();
  const home = useSettingsHome();
  const row = (section: Section) => (
    <SettingsRow icon={section} labelKey={SECTIONS[section].titleKey} href={`${home}/${section}`} />
  );

  return (
    <div className="max-w-xl mx-auto font-mono">
      <h1 className="text-2xl font-bold mb-5" style={{ color: 'var(--color-highlight)' }}>
        {t(interfaceLanguage, 'settingsTitle')}
      </h1>

      {!authLoading && (
        user ? (
          <div className="flex items-center gap-3 px-4 pb-3">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
              >
                {(user.displayName ?? user.email ?? '?')[0].toUpperCase()}
              </span>
            )}
            <span className="min-w-0">
              {user.displayName && <span className="block truncate font-semibold">{user.displayName}</span>}
              <span className="block truncate text-sm" style={{ color: 'var(--color-muted)' }}>{user.email}</span>
            </span>
          </div>
        ) : (
          <p className="px-4 pb-3 text-sm" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'settingsNotSignedIn')}
          </p>
        )
      )}

      <RowSeparator />
      {/* First, because the mode decides what the rows under it mean: the
          themes Appearance offers are the current mode's. */}
      <SwitchModeRow />
      {row('languages')}
      {row('appearance')}
      {row('pronunciation')}
      <RowSeparator />
      {row('data')}
      {row('about')}
      <RowSeparator />
      {row('account')}
    </div>
  );
}

export function SettingsDetail({ section }: { section: string }) {
  const { interfaceLanguage } = useUser();
  const home = useSettingsHome();
  if (!Object.hasOwn(SECTIONS, section)) notFound();
  const { titleKey, Body } = SECTIONS[section as Section];

  return (
    <div className="max-w-xl mx-auto font-mono">
      <Link
        href={home}
        className="inline-flex items-center gap-1.5 text-sm mb-3 hover:underline"
        style={{ color: 'var(--color-muted)' }}
      >
        <span aria-hidden>←</span>
        {t(interfaceLanguage, 'settingsTitle')}
      </Link>
      <h1 className="text-2xl font-bold mb-5" style={{ color: 'var(--color-highlight)' }}>
        {t(interfaceLanguage, titleKey)}
      </h1>
      <Body />
    </div>
  );
}

/** A labelled card — one setting, with the sentence that explains it. */
function Card({ labelKey, descKey, children }: { labelKey?: TranslationKey; descKey?: TranslationKey; children: React.ReactNode }) {
  const { interfaceLanguage } = useUser();
  return (
    <section
      className="rounded-xl border p-4 mb-5"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
    >
      {labelKey && (
        <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, labelKey)}
        </p>
      )}
      {descKey && (
        <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, descKey)}
        </p>
      )}
      <div className={labelKey ? 'mt-3' : ''}>{children}</div>
    </section>
  );
}

/** One option among several: filled when it is the one in force. */
function choiceStyle(active: boolean): React.CSSProperties {
  return active
    ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
    : { background: 'transparent', color: 'var(--color-text)', borderColor: 'var(--color-muted)' };
}
const CHOICE_CLASS = 'py-2.5 px-3 rounded-lg text-sm font-mono border transition-colors';

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

function LanguagesSection() {
  const {
    interfaceLanguage, languages, studyLanguage, hanjaPartition,
    setInterfaceLanguage, setHanjaPartition, removeLanguage,
  } = useUser();

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
      {/* Study language — the decks you have added. The list is open on a page:
          the disclosure it sat behind existed to save height in a popover. */}
      <Card labelKey="settingsStudyLanguage" descKey="settingsStudyLanguageDesc">
        <div
          className="rounded-lg border overflow-hidden"
          style={{ background: 'var(--color-bg)', borderColor: 'var(--color-muted)' }}
        >
          <StudyLanguageList />
        </div>
      </Card>

      {/* Your languages — the management view, where a deck can be removed.
          Separate from the switcher above on purpose: switching is a thing you
          do daily and removing is a thing you do once, so a destructive control
          does not sit in the row you tap to change decks. Hidden while there is
          only one, where there is nothing to manage and removing the last deck
          is refused anyway. */}
      {languages.length > 1 && (
        <Card labelKey="settingsYourLanguages" descKey="settingsYourLanguagesDesc">
          <ul className="flex flex-col gap-1">
            {languages.map(pair => (
              <li key={pair.study} className="flex items-center justify-between gap-2 text-sm">
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
        </Card>
      )}

      {/* App language. Deliberately *not* called "native language" any more:
          it no longer decides what your cards are explained in — each deck
          carries that itself — so naming it for the app is what stops it
          reading as a second answer to the question the cards above ask. */}
      <Card labelKey="settingsAppLanguage" descKey="settingsAppLanguageDesc">
        <div className="flex gap-2">
          {SUPPORTED_NATIVE_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { void setInterfaceLanguage(lang.code); }}
              className={`flex-1 ${CHOICE_CLASS}`}
              style={choiceStyle(interfaceLanguage === lang.code)}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </Card>

      {/* The hanja partition — which part of the card is on the front.
          Shown only on the deck it describes, and only here: a control that
          reaches into the review session would become a per-session toggle,
          and every switch inherits intervals earned answering a different
          question. Chosen once, like the study language above it. */}
      {studyLanguage === 'Hanja' && (
        <Card labelKey="settingsHanjaPartition" descKey="settingsHanjaPartitionDesc">
          <div className="flex flex-col gap-2">
            {HANJA_PARTITIONS.map((partition) => (
              <button
                key={partition}
                onClick={() => setHanjaPartition(partition)}
                className={`w-full text-left ${CHOICE_CLASS}`}
                style={choiceStyle(hanjaPartition === partition)}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span>{t(interfaceLanguage, partitionLabelKey(partition))}</span>
                  <span className="text-xs opacity-70 shrink-0">
                    {t(interfaceLanguage, partitionExampleKey(partition))}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

function AppearanceSection() {
  // `themes` is the current mode's list — which is why settings is mounted
  // under each mode's path rather than once.
  const { theme, setTheme, themes } = useTheme();
  return (
    <Card labelKey="settingsTheme">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {themes.map((th) => (
          <button
            key={th.value}
            onClick={() => setTheme(th.value)}
            className={CHOICE_CLASS}
            style={choiceStyle(theme === th.value)}
          >
            {th.label}
          </button>
        ))}
      </div>
    </Card>
  );
}

/**
 * Pronunciation speed, one row per kind of text: a word and a sentence want
 * different paces on every screen, which is why the split is by content rather
 * than by surface. See `PronunciationKind`.
 */
function PronunciationSection() {
  const { interfaceLanguage } = useUser();
  const { speeds, setSpeed, options, kinds } = usePronunciation();
  return (
    <Card labelKey="settingsPronunciationSpeed" descKey="settingsPronunciationSpeedDesc">
      {kinds.map(({ kind, labelKey }, i) => (
        <div key={kind} className={i > 0 ? 'mt-4' : ''}>
          <p className="text-xs" style={{ color: 'var(--color-text)' }}>
            {t(interfaceLanguage, labelKey)}
          </p>
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            {options.map((sp) => (
              <button
                key={sp.value}
                onClick={() => setSpeed(kind, sp.value)}
                className={CHOICE_CLASS}
                style={choiceStyle(speeds[kind] === sp.value)}
              >
                {t(interfaceLanguage, sp.labelKey)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </Card>
  );
}

/**
 * What is held, in plain language, and a way to take a copy of it — a privacy
 * policy nobody opens is not the same as telling someone.
 *
 * The export is in settings rather than on My Cards since 2026-09-25: a copy
 * of your data belongs with the account that can erase it, which is also where
 * the privacy policy and the delete warning send you. That is why it takes
 * everything — see `cardsToCSV` — rather than whatever a list happened to be
 * filtered to.
 */
function DataSection() {
  const { user, interfaceLanguage, languages } = useUser();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const run = async (format: 'csv' | 'anki') => {
    if (!user) return;
    setBusy(true);
    setFailed(false);
    try {
      const cards = await fetchAllCardsForExport(user.uid);
      if (format === 'csv') downloadFile(cardsToCSV(cards, languages), 'amgi-cards.csv', 'text/csv');
      else downloadFile(cardsToAnki(cards, languages), 'amgi-cards.txt', 'text/plain');
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const buttonClass = 'flex-1 py-2 rounded-lg text-sm font-mono border transition-colors hover:border-[var(--color-text)] disabled:opacity-40 disabled:cursor-wait';

  return (
    <Card>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'settingsYourDataBlurb')}
      </p>
      {user && (
        <div className="mt-4 pt-4 border-t border-[var(--color-muted)]/40">
          <p className="text-sm" style={{ color: 'var(--color-text)' }}>
            {t(interfaceLanguage, 'settingsExportCards')}
          </p>
          <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'settingsExportCardsDesc')}
          </p>
          <div className="flex gap-2 mt-3">
            <button onClick={() => run('csv')} disabled={busy} className={buttonClass} style={choiceStyle(false)}>
              {t(interfaceLanguage, 'cardsExportCSV')}
            </button>
            <button onClick={() => run('anki')} disabled={busy} className={buttonClass} style={choiceStyle(false)}>
              {t(interfaceLanguage, 'cardsExportAnki')}
            </button>
          </div>
          {failed && (
            <p className="text-xs mt-2" style={{ color: 'var(--color-error, #c0392b)' }}>
              {t(interfaceLanguage, 'settingsExportFailed')}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function AboutSection() {
  const { interfaceLanguage } = useUser();
  return (
    <Card>
      <Link
        href={interfaceLanguage === 'Korean' ? '/privacy/ko' : '/privacy'}
        className="flex items-center justify-between text-sm hover:underline"
        style={{ color: 'var(--color-text)' }}
      >
        {t(interfaceLanguage, 'settingsPrivacyPolicy')}
        <span aria-hidden style={{ color: 'var(--color-muted)' }}>→</span>
      </Link>
    </Card>
  );
}

/**
 * Signing out and deleting the account — the two actions that end something,
 * on a page of their own so neither sits beside a row clicked daily.
 */
function AccountSection() {
  const { user, authLoading, interfaceLanguage, handleSignIn, handleSignOut } = useUser();
  const [deleteOpen, setDeleteOpen] = useState(false);
  if (authLoading) return null;

  if (!user) {
    return (
      <>
        <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'settingsNotSignedIn')}
        </p>
        <button
          onClick={handleSignIn}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors"
          style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
        >
          {t(interfaceLanguage, 'settingsSignInWithGoogle')}
        </button>
      </>
    );
  }

  return (
    <>
      <p className="text-sm mb-4 truncate" style={{ color: 'var(--color-muted)' }}>{user.email}</p>
      <button
        onClick={() => handleSignOut()}
        className={`w-full ${CHOICE_CLASS} hover:border-[var(--color-text)]`}
        style={choiceStyle(false)}
      >
        {t(interfaceLanguage, 'signOut')}
      </button>
      {/* Deliberately quieter than sign out: findable, but not sitting at the
          same visual weight as the thing people click. */}
      <button
        onClick={() => setDeleteOpen(true)}
        className="w-full mt-4 py-2 text-sm hover:underline"
        style={{ color: 'var(--color-error, #c0392b)' }}
      >
        {t(interfaceLanguage, 'deleteAccount')}
      </button>
      <p className="text-xs text-center leading-snug" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'deleteAccountBlurb')}
      </p>
      {deleteOpen && <DeleteAccountModal onClose={() => setDeleteOpen(false)} />}
    </>
  );
}
