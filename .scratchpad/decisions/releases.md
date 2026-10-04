# Decisions: Releases

Android distribution and Google Play. Newest first. Indexed from
[status.md](../status.md).

## Play holds on a +82 phone number, and Munli takes the focus back (2026-09-22)

**On hold the same day it was taken up**, on the user's call. Identity
verification for a Korea payments profile delivers its code to a **+82** number,
the country on that field cannot be changed, and the user is abroad without
access to one. Verification is **account-level, not track-level** — there is no
lighter path for the internal track, and the thing internal testing *does* exempt
a new personal account from is the separate **12 testers × 14 days** closed-test
gate before production, which is not this.

**Why a family member's number is not the way around it.** Korean 휴대폰 본인확인
matches the number against the name and 생년월일 registered to it, so a sister's
line fails against the user's own 등본 — and the blend, her number against his
documents, is precisely the mismatch the check exists to catch. Google's stated
consequence for documents that do not match the payments profile is removal of
the account **and its apps**, and this is the Google account that owns Firebase
and the Android OAuth client. Asymmetric downside against a few weeks of
schedule. ⚠️ **The coherent alternative was an account genuinely in her name**
— her 등본, her profile, her legal name public on the listing, her tax liability,
and an ownership transfer later that forces a **new payments profile** anyway.
Rejected as costing more than the wait.

**Korea over Kenya for the payments profile, and it is permanent.** A payments
profile's country cannot be edited — only replaced by a new profile — so this is
settled, not pending. Chosen to sit with the bank account and tax residence
rather than to dodge paperwork. ⚠️ **Korea's price is deferred, not avoided**:
the moment Amgi sells anything or adds IAP, Korean law requires a
**사업자등록번호 and a 통신판매업 신고번호** on the listing. Kenya has no
equivalent step but pays out by USD wire with no US tax treaty. Free
internal-testing distribution is unaffected either way.

**What is already spent and must not be redone.** The 주민등록등본 is in hand.
정부24 issues it as a **password-protected PDF**, which verification cannot open
— strip the password first — and its **도로명주소 must match the payments profile
character for character**, since a 지번/도로명 mismatch is the usual rejection
rather than a bad document.

**Unblocks on** someone in Korea who can receive the code on the user's own line,
or the flight back. One thing untried, and worth one attempt before the flight:
**착신전환** to a foreign number plus the **voice-call** option, which needs
nobody else.

**The item moved High → Parked.** ⚠️ **The hold is the account, not the item** —
steps 2–5 need no Play account and are available any time.

## Amgi goes to Play, on the internal testing track (2026-09-22)

**Taken up the same day it was scoped**, against the trigger set when Android
went sideloaded on 2026-08-22 — *"revisit Play internal testing when re-sending
links costs more than $25 and a review cycle"*. It is worth it: an APK has no
update path at all, so every Android release is a fresh link and a manual
re-install by every tester, and the internal track replaces that with
auto-updates for $25 and no review queue. **Production is explicitly not in
scope.** The steps are the item in **Parked** in [backlog.md](../backlog.md) — it
went on hold the same day, for a reason that has nothing to do with this
decision; the entry above covers it.

Four calls, all the user's:

**A personal developer account, not an organization one.** An organization
account needs a D-U-N-S number — free, but up to ~30 business days — and its
only real benefit is exemption from the closed-testing gate personal accounts
face *before production*. Since production is not the destination, that exemption
buys nothing today. ⚠️ **If production is ever wanted, this is the decision to
revisit first, and it cannot be converted** — it would mean a second account and
a second listing.

**Owned by the Google account that already owns Firebase and the Android OAuth
client.** Registering the Play app-signing SHA-1 and granting the release service
account then happen in one place with no cross-account grants. **This is the
opposite of the iOS situation deliberately**: `com.tegi.amgi` lives on a borrowed
Apple account, `com.miinjaekim.amgi` does not, and Play is not being set up to
repeat that.

**The sideloaded APK channel is retired once Play internal is live**, rather than
run alongside. The two are signed differently, so no tester can move between them
without uninstalling — keeping both means two builds per release, two sets of
instructions, and a one-way door between them. One channel that auto-updates is
the whole point of paying the $25. The cost is paid once, by each tester, at the
switch: uninstalling loses the AsyncStorage layer (streak, offline snapshot,
rating queue). Cards are in Firestore and survive.

**Listing copy in English and Korean**, mirroring `docs/testflight-beta-info.md`.
The app ships both locales throughout and the TestFlight description is most of
the full description already; adding a locale to a listing later is worse than
writing it now.

## Android ships as a sideloaded APK, and auth work leaves Expo Go (2026-08-22)

Android is live as a direct-download APK built on the `preview` profile —
`distribution: internal`, which is what makes EAS emit an APK rather than a
Play-store AAB. Verified end to end on a real device: install, launch, Google
sign-in, cards.

**Play was deferred, not rejected.** Sideloading costs nothing, needs no
account and faces no review, which is why it went first. The price is that an
APK has **no update path at all** — worse than TestFlight, which at least
notifies. Every release is a fresh link (EAS gives each build its own URL) and a
manual re-install by each tester. Installs land over the top with data intact,
since the package name and the EAS-held keystore stay constant; if that keystore
is ever lost, every tester has to uninstall first and loses local data.
Revisit Play internal testing when re-sending links costs more than $25 and a
review cycle.

`com.miinjaekim.amgi` is permanent — it is keyed into the Google OAuth client
and would be keyed into any Play listing. Chosen over the iOS bundle id
(`com.tegi.amgi`) because that one lives on a borrowed Apple account.

**The development-build change is the part that supersedes an earlier call.**
[tech-stack.md](../tech-stack.md) said: develop in Expo Go, build to release.
**Google sign-in on Android was never covered by that.** It does work in Expo
Go on iOS, which is why the loop held for a year — but that depends on
`ASWebAuthenticationSession` intercepting the redirect with nothing registered,
and Android has no equivalent, so its auth surface was untestable under the
documented loop. Four rounds of 20-minute release builds on a borrowed phone is
what that blind spot actually cost.

So a development build (`expo-dev-client`, the `development` profile that had
sat unused in `eas.json` since the abandoned OTA setup) is now the loop for
anything native-adjacent. **This does not touch the no-OTA decision**, which is
about how work reaches users, not how it is tested. Expo Go still works for
ordinary JS, and nothing forces iOS off it — *unless* the native Google Sign-In
module is ever adopted, which would break Expo Go on both platforms at once.

**What is explicitly still open:** whether to migrate to
`@react-native-google-signin`. Custom URI schemes on Android are on borrowed
time — Google restricts them for new clients by default and recommends Google
Identity Services — so the current path works but is not durable. The three
traps that had to be cleared to get here are in [lessons.md](../lessons.md).

**The follow-ups were deliberately not tracked** (user's call, same day). A
backlog item listing them was written and then removed: the APK works, and the
rest was speculative — Android paths nobody has complained about, a migration
with no deadline, a cosmetic scheme duplicate. Tracking them would have kept a
High item open against work nobody intends to do. They get raised again if a
tester hits one, not on a schedule. The two that are real if they ever surface:
**nothing but sign-in has been exercised on Android** (audio, export, sharing,
offline, account deletion, reminders — and reminders need the runtime
`POST_NOTIFICATIONS` grant on 13+ and land in the default "Miscellaneous"
channel), and **removing the redundant `com.miinjaekim.amgi` scheme from
`app.json` is untested** — that array generates the working intent filter, so
verify the redirect still routes before believing it is safe.
