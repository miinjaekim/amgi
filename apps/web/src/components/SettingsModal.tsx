'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser } from '@/components/UserContext';
import { useTheme } from '@/components/ThemeContext';
import { usePronunciation } from '@/components/PronunciationContext';
import { SUPPORTED_NATIVE_LANGUAGES } from '@/services/userPreferences';
import {
  HANJA_PARTITIONS, cardsToAnki, cardsToCSV, getStudyLanguageConfig,
  type HanjaPartition, type StudyLanguage, type TranslationKey,
} from '@amgi/core';
import { fetchAllCardsForExport } from '@/services/firestore';
import { downloadFile } from '@/lib/download';
import { t } from '@/lib/i18n';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import StudyLanguageList from '@/components/StudyLanguageList';
import { SettingsIcon, type SettingsIconName } from '@/components/SettingsRows';

/**
 * Settings, as a modal: sections down the left, the chosen one on the right.
 *
 * ⚠️ **A modal, not a route, and not mobile's list of screens.** Both were
 * tried on 2026-10-04. A `/settings` route built row for row like mobile's
 * read as a phone screen centred on a monitor — too small, and not how a web
 * app does it. The user's reference is Claude's: a small account menu, and a
 * large settings modal behind its Settings row. What the two platforms share
 * is the idea (skim the sections, open one), not the layout.
 *
 * **Being a modal also answers which mode's settings these are.** It opens
 * over the page you are on, so the path still says the mode, and the theme
 * picker offers that mode's themes with nothing passed along. A route outside
 * every mode's tree could not know.
 *
 * Four sections where mobile has seven screens: a pane this size holds more,
 * so theme and pronunciation share General, and the privacy policy sits with
 * the data it is about.
 */
type Section = 'general' | 'languages' | 'data' | 'account';

const NAV: { section: Section; icon: SettingsIconName; labelKey: TranslationKey }[] = [
  { section: 'general', icon: 'settings', labelKey: 'settingsGeneral' },
  { section: 'languages', icon: 'languages', labelKey: 'settingsLanguages' },
  { section: 'data', icon: 'data', labelKey: 'settingsYourData' },
  { section: 'account', icon: 'account', labelKey: 'settingsAccount' },
];

const PANES: Record<Section, React.FC> = {
  general: GeneralPane,
  languages: LanguagesPane,
  data: DataPane,
  account: AccountPane,
};

const SettingsModalContext = createContext<{ open: (section?: Section) => void }>({ open: () => {} });

/** Open settings from anywhere under the provider, optionally on a section. */
export const useSettingsModal = () => useContext(SettingsModalContext);

/**
 * Holds whether settings is open. Above the navs rather than inside the menu
 * that opens it: the menu's popover closes on the same click, and the modal
 * has to outlive it.
 */
export function SettingsModalProvider({ children }: { children: React.ReactNode }) {
  const [section, setSection] = useState<Section | null>(null);
  return (
    <SettingsModalContext.Provider value={{ open: (s = 'general') => setSection(s) }}>
      {children}
      {section && <SettingsModal section={section} onSection={setSection} onClose={() => setSection(null)} />}
    </SettingsModalContext.Provider>
  );
}

