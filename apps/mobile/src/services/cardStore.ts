/**
 * A counter that moves whenever the card collection changes.
 *
 * Expo Router keeps tab screens mounted once visited, so a list that loads in
 * an effect keyed on `[user, studyLanguage]` never reloads — saving a card on
 * Learn left Cards and Review showing what they had at first mount, and only
 * killing the process fixed it.
 *
 * The bump lives inside the Firestore service rather than at the call sites.
 * The backlog's version of this fix noted the risk that "every write path has
 * to remember to bump it", and a write path that forgets reintroduces exactly
 * the bug being fixed — so the writes do it themselves and callers cannot
 * forget. Nothing subscribes: screens read the value when they regain focus,
 * which keeps a mutation from re-rendering surfaces that are not on screen.
 */
let version = 0;

/** Called by every mutating write in `services/firestore`. */
export function notifyCardsChanged(): void {
  version += 1;
}

export function getCardsVersion(): number {
  return version;
}
