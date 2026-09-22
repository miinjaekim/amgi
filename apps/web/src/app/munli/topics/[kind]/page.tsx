'use client';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { enrolledTenses, isEnrolled, setEnrolled, subjectKey, subjectsOfKind } from '@amgi/core';
import type { ConjugationSubject } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { useConjugation } from '@/hooks/useConjugation';
import ParadigmTable from '@/components/ParadigmTable';
import PageHeader from '@/components/PageHeader';
import MultiSelect from '@/components/MultiSelect';
import { t } from '@/lib/i18n';

/**
 * One verb topic — regular or irregular. Read any table, save what you want to
 * practise.
 *
 * ⚠️ **Two topics through one page, keyed on `kind`.** They differ in what they
 * list, not in how they work — two files would be two copies of the same Save
 * semantics.
 *
 * ⚠️ **Content first, saving second — the decks page's shape, not a form.**
 * ⚠️ **The tense chips are a *view*; Save is what commits.** Selecting the
 * imparfait shows it without enrolling it, which is how somebody decides whether
 * to take it on.
 *
 * **One verb at a time, across tenses.** The verbs inside a group conjugate
 * identically, so a column per verb would print one pattern three times; the
 * chips swap which verb the pattern lands on instead.
 */
export default function VerbTopicPage() {
  const { interfaceLanguage } = useUser();
  const { spec, enrolment, setEnrolment, loading } = useConjugation();
  // Anything unrecognised reads as regular rather than erroring: the cost of
  // being wrong is landing on the topic that has content in it.
  const irregular = useParams<{ kind: string }>().kind === 'irregular';
  const [chosenTenses, setChosenTenses] = useState<string[] | null>(null);
  const [vehicles, setVehicles] = useState<Record<string, string>>({});
  /**
   * Which groups are shown. `null` means "has not narrowed", i.e. all of them —
   * distinct from the empty array, which is the real state of having deselected
   * everything.
   */
  const [chosenGroups, setChosenGroups] = useState<string[] | null>(null);

  /**
   * `null` reads as the tenses already saved, so the page opens on what is being
   * practised — adding one is: pick it in the filter, look at it, Save.
   */
  const tenseIds = useMemo(() => {
    if (chosenTenses) return chosenTenses;
    if (!spec || !enrolment) return [];
    const saved = enrolledTenses(spec, enrolment).map(tense => tense.id);
    return saved.length > 0 ? saved : [spec.tenses[0].id];
  }, [chosenTenses, spec, enrolment]);

  /**
   * ⚠️ **Nothing here may paint before the snapshot lands.**
   *
   * `users/{uid}` is subscribed to, not fetched, so `conjugation` is
   * `undefined` until the first snapshot — and both fallbacks for that are
   * *plausible*: `normalizeEnrolment` returns the default practice set, and an
   * empty progress map reads as everything due.
   *
   * ⚠️ **On a surface that writes, it is worse than a wrong picture.**
   * `setEnrolled` takes the enrolment it is handed, so a tap during the window
   * would write *default plus that change* over the real saved set. That is
   * data loss, from a control that looked ready.
   *
   * The window is one round trip, and it was invisible until the 2026-09-22
   * launch work began painting before the server answered. It was always here.
   */
  if (loading || !spec || !enrolment) {
    return (
      <div className="max-w-2xl">
        <PageHeader titleKey={irregular ? 'verbsIrregular' : 'topicRegularVerbs'} />
        <p className="font-mono text-sm" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, loading ? 'munliLoading' : 'conjugationUnavailable')}
        </p>
      </div>
    );
  }

  const section = (subject: ConjugationSubject) => {
    const key = `${subject.kind}:${subject.id}`;
    const vehicleList = subject.kind === 'group' ? subject.vehicles : [subject.infinitive];
    const vehicle = vehicles[key] ?? vehicleList[0];
    const shown = tenseIds.filter(id => subject.kind === 'group' || subject.forms[id]);

    return (
      <section key={key} className="pb-6 mb-6 border-b" style={{ borderColor: 'var(--color-muted)' }}>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="font-mono text-lg font-bold flex-1" style={{ color: 'var(--color-text)' }}>
            {subject.kind === 'group' ? subject.label : subject.infinitive}
          </h2>
          {/* Which verb the pattern is shown through — one answer at a time. */}
          {vehicleList.length > 1 && (
            <MultiSelect
              label={t(interfaceLanguage, 'verbsFilterVerb')}
              options={vehicleList.map(v => ({ key: v, label: v }))}
              selected={vehicle}
              onToggle={v => setVehicles(prev => ({ ...prev, [key]: v }))}
            />
          )}
        </div>

        {/* ⚠️ **One save control per tense, not one per group.** Enrolment is per
            subject-and-tense pair, and a single button could only say "all of
            these" or "not all of these" — so two saved out of three read as
            nothing saved. A pill each states its own answer and toggles exactly
            its own pair. */}
        <div className="flex flex-wrap gap-1.5">
          {shown.map(tenseId => {
            const tense = spec.tenses.find(x => x.id === tenseId);
            if (!tense) return null;
            const on = isEnrolled(enrolment, subject, tenseId);
            return (
              <button
                key={tenseId}
                aria-pressed={on}
                aria-label={t(interfaceLanguage, on ? 'verbsSaved' : 'verbsSave', { tense: tense.label })}
                onClick={() => setEnrolment(setEnrolled(enrolment, subject, [tenseId], !on))}
                className="px-3 py-1 rounded-full text-xs font-mono font-bold border transition-colors"
                style={on
                  ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
                  : { color: 'var(--color-highlight)', borderColor: 'var(--color-highlight)' }}
              >
                {on ? '✓' : '+'} {tense.label}
              </button>
            );
          })}
        </div>

        <ParadigmTable spec={spec} subject={subject} vehicle={vehicle} tenseIds={shown} />
      </section>
    );
  };

  const allSubjects = subjectsOfKind(spec, irregular ? 'verb' : 'group');
  const subjects = allSubjects.filter(
    subject => chosenGroups?.includes(subjectKey(subject)) ?? true,
  );

  return (
    <div className="max-w-2xl">
      <PageHeader titleKey={irregular ? 'verbsIrregular' : 'topicRegularVerbs'} className="mb-1" />
      <p className="font-mono text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, irregular ? 'irregularIntro' : 'verbsIntro')}
      </p>

      <div className="flex flex-wrap gap-2 mb-2">
        <MultiSelect
          label={t(interfaceLanguage, 'verbsFilterTenses')}
          options={spec.tenses.map(tense => ({ key: tense.id, label: tense.label }))}
          selected={tenseIds}
          onToggle={key => setChosenTenses(
            tenseIds.includes(key) ? tenseIds.filter(id => id !== key) : [...tenseIds, key],
          )}
        />
        {allSubjects.length > 1 && (
          <MultiSelect
            label={t(interfaceLanguage, 'verbsFilterGroups')}
            options={allSubjects.map(subject => ({
              key: subjectKey(subject),
              label: subject.kind === 'group' ? subject.label : subject.infinitive,
            }))}
            selected={subjects.map(subjectKey)}
            onToggle={key => {
              const shownKeys = subjects.map(subjectKey);
              setChosenGroups(
                shownKeys.includes(key) ? shownKeys.filter(k => k !== key) : [...shownKeys, key],
              );
            }}
          />
        )}
      </div>
      <p className="font-mono text-xs mb-8" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'verbsSaveHint')}
      </p>

      {/* An empty topic is the irregulars until they are sourced — it says so
          rather than rendering a page with nothing on it. */}
      {allSubjects.length === 0
        ? <p className="font-mono text-sm" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'verbsIrregularEmpty')}
          </p>
        : tenseIds.length === 0 || subjects.length === 0
          ? <p className="font-mono text-sm" style={{ color: 'var(--color-muted)' }}>
              {t(interfaceLanguage, 'verbsFilterNone')}
            </p>
          : subjects.map(section)}
    </div>
  );
}