function SettingsModal({ section, onSection, onClose }: {
  section: Section;
  onSection: (section: Section) => void;
  onClose: () => void;
}) {
  const { interfaceLanguage } = useUser();
  const Pane = PANES[section];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t(interfaceLanguage, 'settingsTitle')}
      onClick={onClose}
    >
      {/* Full screen on a phone, where a floating panel would leave no room;
          there the sections run across the top instead of down the side. */}
      <div
        className="relative flex flex-col sm:flex-row w-full h-full sm:max-w-4xl sm:h-[min(44rem,100%)] sm:rounded-2xl sm:border overflow-hidden"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}
        onClick={e => e.stopPropagation()}
      >
        <nav
          className="flex-shrink-0 sm:w-60 flex sm:flex-col gap-1 p-3 pr-14 sm:pr-3 overflow-x-auto border-b sm:border-b-0 sm:border-r border-[var(--color-muted)]/40"
          style={{ background: 'var(--color-bg)' }}
        >
          <p className="hidden sm:block px-3 pt-2 pb-2 text-sm" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'settingsTitle')}
          </p>
          {NAV.map(item => {
            const active = item.section === section;
            return (
              <button
                key={item.section}
                onClick={() => onSection(item.section)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base whitespace-nowrap text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-highlight)] ${
                  active ? 'bg-[var(--color-muted)]/25 font-semibold' : 'hover:bg-[var(--color-muted)]/15'
                }`}
              >
                <SettingsIcon name={item.icon} />
                {t(interfaceLanguage, item.labelKey)}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-10 py-6 sm:py-9">
          <Pane />
        </div>

        <button
          onClick={onClose}
          aria-label={t(interfaceLanguage, 'helpClose')}
          // Opaque on a phone, where it sits over the end of the section strip
          // and the strip scrolls underneath it.
          className="absolute top-3 right-3 p-2 rounded-lg transition-colors bg-[var(--color-bg)] sm:bg-transparent hover:bg-[var(--color-muted)]/20"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/** A titled run of settings, ruled between rows. */
function Group({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="mb-10 last:mb-0">
      <h2 className="text-xl font-semibold pr-10">{title}</h2>
      {desc && <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--color-muted)' }}>{desc}</p>}
      <div className="mt-2 divide-y divide-[var(--color-muted)]/30">{children}</div>
    </section>
  );
}

/**
 * One setting: what it is on the left, the control on the right. `stacked`
 * puts the control underneath, for one too wide to share the line.
 */
function Row({ label, desc, stacked, children }: { label: string; desc?: string; stacked?: boolean; children: React.ReactNode }) {
  return (
    <div className={`py-4 flex gap-x-6 gap-y-3 ${stacked ? 'flex-col' : 'flex-wrap items-center justify-between'}`}>
      {/* The basis is what makes a wide control wrap under its label on a
          narrow pane instead of crushing it. Stacked, there is nothing to
          share the line with. */}
      <div className={stacked ? '' : 'min-w-0 flex-1 basis-40'}>
        <p className="text-base">{label}</p>
        {desc && <p className="text-sm mt-0.5 leading-relaxed" style={{ color: 'var(--color-muted)' }}>{desc}</p>}
      </div>
      <div className={stacked ? '' : 'flex-shrink-0'}>{children}</div>
    </div>
  );
}

/** A few options side by side, the one in force filled. */
function Segmented<T extends string | number>({ options, value, onChange }: {
  options: { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl p-1 bg-[var(--color-muted)]/20">
      {options.map(option => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className="px-3.5 py-1.5 rounded-lg text-sm transition-colors"
            style={active
              ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', fontWeight: 600 }
              : { color: 'var(--color-text)' }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

const BUTTON_CLASS = 'px-4 py-2 rounded-lg text-sm border transition-colors hover:border-[var(--color-text)] disabled:opacity-40 disabled:cursor-wait';
const BUTTON_STYLE = { borderColor: 'var(--color-muted)', color: 'var(--color-text)' };

function GeneralPane() {
  const { interfaceLanguage } = useUser();
  // `themes` is the list for the mode of the page underneath.
  const { theme, setTheme, themes } = useTheme();
  const { speeds, setSpeed, options, kinds } = usePronunciation();

  return (
    <>
      <Group title={t(interfaceLanguage, 'settingsAppearance')}>
        <Row label={t(interfaceLanguage, 'settingsTheme')}>
          <Segmented options={themes} value={theme} onChange={setTheme} />
        </Row>
      </Group>

      {/* Pronunciation speed, one row per kind of text: a word and a sentence
          want different paces on every screen, which is why the split is by
          content rather than by surface. See `PronunciationKind`. */}
      <Group
        title={t(interfaceLanguage, 'settingsPronunciationSpeed')}
        desc={t(interfaceLanguage, 'settingsPronunciationSpeedDesc')}
      >
        {kinds.map(({ kind, labelKey }) => (
          <Row key={kind} label={t(interfaceLanguage, labelKey)}>
            <Segmented
              options={options.map(o => ({ value: o.value, label: t(interfaceLanguage, o.labelKey) }))}
              value={speeds[kind]}
              onChange={value => setSpeed(kind, value)}
            />
          </Row>
        ))}
      </Group>
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

function LanguagesPane() {
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
    <Group title={t(interfaceLanguage, 'settingsLanguages')}>
      {/* Study language — the decks you have added. The list is open here:
          the disclosure it sat behind existed to save height in a popover. */}
      <Row
        stacked
        label={t(interfaceLanguage, 'settingsStudyLanguage')}
        desc={t(interfaceLanguage, 'settingsStudyLanguageDesc')}
      >
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-muted)' }}>
          <StudyLanguageList />
        </div>
      </Row>

      {/* Your languages — the management view, where a deck can be removed.
          Separate from the switcher above on purpose: switching is a thing you
          do daily and removing is a thing you do once, so a destructive control
          does not sit in the row you click to change decks. Hidden while there
          is only one, where there is nothing to manage and removing the last
          deck is refused anyway. */}
      {languages.length > 1 && (
        <Row
          stacked
          label={t(interfaceLanguage, 'settingsYourLanguages')}
          desc={t(interfaceLanguage, 'settingsYourLanguagesDesc')}
        >
          <ul className="flex flex-col gap-2">
            {languages.map(pair => (
              <li key={pair.study} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">
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
                  className="text-sm px-3 py-1 rounded-lg border flex-shrink-0 transition-colors hover:border-[var(--color-text)]"
                  style={{ borderColor: 'var(--color-muted)', color: 'var(--color-muted)' }}
                >
                  {t(interfaceLanguage, 'removeLanguage')}
                </button>
              </li>
            ))}
          </ul>
        </Row>
      )}

      {/* App language. Deliberately *not* called "native language" any more:
          it no longer decides what your cards are explained in — each deck
          carries that itself — so naming it for the app is what stops it
          reading as a second answer to the question the rows above ask. */}
      <Row
        label={t(interfaceLanguage, 'settingsAppLanguage')}
        desc={t(interfaceLanguage, 'settingsAppLanguageDesc')}
      >
        <Segmented
          options={SUPPORTED_NATIVE_LANGUAGES.map(lang => ({ value: lang.code, label: lang.label }))}
          value={interfaceLanguage}
          onChange={code => { void setInterfaceLanguage(code); }}
        />
      </Row>

      {/* The hanja partition — which part of the card is on the front.
          Shown only on the deck it describes, and only here: a control that
          reaches into the review session would become a per-session toggle,
          and every switch inherits intervals earned answering a different
          question. Chosen once, like the study language above it. */}
      {studyLanguage === 'Hanja' && (
        <Row
          stacked
          label={t(interfaceLanguage, 'settingsHanjaPartition')}
          desc={t(interfaceLanguage, 'settingsHanjaPartitionDesc')}
        >
          <div className="grid sm:grid-cols-3 gap-2">
            {HANJA_PARTITIONS.map((partition) => {
              const active = hanjaPartition === partition;
              return (
                <button
                  key={partition}
                  onClick={() => setHanjaPartition(partition)}
                  aria-pressed={active}
                  className="text-left px-3.5 py-2.5 rounded-xl text-sm border transition-colors"
                  style={active
                    ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
                    : { borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}
                >
                  <span className="block font-semibold">{t(interfaceLanguage, partitionLabelKey(partition))}</span>
                  <span className="block opacity-70 mt-0.5">{t(interfaceLanguage, partitionExampleKey(partition))}</span>
                </button>
              );
            })}
          </div>
        </Row>
      )}
    </Group>
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
function DataPane() {
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

  return (
    <Group title={t(interfaceLanguage, 'settingsYourData')} desc={t(interfaceLanguage, 'settingsYourDataBlurb')}>
      {user && (
        <Row label={t(interfaceLanguage, 'settingsExportCards')} desc={t(interfaceLanguage, 'settingsExportCardsDesc')}>
          <div className="flex gap-2">
            <button onClick={() => run('csv')} disabled={busy} className={BUTTON_CLASS} style={BUTTON_STYLE}>
              {t(interfaceLanguage, 'cardsExportCSV')}
            </button>
            <button onClick={() => run('anki')} disabled={busy} className={BUTTON_CLASS} style={BUTTON_STYLE}>
              {t(interfaceLanguage, 'cardsExportAnki')}
            </button>
          </div>
          {failed && (
            <p className="text-sm mt-2" style={{ color: 'var(--color-error, #c0392b)' }}>
              {t(interfaceLanguage, 'settingsExportFailed')}
            </p>
          )}
        </Row>
      )}
      {/* A new tab, so reading the policy does not cost the open modal. */}
      <Row label={t(interfaceLanguage, 'settingsPrivacyPolicy')}>
        <a
          href={interfaceLanguage === 'Korean' ? '/privacy/ko' : '/privacy'}
          target="_blank"
          rel="noreferrer"
          aria-label={t(interfaceLanguage, 'settingsPrivacyPolicy')}
          className={`inline-flex ${BUTTON_CLASS}`}
          style={BUTTON_STYLE}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </Row>
    </Group>
  );
}

/**
 * Signing out and deleting the account — the two actions that end something,
 * in the last section so neither sits beside a setting changed often.
 */
function AccountPane() {
  const { user, authLoading, interfaceLanguage, handleSignIn, handleSignOut } = useUser();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const title = t(interfaceLanguage, 'settingsAccount');
  if (authLoading) return null;

  if (!user) {
    return (
      <Group title={title}>
        <Row label={t(interfaceLanguage, 'settingsNotSignedIn')}>
          <button
            onClick={handleSignIn}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
          >
            {t(interfaceLanguage, 'settingsSignInWithGoogle')}
          </button>
        </Row>
      </Group>
    );
  }

  return (
    <Group title={title}>
      <Row label={user.displayName ?? user.email ?? ''} desc={user.displayName ? user.email ?? undefined : undefined}>
        <button onClick={() => handleSignOut()} className={BUTTON_CLASS} style={BUTTON_STYLE}>
          {t(interfaceLanguage, 'signOut')}
        </button>
      </Row>
      <Row label={t(interfaceLanguage, 'deleteAccount')} desc={t(interfaceLanguage, 'deleteAccountBlurb')}>
        <button
          onClick={() => setDeleteOpen(true)}
          className="px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-[var(--color-error,#c0392b)]/10"
          style={{ borderColor: 'var(--color-error, #c0392b)', color: 'var(--color-error, #c0392b)' }}
        >
          {t(interfaceLanguage, 'deleteAccount')}
        </button>
      </Row>
      {deleteOpen && <DeleteAccountModal onClose={() => setDeleteOpen(false)} />}
    </Group>
  );
}
