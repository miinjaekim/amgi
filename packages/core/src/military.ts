import type { PackSection, VocabPack } from './packs';

/**
 * Korean–English military terminology, for the job a **military English
 * interpreter** does: standing between a ROK unit and a US one and producing
 * the *other side's* word for something, immediately, out loud.
 *
 * Two packs, split by register rather than by difficulty — neither is the
 * beginner one:
 *
 * - **부대·참모** (`military-unit`): a unit and a combined staff. Ranks,
 *   echelons, orders, radio procedure, supply, casualty handling, barracks
 *   life. The failure mode is stumbling.
 *   Draft review: docs/packs/military-unit-pack-draft.md
 * - **안보·정세** (`military-affairs`): a briefing and a press statement. The
 *   alliance, the North Korean threat picture, missiles and nuclear, named
 *   organizations, maritime sovereignty, commemoration. The failure mode is
 *   worse — saying "joint" where the relationship requires "combined", in front
 *   of people who will quote it.
 *   Draft review: docs/packs/military-affairs-pack-draft.md
 *
 * **These are the first packs authored as pairs rather than as entries.** Every
 * other pack has one study side and a gloss; here the unit of study is the pair
 * itself (대대 ↔ battalion), and both halves are terms a professional has to
 * produce. So the source below is `BilingualSection[]` — neither side privileged
 * — and `derivePack` reads it twice, once per direction. Registered under
 * `Korean` the English side is the back; registered under `English` the Korean
 * side is. No new pack shape was needed: `buildPackCardDraft` writes the study
 * side last, so it wins over whichever authored side would otherwise collide
 * with it, which is exactly the behaviour a mirrored pack needs.
 *
 * **Four ids, not two.** `getCollectionId` returns `card.packId` unqualified,
 * so the two directions of one pack cannot share an id — cards saved from the
 * Korean deck and the English deck would collapse into a single collection on
 * `/cards`. They are genuinely different cards (producing `battalion` from 대대
 * is not the same skill as the reverse, and drilling both is the whole premise),
 * so the id carries the direction and the display name does not.
 *
 * `context` is written in English on both directions, which is the house style
 * — TOEIC glosses English words for Korean natives in English too. It carries
 * more weight here than on any previous pack: in the traps section the hint
 * *is* the entry, since the whole content of 병장 for an interpreter is that
 * the chart says "Sergeant" and the authority a US listener hears in that word
 * is not there. Hints survive onto the saved card as `briefDefinition`, so a
 * depth call months later still explains the military sense of 작전.
 *
 * **No term appears twice and no two terms share a back**, across both packs
 * and in both directions — otherwise two cards would share a front or an
 * answer and back-to-front review would be unanswerable. Three traps live in
 * 안보·정세 for this reason alone (취역식/임관식, the 전역 homograph, and
 * 제병협동), even though they belong to 부대·참모 §10 by nature.
 *
 * Sources: 합동참모본부 「합동·연합작전 군사용어사전」; the 국문·영문 editions
 * of 국방부's 국방백서 read side by side; the US DoD Dictionary of Military and
 * Associated Terms; and MND / 외교부 / USFK / CFC English-language releases for
 * organization and exercise names as they are currently written. All
 * unclassified, all published, assembled by hand — so this is a draft until
 * someone who has served recently reviews it. The 2020 renames (헌병 →
 * 군사경찰, the abolition of 영창) are in; 안보·정세's `rok-defense-systems`
 * will go stale first.
 */

/** One term in both languages, with neither side treated as the front. */
interface TermPair {
  korean: string;
  english: string;
  /** The sense or the warning — see the `context` note above. */
  context?: string;
}

/** A section before a direction has been chosen for it. */
interface BilingualSection {
  id: string;
  name: { English: string; Korean: string };
  note?: { English: string; Korean: string };
  pairs: readonly TermPair[];
}

/** A pack before a direction has been chosen for it. */
interface BilingualPack {
  id: string;
  name: { English: string; Korean: string };
  description: { English: string; Korean: string };
  sections: readonly BilingualSection[];
}

/**
 * The two directions this content is registered under. Narrower than
 * `StudyLanguage` on purpose: a pair of Korean and English terms has nothing to
 * say to a Swedish learner, and widening it would silently author an empty back.
 */
type PairedLanguage = 'Korean' | 'English';

const DIRECTION_SUFFIX: Record<PairedLanguage, string> = { Korean: 'ko', English: 'en' };

const UNIT_SECTIONS: readonly BilingualSection[] = [
  {
    id: 'ranks',
    name: { English: 'Ranks and forms of address', Korean: '계급·호칭' },
    note: {
      English:
        'The chart, plus the ranks that need a warning attached — including the two that mean something else entirely in the Navy.',
      Korean:
        '계급 대조표, 그리고 경고가 필요한 계급들 — 해군에서는 뜻이 완전히 달라지는 두 계급까지.',
    },
    pairs: [
      { korean: '이등병', english: 'Private (PVT/PV2)' },
      { korean: '일병', english: 'Private First Class (PFC)' },
      { korean: '상병', english: 'Corporal (CPL)' },
      { korean: '병장', english: 'Sergeant (SGT)', context: 'the official equivalent, but a conscript at the top of the enlisted ladder — none of the NCO authority a US listener hears in "Sergeant"' },
      { korean: '훈련병', english: 'trainee', context: 'a soldier still in basic training' },
      { korean: '부사관', english: 'noncommissioned officer (NCO)', context: 'a career volunteer, distinct from conscripts — never render it word-by-word as "sub-officer"' },
      { korean: '하사', english: 'Staff Sergeant' },
      { korean: '중사', english: 'Sergeant First Class' },
      { korean: '상사', english: 'Master Sergeant' },
      { korean: '원사', english: 'Sergeant Major' },
      { korean: '주임원사', english: 'command sergeant major', context: 'the senior enlisted advisor to a commander' },
      { korean: '준위', english: 'warrant officer', context: 'one ROK grade against five US grades (W-1 to W-5)' },
      { korean: '장교', english: 'commissioned officer' },
      { korean: '소위', english: 'Second Lieutenant' },
      { korean: '중위', english: 'First Lieutenant' },
      { korean: '대위', english: 'Captain', context: 'in the Navy this is Lieutenant — a ROK Navy 대위 called "Captain" sounds four grades senior than they are' },
      { korean: '소령', english: 'Major' },
      { korean: '중령', english: 'Lieutenant Colonel' },
      { korean: '대령', english: 'Colonel', context: 'in the Navy this is Captain, which is also what 대위 is called in the Army' },
      { korean: '준장', english: 'Brigadier General' },
      { korean: '소장', english: 'Major General' },
      { korean: '중장', english: 'Lieutenant General' },
      { korean: '대장', english: 'General' },
      { korean: '장성', english: 'general officer', context: 'the class of ranks, not one rank' },
      { korean: '사관생도', english: 'cadet', context: 'at a service academy' },
      { korean: '군무원', english: 'military civilian employee', context: 'a civilian in a uniformed organization' },
    ],
  },
  {
    id: 'echelons',
    name: { English: 'Units and echelons', Korean: '부대·편제' },
    pairs: [
      { korean: '분대', english: 'squad' },
      { korean: '소대', english: 'platoon' },
      { korean: '중대', english: 'company' },
      { korean: '대대', english: 'battalion' },
      { korean: '연대', english: 'regiment' },
      { korean: '여단', english: 'brigade' },
      { korean: '사단', english: 'division' },
      { korean: '군단', english: 'corps', context: 'said "core" — the final -ps is silent, and "corpse" is a body' },
      { korean: '야전군', english: 'field army' },
      { korean: '사령부', english: 'headquarters', context: 'the commanding organization, as in 연합사령부' },
      { korean: '참모부', english: 'staff section' },
      { korean: '예하부대', english: 'subordinate unit', context: 'a unit under one\'s command' },
      { korean: '파견대', english: 'detachment', context: 'an element sent out from its parent unit' },
      { korean: '직할부대', english: 'direct-reporting unit', context: 'reports to the headquarters, not to a subordinate command' },
      { korean: '육군', english: 'Army' },
      { korean: '해군', english: 'Navy' },
      { korean: '공군', english: 'Air Force' },
      { korean: '해병대', english: 'Marine Corps' },
      { korean: '합동참모본부', english: 'Joint Chiefs of Staff', context: 'the ROK JCS — 합참 for short' },
      { korean: '예비군', english: 'reserve forces' },
      { korean: '전투근무지원', english: 'combat service support', context: 'supply, maintenance, medical and transport' },
    ],
  },
  {
    id: 'command-staff',
    name: { English: 'Command and staff', Korean: '지휘·참모' },
    pairs: [
      { korean: '지휘관', english: 'commander' },
      { korean: '부지휘관', english: 'deputy commander' },
      { korean: '참모장', english: 'chief of staff' },
      { korean: '지휘계통', english: 'chain of command' },
      { korean: '지휘권', english: 'command authority' },
      { korean: '작전통제권', english: 'operational control (OPCON)', context: 'authority to direct forces for a mission' },
      { korean: '전시작전통제권', english: 'wartime operational control', context: 'the standing alliance issue — 전작권 for short' },
      { korean: '지휘관 의도', english: 'commander\'s intent', context: 'what success looks like, stated by the commander' },
      { korean: '지휘소', english: 'command post (CP)' },
      { korean: '상황실', english: 'operations center', context: 'a TOC, where the duty staff sits — not a "situation room"' },
      { korean: '당직사관', english: 'staff duty officer', context: 'the officer on duty after hours' },
      { korean: '부관', english: 'aide-de-camp', context: 'a personal staff officer to a general' },
      { korean: '인사참모', english: 'personnel officer (S-1/G-1)' },
      { korean: '정보참모', english: 'intelligence officer (S-2/G-2)' },
      { korean: '작전참모', english: 'operations officer (S-3/G-3)' },
      { korean: '군수참모', english: 'logistics officer (S-4/G-4)' },
      { korean: '통신참모', english: 'signal officer (S-6/G-6)' },
      { korean: '지침', english: 'guidance', context: 'direction issued from a higher headquarters' },
      { korean: '건의', english: 'recommendation', context: 'a proposal put up the chain of command' },
      { korean: '결재', english: 'approval', context: 'a signature authorizing something' },
    ],
  },
  {
    id: 'orders',
    name: { English: 'Operations and orders', Korean: '작전·명령' },
    pairs: [
      { korean: '작전', english: 'operation', context: 'the military sense — 작전 중 is "on operations", not "working on it"' },
      { korean: '작전명령', english: 'operation order (OPORD)' },
      { korean: '단편명령', english: 'fragmentary order (FRAGO)', context: 'a change to an order already in effect' },
      { korean: '경고명령', english: 'warning order (WARNO)', context: 'advance notice so units can prepare' },
      { korean: '작전계획', english: 'operation plan (OPLAN)' },
      { korean: '작전개념', english: 'concept of operations (CONOPS)' },
      { korean: '임무', english: 'mission' },
      { korean: '교전규칙', english: 'rules of engagement (ROE)', context: 'when and how force may be used' },
      { korean: '상황보고', english: 'situation report (SITREP)' },
      { korean: '정찰', english: 'reconnaissance' },
      { korean: '감시', english: 'surveillance' },
      { korean: '매복', english: 'ambush' },
      { korean: '침투', english: 'infiltration' },
      { korean: '방어', english: 'defense' },
      { korean: '공격', english: 'offense' },
      { korean: '철수', english: 'withdrawal' },
      { korean: '증원', english: 'reinforcement' },
      { korean: '화력지원', english: 'fire support' },
      { korean: '근접항공지원', english: 'close air support (CAS)', context: 'air attack near friendly troops' },
      { korean: '좌표', english: 'grid coordinates', context: 'a map location, as in 좌표를 불러주다' },
      { korean: '표적', english: 'target' },
      { korean: '사주경계', english: 'all-around security' },
      { korean: '전투준비태세', english: 'readiness posture' },
      { korean: '우발계획', english: 'contingency plan' },
      { korean: '도발', english: 'provocation' },
      { korean: '억제', english: 'deterrence' },
    ],
  },
  {
    id: 'alliance-armistice',
    name: { English: 'Alliance, armistice and exercises', Korean: '한미 연합' },
    note: {
      English:
        'The proper nouns. Getting these wrong is not a vocabulary error, it is a credibility error.',
      Korean:
        '고유명사 구간이에요. 여기서 틀리면 단어를 몰라서가 아니라 일을 안 해봐서 틀린 게 됩니다.',
    },
    pairs: [
      { korean: '한미연합군사령부', english: 'ROK–US Combined Forces Command (CFC)', context: '연합사 for short' },
      { korean: '유엔군사령부', english: 'United Nations Command (UNC)', context: '유엔사 for short' },
      { korean: '주한미군', english: 'United States Forces Korea (USFK)' },
      { korean: '카투사', english: 'KATUSA', context: 'Korean Augmentation to the United States Army' },
      { korean: '주한미군지위협정', english: 'Status of Forces Agreement (SOFA)' },
      { korean: '한미상호방위조약', english: 'ROK–US Mutual Defense Treaty', context: 'the 1953 treaty underlying the alliance' },
      { korean: '한미안보협의회의', english: 'Security Consultative Meeting (SCM)', context: 'the annual defense ministers\' meeting' },
      { korean: '연합연습', english: 'combined exercise', context: 'combined = multinational, as against 합동 joint, which is multi-service within one nation' },
      { korean: '을지 자유의 방패', english: 'Ulchi Freedom Shield (UFS)', context: 'the annual summer combined exercise' },
      { korean: '자유의 방패', english: 'Freedom Shield (FS)', context: 'the annual spring combined exercise' },
      { korean: '도상연습', english: 'command post exercise (CPX)', context: 'staff practice, no troops in the field' },
      { korean: '야외기동훈련', english: 'field training exercise (FTX)' },
      { korean: '실사격훈련', english: 'live-fire exercise' },
      { korean: '정전협정', english: 'Armistice Agreement', context: 'the 1953 agreement — an armistice, not a peace treaty' },
      { korean: '군사분계선', english: 'Military Demarcation Line (MDL)' },
      { korean: '비무장지대', english: 'Demilitarized Zone (DMZ)' },
      { korean: '공동경비구역', english: 'Joint Security Area (JSA)' },
      { korean: '북방한계선', english: 'Northern Limit Line (NLL)', context: 'the maritime line in the West Sea' },
      { korean: '데프콘', english: 'DEFCON', context: 'defense readiness condition' },
      { korean: '워치콘', english: 'WATCHCON', context: 'intelligence watch condition — a separate scale from DEFCON' },
      { korean: '진돗개', english: 'Jindogae alert', context: 'the ROK local-provocation alert, no US equivalent' },
      { korean: '연합작전', english: 'combined operations' },
      { korean: '상호운용성', english: 'interoperability', context: 'whether two forces\' systems can actually work together' },
    ],
  },
  {
    id: 'radio-procedure',
    name: { English: 'Radio procedure and reporting', Korean: '통신·무선 절차' },
    note: {
      English:
        'Procedure words are said, not translated — the point is the fixed form on each side.',
      Korean:
        '무선 절차어는 번역하는 게 아니라 그대로 말하는 거예요. 양쪽의 정해진 표현을 외우는 구간입니다.',
    },
    pairs: [
      { korean: '호출부호', english: 'call sign' },
      { korean: '음성문자', english: 'phonetic alphabet', context: 'Alpha, Bravo, Charlie…' },
      { korean: '감도 양호', english: 'read you loud and clear', context: 'the radio-check answer' },
      { korean: '송신', english: 'transmit' },
      { korean: '수신', english: 'receive' },
      { korean: '다시 송신 바람', english: 'say again', context: 'never "repeat" — that calls for another fire mission' },
      { korean: '이상', english: 'over', context: 'I am done and expect an answer' },
      { korean: '교신 끝', english: 'out', context: 'I am done and expect no answer' },
      { korean: '알겠음', english: 'roger', context: 'received and understood' },
      { korean: '지시대로 이행하겠음', english: 'wilco', context: 'received, understood, and I will comply' },
      { korean: '대기', english: 'standby' },
      { korean: '긍정', english: 'affirmative' },
      { korean: '부정', english: 'negative' },
      { korean: '통신두절', english: 'loss of communications' },
      { korean: '주파수', english: 'frequency' },
      { korean: '무전기', english: 'radio', context: 'the handset, as in 무전기를 잡다' },
      { korean: '목격보고', english: 'spot report (SPOTREP)', context: 'what was seen, reported immediately' },
      { korean: '도착예정시각', english: 'estimated time of arrival (ETA)' },
      { korean: '일시부호', english: 'date-time group (DTG)', context: 'e.g. 071300ZAUG26' },
      { korean: '지 시간', english: 'Zulu time', context: 'UTC — Korea is Zulu + 9' },
      { korean: '군용 시간 표기', english: '24-hour time', context: '1300 is 오후 한 시, spoken "thirteen hundred"' },
    ],
  },
  {
    id: 'logistics-admin',
    name: { English: 'Logistics, supply and personnel administration', Korean: '군수·행정' },
    pairs: [
      { korean: '보급', english: 'supply' },
      { korean: '청구', english: 'requisition', context: 'to formally request supplies' },
      { korean: '불출', english: 'issue', context: 'to hand equipment out to a unit or soldier' },
      { korean: '반납', english: 'turn-in', context: 'to return issued equipment' },
      { korean: '재물조사', english: 'inventory', context: 'the count of property on hand' },
      { korean: '손망실', english: 'loss or damage', context: 'of accountable property' },
      { korean: '정비', english: 'maintenance', context: 'of equipment, not of buildings' },
      { korean: '수송', english: 'transportation' },
      { korean: '탄약', english: 'ammunition' },
      { korean: '유류', english: 'petroleum, oils and lubricants (POL)', context: 'fuel as a supply class' },
      { korean: '전투식량', english: 'field ration', context: 'the ROK counterpart of an MRE' },
      { korean: '급식', english: 'messing', context: 'feeding troops as a function' },
      { korean: '피복', english: 'clothing and individual equipment' },
      { korean: '인사명령', english: 'personnel order', context: 'the written order assigning or promoting someone' },
      { korean: '진급', english: 'promotion' },
      { korean: '보직', english: 'duty assignment', context: 'the position someone holds, not their rank' },
      { korean: '전출', english: 'transfer out', context: 'leaving a unit for another' },
      { korean: '휴가', english: 'leave' },
      { korean: '외박', english: 'overnight pass' },
      { korean: '외출', english: 'pass', context: 'off post, back the same day' },
      { korean: '입대', english: 'enlistment', context: 'entering service' },
      { korean: '전역', english: 'discharge', context: 'completing service and leaving — 만기전역 is at full term. Two unrelated words are written the same: 전역(戰役) is a campaign and 전역(戰域) a theater' },
      { korean: '병역', english: 'military service obligation', context: 'conscription as a legal duty' },
      { korean: '동원', english: 'mobilization', context: 'calling up reserves' },
    ],
  },
  {
    id: 'weapons-equipment',
    name: { English: 'Weapons and equipment', Korean: '장비·화기' },
    pairs: [
      { korean: '개인화기', english: 'individual weapon', context: 'carried and fired by one soldier' },
      { korean: '공용화기', english: 'crew-served weapon', context: 'needs more than one soldier to operate' },
      { korean: '소총', english: 'rifle' },
      { korean: '기관총', english: 'machine gun' },
      { korean: '유탄발사기', english: 'grenade launcher' },
      { korean: '박격포', english: 'mortar' },
      { korean: '곡사포', english: 'howitzer' },
      { korean: '자주포', english: 'self-propelled artillery' },
      { korean: '다연장로켓', english: 'multiple launch rocket system (MLRS)' },
      { korean: '전차', english: 'tank' },
      { korean: '장갑차', english: 'armored vehicle' },
      { korean: '대전차 무기', english: 'antitank weapon' },
      { korean: '지대공 유도탄', english: 'surface-to-air missile' },
      { korean: '방공', english: 'air defense' },
      { korean: '무인기', english: 'unmanned aerial vehicle (UAV)' },
      { korean: '야간투시경', english: 'night vision device' },
      { korean: '방탄모', english: 'helmet' },
      { korean: '방탄복', english: 'body armor' },
      { korean: '완전군장', english: 'full field pack', context: 'everything carried, as on a 행군' },
      { korean: '영점사격', english: 'zeroing', context: 'adjusting a sight to the individual firer' },
      { korean: '사거리', english: 'range', context: 'how far a weapon shoots — not the place you shoot at' },
      { korean: '사격장', english: 'firing range', context: 'the place you shoot at' },
      { korean: '탄창', english: 'magazine' },
      { korean: '안전장치', english: 'safety', context: 'the catch on a weapon' },
    ],
  },
  {
    id: 'medical-casualty',
    name: { English: 'Medical and casualty', Korean: '의무·사상자' },
    pairs: [
      { korean: '의무후송', english: 'medical evacuation (MEDEVAC)' },
      { korean: '환자후송 요청', english: '9-line MEDEVAC request', context: 'the fixed nine-line radio format' },
      { korean: '환자분류', english: 'triage', context: 'sorting casualties by treatment priority' },
      { korean: '응급처치', english: 'first aid' },
      { korean: '의무병', english: 'medic' },
      { korean: '전투응급처치병', english: 'combat lifesaver', context: 'a non-medic trained in casualty care' },
      { korean: '의무대', english: 'aid station' },
      { korean: '들것', english: 'litter', context: 'a stretcher' },
      { korean: '사상자', english: 'casualties', context: 'killed and wounded together' },
      { korean: '전사', english: 'killed in action (KIA)' },
      { korean: '부상', english: 'wounded in action (WIA)' },
      { korean: '실종', english: 'missing in action (MIA)' },
      { korean: '후송', english: 'evacuation', context: 'moving a casualty rearward' },
      { korean: '군병원', english: 'military hospital' },
    ],
  },
  {
    id: 'traps',
    name: { English: 'Traps', Korean: '통역 함정' },
    note: {
      English:
        'Terms where a correct-looking translation misleads the listener, or where the Korean has no US counterpart at all.',
      Korean:
        '맞는 것처럼 보이는 번역이 오히려 오해를 부르거나, 미군 쪽에 대응하는 개념이 아예 없는 말들이에요.',
    },
    pairs: [
      { korean: '연합', english: 'combined', context: 'multinational, as in 한미연합사 — this is the one to keep straight from 합동' },
      { korean: '합동', english: 'joint', context: 'multi-service within one nation, as in 합동참모본부' },
      { korean: '군사경찰', english: 'military police', context: 'renamed from 헌병 in 2020 — 헌병 still gets said, and dates the speaker' },
      { korean: '군기교육', english: 'disciplinary training', context: 'replaced 영창 confinement, abolished in 2020 — do not render it as "confinement"' },
      { korean: '관심병사', english: 'soldier under special management', context: 'a ROK welfare category with no US equivalent; "at-risk soldier" is the nearest gloss' },
      { korean: '훈련소', english: 'basic training', context: 'the course, not a "training center"' },
      { korean: '자대', english: 'permanent duty station', context: 'the unit a soldier joins after basic training' },
      { korean: '정신교육', english: 'values training', context: 'scheduled instruction on ethics and service — not "mental education"' },
      { korean: '점호', english: 'accountability formation', context: 'roll call, morning and night' },
      { korean: '위병소', english: 'entry control point', context: 'the guard post at a gate' },
      { korean: '작업', english: 'working party', context: 'a labor detail assigned to soldiers, not "work" in general' },
      { korean: '군기', english: 'discipline', context: 'good order in a unit, not "military spirit"' },
      { korean: '사수', english: 'the soldier who trains you', context: 'literally the gunner; in barracks use, your immediate senior' },
      { korean: '부사수', english: 'the soldier you train', context: 'literally the assistant gunner; your immediate junior' },
      { korean: '행보관', english: 'company first sergeant', context: 'the senior NCO running a ROK company\'s admin and logistics' },
      { korean: '소원수리', english: 'grievance procedure', context: 'how a soldier raises a complaint' },
      { korean: '전우', english: 'battle buddy', context: 'the register a US listener expects, though the Korean is warmer' },
      { korean: '말년', english: 'short-timer', context: 'a soldier near the end of service' },
      { korean: '민방위', english: 'civil defense corps', context: 'a civilian obligation after the 예비군 years — not a reserve unit' },
      { korean: '계급정년', english: 'mandatory retirement by rank', context: 'leave the service if not promoted by a set point — no US equivalent' },
      { korean: '국군의 날', english: 'Armed Forces Day', context: '1 October' },
    ],
  },
];

const AFFAIRS_SECTIONS: readonly BilingualSection[] = [
  {
    id: 'alliance-policy',
    name: { English: 'Alliance and security policy', Korean: '동맹·안보 정책' },
    note: {
      English:
        'Mostly fixed formulas. "Ironclad" is not one adjective among several for the US commitment — it is the adjective.',
      Korean:
        '대부분 정해진 표현이에요. 미국의 방위 공약에 붙는 형용사는 ironclad 하나뿐, 다른 말을 쓰면 격이 내려갑니다.',
    },
    pairs: [
      { korean: '동맹', english: 'alliance' },
      { korean: '동맹국', english: 'ally', context: 'a treaty partner, with an obligation attached' },
      { korean: '우방국', english: 'partner nation', context: 'friendly, but with no treaty obligation — not an ally' },
      { korean: '한미동맹', english: 'the ROK–US alliance' },
      { korean: '미래지향적 포괄적 전략동맹', english: 'future-oriented comprehensive strategic alliance', context: 'the standing formula in joint statements, said whole' },
      { korean: '상호방위조항', english: 'mutual defense clause', context: 'the article obliging each party to come to the other\'s aid' },
      { korean: '확장억제', english: 'extended deterrence', context: 'the US commitment to defend an ally with its own nuclear forces' },
      { korean: '핵우산', english: 'nuclear umbrella', context: 'the older, less technical name for the same commitment' },
      { korean: '철통같은', english: 'ironclad', context: 'the fixed adjective for the US commitment — nothing else is used' },
      { korean: '공약', english: 'commitment', context: 'as in the US commitment to defend the ROK' },
      { korean: '방위비 분담금', english: 'burden sharing', context: 'Korea\'s share of the cost of stationing USFK' },
      { korean: '방위비분담 특별협정', english: 'Special Measures Agreement (SMA)', context: 'the periodic agreement setting that share' },
      { korean: '무임승차', english: 'free-riding', context: 'the accusation the SMA negotiations answer — "a free rider" of an ally' },
      { korean: '주둔', english: 'presence', context: 'the US military presence in Korea, as a standing fact' },
      { korean: '태세', english: 'posture', context: 'force posture — not "attitude"' },
      { korean: '즉응태세', english: 'Fight Tonight', context: 'the USFK readiness standard, said in English on both sides' },
      { korean: '같이 갑시다', english: 'We go together', context: 'the CFC motto, said in both languages at the same events' },
      { korean: '힘을 통한 평화', english: 'peace through strength' },
      { korean: '자유는 거저 주어지는 것이 아니다', english: 'Freedom is not free', context: 'the Korean War Veterans Memorial inscription, quoted at commemorations' },
      { korean: '전작권 이양', english: 'OPCON transition', context: '"transition" is the current official word; "transfer" dates the speaker' },
      { korean: '캠프 험프리스', english: 'Camp Humphreys', context: 'USFK headquarters — 평택 기지 in ordinary speech' },
      { korean: '정상회담', english: 'summit' },
      { korean: '국빈방문', english: 'state visit', context: 'the highest class of visit, with full honors' },
      { korean: '한미일 3자 협력', english: 'ROK–US–Japan trilateral cooperation' },
      { korean: '자위대', english: 'Japan Self-Defense Forces (JSDF)', context: 'Japan\'s military — never "self-defense army"' },
      { korean: '평화헌법', english: 'pacifist constitution', context: 'Article 9, which limits what the JSDF may do' },
      { korean: '군비 통제', english: 'arms control', context: 'limiting weapons by agreement' },
      { korean: '군비 경쟁', english: 'arms race' },
      { korean: '무력시위', english: 'show of force', context: 'a demonstration, not an attack' },
    ],
  },
  {
    id: 'north-korea',
    name: { English: 'North Korea: state, forces and influence operations', Korean: '북한' },
    note: {
      English:
        'An interpreter working anywhere near public affairs spends more time on this vocabulary than on anything else.',
      Korean:
        '공보 업무 근처에만 가도 가장 많이 쓰게 되는 어휘예요.',
    },
    pairs: [
      { korean: '조선민주주의인민공화국', english: 'Democratic People\'s Republic of Korea (DPRK)', context: 'the formal name, used in armistice and UN settings where "North Korea" would be a slight' },
      { korean: '북한', english: 'North Korea', context: 'press English also uses "the North" and "Pyongyang" — vary them across a long passage' },
      { korean: '국무위원장', english: 'Chairman of the State Affairs Commission', context: 'Kim Jong Un\'s formal title; most press says "leader"' },
      { korean: '조선인민군', english: 'Korean People\'s Army (KPA)', context: '인민군 for short — not the PLA, which is China\'s' },
      { korean: '인민해방군', english: 'People\'s Liberation Army (PLA)', context: 'China\'s military' },
      { korean: '정찰총국', english: 'Reconnaissance General Bureau (RGB)', context: 'North Korea\'s foreign intelligence and cyber organization' },
      { korean: '조선중앙통신', english: 'Korean Central News Agency (KCNA)' },
      { korean: '관영매체', english: 'state-run media' },
      { korean: '정권', english: 'regime', context: 'the government in power, as in 김정은 정권' },
      { korean: '체제', english: 'system', context: 'but 평화체제 is "a peace regime" — the English flips with the collocation' },
      { korean: '세습', english: 'hereditary succession' },
      { korean: '회색지대 도발', english: 'gray zone provocation', context: 'below the threshold of armed attack — balloons, jamming, cyber' },
      { korean: '국지도발', english: 'local provocation', context: 'a limited attack short of general war; what 진돗개 responds to' },
      { korean: '무력충돌', english: 'armed clash' },
      { korean: '확전', english: 'escalation', context: 'a clash widening into something larger' },
      { korean: '전면전', english: 'all-out war' },
      { korean: '심리전', english: 'psychological operations (PSYOP)', context: '"psychological warfare" is the older form, still used of North Korea' },
      { korean: '대북 확성기 방송', english: 'loudspeaker broadcasts', context: 'the propaganda broadcasts across the DMZ' },
      { korean: '대북 전단', english: 'anti-Pyongyang leaflets', context: '삐라 in older speech' },
      { korean: '오물 풍선', english: 'trash-carrying balloons', context: 'the 2024 campaign — press shortens it to "trash balloons"' },
      { korean: '교란', english: 'jamming', context: 'of GPS or radio, as a deliberate act' },
      { korean: '탈북자', english: 'North Korean defector', context: '"escapee" in UN and human-rights usage' },
      { korean: '귀순', english: 'defection to the South', context: 'crossing over, said of soldiers and civilians alike' },
      { korean: '송환', english: 'repatriation', context: 'returning a person to their country — 강제송환 is forcible repatriation' },
      { korean: '지뢰', english: 'landmine' },
      { korean: '벼랑 끝 전술', english: 'brinkmanship', context: 'pushing a crisis to the edge to extract concessions' },
      { korean: '인권 유린', english: 'human rights abuses' },
      { korean: '반인륜범죄', english: 'crimes against humanity' },
    ],
  },
  {
    id: 'missiles-nuclear',
    name: { English: 'Missiles, nuclear and sanctions', Korean: '미사일·핵·제재' },
    note: {
      English:
        'A launch is the most-interpreted event there is, and it comes with a fixed script: what was fired, from where, on what trajectory, how far.',
      Korean:
        '미사일 발사는 가장 자주 통역하게 되는 사건이고, 무엇을·어디서·어떤 각도로·얼마나 멀리라는 정해진 틀이 있어요.',
    },
    pairs: [
      { korean: '탄도미사일', english: 'ballistic missile' },
      { korean: '순항미사일', english: 'cruise missile' },
      { korean: '유도탄', english: 'guided missile' },
      { korean: '잠수함발사 탄도미사일', english: 'submarine-launched ballistic missile (SLBM)' },
      { korean: '대륙간탄도미사일', english: 'intercontinental ballistic missile (ICBM)' },
      { korean: '중거리미사일', english: 'intermediate-range missile' },
      { korean: '단거리미사일', english: 'short-range missile' },
      { korean: '지대지 미사일', english: 'surface-to-surface missile', context: '"ground-to-" is the common Korean-English error; US usage is surface-to-' },
      { korean: '극초음속', english: 'hypersonic', context: 'above Mach 5 — 초음속 supersonic is only above Mach 1' },
      { korean: '마하 5', english: 'Mach 5', context: 'said "mach five"; plainer press English says "five times the speed of sound"' },
      { korean: '고체연료', english: 'solid fuel', context: 'can be launched with little warning' },
      { korean: '액체연료', english: 'liquid fuel', context: 'needs fuelling time, so preparations are visible beforehand' },
      { korean: '탄두', english: 'warhead' },
      { korean: '발사체', english: 'projectile', context: 'the deliberately neutral word used before a launch is identified' },
      { korean: '다단계 로켓', english: 'multistage rocket' },
      { korean: '이동식 발사대', english: 'transporter erector launcher (TEL)', context: 'a launch vehicle, not a fixed pad' },
      { korean: '고각 발사', english: 'lofted trajectory', context: 'fired steeply so a long-range missile lands short — how range is shown without overflying anyone' },
      { korean: '요격', english: 'interception', context: 'stopping a missile in flight' },
      { korean: '격추', english: 'shoot-down', context: 'of an aircraft or a UAV' },
      { korean: '투발수단', english: 'means of delivery', context: 'whatever carries a warhead to its target' },
      { korean: '대량살상무기', english: 'weapons of mass destruction (WMD)' },
      { korean: '농축', english: 'enrichment', context: 'of uranium' },
      { korean: '원심분리기', english: 'centrifuge' },
      { korean: '고농축우라늄', english: 'highly enriched uranium (HEU)' },
      { korean: '무기급', english: 'weapons-grade' },
      { korean: '경수로', english: 'light water reactor' },
      { korean: '확산', english: 'proliferation' },
      { korean: '비확산', english: 'nonproliferation' },
      { korean: '핵확산금지조약', english: 'Nuclear Non-Proliferation Treaty (NPT)', context: 'North Korea withdrew in 2003' },
      { korean: '비핵화', english: 'denuclearization', context: 'the standing formula is "complete denuclearization of the Korean Peninsula"' },
      { korean: '완전하고 검증 가능하며 불가역적인', english: 'complete, verifiable and irreversible', context: 'CVID — a fixed string, never reordered' },
      { korean: '제재', english: 'sanctions', context: 'almost always plural in English' },
      { korean: '유엔 안전보장이사회', english: 'United Nations Security Council (UNSC)', context: '안보리 for short' },
      { korean: '안보리 결의', english: 'Security Council resolution', context: 'cited by number — Resolution 1718, 2270' },
      { korean: '거부권', english: 'veto' },
      { korean: '무기 금수', english: 'arms embargo' },
      { korean: '유예', english: 'moratorium', context: 'a self-declared pause, as on missile testing' },
    ],
  },
  {
    id: 'rok-defense-systems',
    name: { English: 'ROK defense systems and industry', Korean: '한국형 방위체계·방위산업' },
    note: {
      English:
        'Programme names that have to come out without hesitating, and the agencies behind them.',
      Korean:
        '망설임 없이 나와야 하는 사업 이름들과, 그 뒤에 있는 기관들.',
    },
    pairs: [
      { korean: '3축 체계', english: 'three-axis system', context: 'Kill Chain, KAMD and KMPR together; press also says "three-pronged deterrence"' },
      { korean: '킬 체인', english: 'Kill Chain', context: 'the preemptive-strike element — capitalized, never translated' },
      { korean: '한국형 미사일방어', english: 'Korean Air and Missile Defense (KAMD)', context: 'the interception element' },
      { korean: '대량응징보복', english: 'Korea Massive Punishment and Retaliation (KMPR)', context: 'the retaliation element, aimed at leadership' },
      { korean: '사드', english: 'Terminal High Altitude Area Defense (THAAD)', context: 'said "THAAD" in both languages' },
      { korean: '선제타격', english: 'preemptive strike' },
      { korean: '정밀타격', english: 'precision strike', context: '"surgical strike" in press English' },
      { korean: '원점타격', english: 'strike at the origin', context: 'hitting the source of a provocation — a ROK response doctrine with no US term' },
      { korean: '방위산업', english: 'defense industry', context: '방산 for short' },
      { korean: '방위사업청', english: 'Defense Acquisition Program Administration (DAPA)', context: '방사청 — the arms procurement agency' },
      { korean: '국방과학연구소', english: 'Agency for Defense Development (ADD)', context: 'the state defense research institute' },
      { korean: '독자 개발', english: 'indigenous development', context: 'home-grown technology, the standing claim on ROK systems' },
      { korean: '양산', english: 'mass production', context: 'the stage after development' },
      { korean: '무기 수출', english: 'arms export' },
      { korean: '양해각서', english: 'memorandum of understanding (MOU)', context: 'what defense cooperation talks produce' },
      { korean: '방위산업 전시회', english: 'defense exhibition', context: 'as in ADEX, 서울 국제 항공우주 및 방위산업 전시회' },
      { korean: '게임 체인저', english: 'game-changer', context: 'used without irony in ROK defense press' },
      { korean: '미래 성장동력', english: 'future growth engine', context: 'the standing phrase for the defense industry\'s economic role' },
    ],
  },
  {
    id: 'organizations',
    name: { English: 'Ministries, agencies and titles', Korean: '기관·직제' },
    note: {
      English:
        'Knowing what an organization does tells you nothing about what it is called. Korea has ministries and ministers; the US has departments and secretaries.',
      Korean:
        '무슨 일을 하는 기관인지 알아도 영어 이름은 알 수 없어요. 한국은 부·장관, 미국은 department·secretary입니다.',
    },
    pairs: [
      { korean: '국방부', english: 'Ministry of National Defense (MND)', context: 'the ROK ministry — "the defense ministry" in press' },
      { korean: '국방부 장관', english: 'Minister of National Defense', context: 'the ROK official' },
      { korean: '미 국방부', english: 'Department of Defense (DoD)', context: 'the Pentagon — never "Ministry of Defense" for the US' },
      { korean: '미 국방장관', english: 'Secretary of Defense', context: 'the US uses secretary, not minister' },
      { korean: '외교부', english: 'Ministry of Foreign Affairs', context: '"the foreign ministry"' },
      { korean: '미 국무부', english: 'Department of State', context: 'the US equivalent of 외교부, despite the name' },
      { korean: '미 국무장관', english: 'Secretary of State' },
      { korean: '통일부', english: 'Ministry of Unification' },
      { korean: '국가보훈부', english: 'Ministry of Patriots and Veterans Affairs', context: 'a full ministry since 2023 — "the veterans ministry"' },
      { korean: '병무청', english: 'Military Manpower Administration (MMA)', context: 'runs conscription, examinations and 어학병 selection' },
      { korean: '국가정보원', english: 'National Intelligence Service (NIS)', context: '국정원 — "the spy agency" in press' },
      { korean: '경찰청', english: 'Korean National Police Agency', context: 'civil police, distinct from 군사경찰' },
      { korean: '해양경찰청', english: 'Korea Coast Guard', context: '해경 — a police service, not a navy' },
      { korean: '육군참모총장', english: 'Army Chief of Staff' },
      { korean: '공군참모총장', english: 'Air Force Chief of Staff' },
      { korean: '해군참모총장', english: 'Chief of Naval Operations (CNO)', context: 'the Navy\'s title is not "chief of staff"' },
      { korean: '합참의장', english: 'Chairman of the Joint Chiefs of Staff' },
      { korean: '주한미국대사관', english: 'US Embassy in Seoul', context: 'an embassy is *in* a place' },
      { korean: '주한미국대사', english: 'US Ambassador to the Republic of Korea', context: 'an ambassador is *to* a country' },
      { korean: '주미대한민국대사관', english: 'Korean Embassy in Washington' },
      { korean: '국방백서', english: 'defense white paper', context: 'the ROK publication; Japan\'s 방위백서 is the same word' },
      { korean: '외교청서', english: 'diplomatic bluebook', context: 'Japan\'s annual foreign-policy publication' },
      { korean: '사이버작전사령부', english: 'Cyber Operations Command' },
      { korean: '여당', english: 'ruling party' },
      { korean: '야당', english: 'opposition party' },
    ],
  },
  {
    id: 'naval-air',
    name: { English: 'Naval and air forces', Korean: '해·공군' },
    note: {
      English:
        'A 통역장교 can be assigned to any service, and ship and aircraft vocabulary barely overlaps with the Army list.',
      Korean:
        '통역장교는 어느 군에도 갈 수 있고, 함정·항공기 어휘는 육군 어휘와 거의 겹치지 않아요.',
    },
    pairs: [
      { korean: '함대', english: 'fleet' },
      { korean: '항공모함', english: 'aircraft carrier', context: '항모 for short' },
      { korean: '항모전단', english: 'carrier strike group (CSG)', context: 'the carrier plus its escorts' },
      { korean: '구축함', english: 'destroyer' },
      { korean: '이지스함', english: 'Aegis destroyer', context: 'said "EE-jis" — the ROK Navy\'s missile-defense ships' },
      { korean: '호위함', english: 'frigate' },
      { korean: '초계함', english: 'corvette', context: 'the class the Cheonan belonged to' },
      { korean: '잠수함', english: 'submarine' },
      { korean: '상륙함', english: 'amphibious ship' },
      { korean: '대잠', english: 'antisubmarine (ASW)', context: 'as in 대잠훈련, an antisubmarine exercise' },
      { korean: '대양해군', english: 'blue-water navy', context: 'able to operate far from home waters' },
      { korean: '기동함대사령부', english: 'Task Fleet Command', context: 'the ROK Navy\'s maneuver fleet headquarters' },
      { korean: '취역식', english: 'ship commissioning ceremony', context: 'a ship entering service — in the room it is just "the commissioning"' },
      { korean: '임관식', english: 'officer commissioning ceremony', context: 'officers receiving their commission — the same English word for an unrelated event' },
      { korean: '전투기', english: 'fighter jet' },
      { korean: '스텔스 전투기', english: 'stealth fighter', context: '"radar-evading fighter" in press English' },
      { korean: '경공격기', english: 'light attack aircraft', context: 'as in the FA-50' },
      { korean: '4.5세대 전투기', english: '4.5-generation fighter', context: 'said "four-point-five generation"' },
      { korean: '정찰위성', english: 'reconnaissance satellite', context: '"spy satellite" in press' },
      { korean: '공중급유기', english: 'aerial refueling tanker' },
      { korean: '출격', english: 'sortie', context: 'one aircraft, one mission' },
    ],
  },
  {
    id: 'maritime-airspace',
    name: { English: 'Maritime and airspace sovereignty', Korean: '해양·영공 주권' },
    note: {
      English:
        'Every term here is a legal category, and the category is the point — an aircraft entering KADIZ has not entered anyone’s airspace.',
      Korean:
        '전부 법적 개념이고, 그 구분이 핵심이에요. 방공식별구역에 들어온 항공기는 영공을 침범한 게 아닙니다.',
    },
    pairs: [
      { korean: '영토', english: 'territory' },
      { korean: '영해', english: 'territorial waters' },
      { korean: '영공', english: 'territorial airspace' },
      { korean: '12해리', english: '12 nautical miles', context: 'the breadth of territorial waters' },
      { korean: '배타적 경제수역', english: 'exclusive economic zone (EEZ)', context: '200 nautical miles — economic rights, not sovereignty' },
      { korean: '공해', english: 'international waters', context: '"the high seas" in legal English' },
      { korean: '항행의 자유', english: 'freedom of navigation', context: 'the principle behind a FONOP' },
      { korean: '무해통항권', english: 'right of innocent passage', context: 'transit through territorial waters without threatening the coastal state' },
      { korean: '방공식별구역', english: 'air defense identification zone (ADIZ)', context: 'KADIZ is Korea\'s — entering it is not entering airspace, so "violation" is the wrong word' },
      { korean: '비행금지구역', english: 'no-fly zone' },
      { korean: '사전 통보 없이', english: 'without prior notice', context: 'the standing complaint about ADIZ entries' },
      { korean: '영유권', english: 'sovereignty', context: 'over a territory' },
      { korean: '영유권 분쟁', english: 'territorial dispute' },
      { korean: '영유권 주장', english: 'territorial claim' },
      { korean: '독도', english: 'the Dokdo islets', context: '"Liancourt Rocks" is the neutral third-country name; Takeshima is Japan\'s and is not used in ROK English' },
      { korean: '남중국해', english: 'the South China Sea' },
      { korean: '동중국해', english: 'the East China Sea' },
      { korean: '서해', english: 'the West Sea', context: 'ROK English for what most of the world calls the Yellow Sea' },
      { korean: '동해', english: 'the East Sea', context: 'ROK English for the Sea of Japan — the naming is itself the dispute' },
      { korean: '인공섬', english: 'artificial island' },
    ],
  },
  {
    id: 'warfare-domains',
    name: { English: 'Domains and the character of warfare', Korean: '전쟁의 양상' },
    pairs: [
      { korean: '전역(戰役)', english: 'campaign', context: 'a series of operations toward one objective — written identically to the 전역 that means discharge, and unrelated to it' },
      { korean: '전구', english: 'theater', context: 'the geographic area of a war; 전역(戰域) is the same thing' },
      { korean: '전선', english: 'front', context: 'as in the eastern front' },
      { korean: '전장', english: 'battlefield' },
      { korean: '전방', english: 'forward area', context: '전방부대 is a front-line unit' },
      { korean: '후방', english: 'rear area' },
      { korean: '전진배치', english: 'forward deployment' },
      { korean: '기습', english: 'surprise attack' },
      { korean: '재래식', english: 'conventional', context: 'non-nuclear, non-chemical, non-biological' },
      { korean: '비대칭', english: 'asymmetric', context: 'as in 비대칭 전력, asymmetric capabilities' },
      { korean: '정규전', english: 'regular warfare' },
      { korean: '비정규전', english: 'irregular warfare' },
      { korean: '특수전부대', english: 'special operations forces (SOF)', context: '특전사 is the ROK Army Special Warfare Command' },
      { korean: '현대전', english: 'modern warfare' },
      { korean: '사이버전', english: 'cyber warfare' },
      { korean: '전자전', english: 'electronic warfare (EW)' },
      { korean: '네트워크 중심전', english: 'network-centric warfare (NCW)' },
      { korean: '영역', english: 'domain', context: 'land, sea, air, space and cyber as domains of warfare' },
      { korean: '지휘통제', english: 'command and control (C2)', context: 'said "C-two"' },
      { korean: '감시정찰', english: 'intelligence, surveillance and reconnaissance (ISR)', context: 'said as the letters, "I-S-R"' },
      { korean: '무력화', english: 'neutralization', context: 'putting a capability out of action without destroying it' },
      { korean: '제병협동', english: 'combined arms', context: 'infantry, armor and artillery operating together — this "combined" is neither 연합 nor 합동' },
      { korean: '기동', english: 'maneuver' },
      { korean: '도하', english: 'river crossing', context: 'as in 도하훈련' },
      { korean: '화생방', english: 'chemical, biological and radiological (CBR)', context: 'the US term adds nuclear and says CBRN' },
      { korean: '생화학무기', english: 'chemical and biological weapons', context: 'the Korean names them in the reverse order of the English' },
      { korean: '급조폭발물', english: 'improvised explosive device (IED)' },
      { korean: '위장', english: 'camouflage' },
      { korean: '방공호', english: 'air-raid shelter' },
      { korean: '참호', english: 'trench' },
      { korean: '지상군', english: 'ground forces', context: 'the land component, as against naval and air' },
      { korean: '보병', english: 'infantry' },
      { korean: '경보병', english: 'light infantry' },
    ],
  },
  {
    id: 'history-remembrance',
    name: { English: 'History, incidents and remembrance', Korean: '역사·추모' },
    note: {
      English:
        'Ceremonies are a real and frequent assignment, and they run on a small fixed vocabulary that appears nowhere else.',
      Korean:
        '헌화식과 추모 행사는 실제로 자주 맡는 통역이고, 다른 데서는 안 나오는 정해진 표현들로 돌아가요.',
    },
    pairs: [
      { korean: '6·25전쟁', english: 'the Korean War', context: '한국전쟁 too; ROK English rarely uses "the forgotten war"' },
      { korean: '장진호 전투', english: 'the Battle of Chosin Reservoir', context: '"Chosin" is the Japanese-era reading of 장진 — the US name for a Korean place' },
      { korean: '흥남철수', english: 'the Hungnam evacuation', context: 'the December 1950 withdrawal by sea' },
      { korean: '판문점', english: 'Panmunjom', context: '"the truce village of Panmunjom" in press' },
      { korean: '천안함 폭침', english: 'the sinking of the ROKS Cheonan', context: 'ROK English says "torpedoing", which carries the attribution' },
      { korean: '연평도 포격', english: 'the shelling of Yeonpyeong Island' },
      { korean: '서해 수호의 날', english: 'West Sea Defense Day', context: 'the March commemoration of those killed in West Sea clashes' },
      { korean: '현충일', english: 'Memorial Day', context: '6 June' },
      { korean: '국립현충원', english: 'national cemetery', context: 'Seoul and Daejeon' },
      { korean: '유엔기념공원', english: 'UN Memorial Cemetery', context: 'in Busan — the only UN cemetery in the world' },
      { korean: '전몰장병', english: 'the fallen', context: 'those killed in war, collectively "the war dead"' },
      { korean: '유해', english: 'remains', context: 'of the fallen' },
      { korean: '유해 발굴', english: 'remains recovery', context: '국방부 유해발굴감식단 does the recovery and identification' },
      { korean: '참배', english: 'paying respects', context: 'at a cemetery or memorial' },
      { korean: '헌화', english: 'wreath-laying', context: '헌화식 is a wreath-laying ceremony' },
      { korean: '분향', english: 'incense offering' },
      { korean: '묵념', english: 'a moment of silence', context: 'the spoken command is "let us observe a moment of silence"' },
      { korean: '전쟁포로', english: 'prisoner of war (POW)' },
      { korean: '참전용사', english: 'war veteran', context: '6·25 참전용사 is a Korean War veteran' },
      { korean: '보훈', english: 'veterans affairs' },
      { korean: '강제 징용', english: 'forced labor', context: 'wartime conscripted labor under Japanese rule' },
      { korean: '위안부', english: 'comfort women', context: 'the quoted euphemism; "sexual slavery" is the descriptive term' },
      { korean: '야스쿠니 신사', english: 'the Yasukuni Shrine' },
      { korean: 'A급 전범', english: 'Class A war criminal', context: 'fourteen are enshrined at Yasukuni' },
      { korean: '공물 봉납', english: 'a ritual offering', context: 'what a Japanese prime minister sends in place of visiting' },
      { korean: '식민 지배', english: 'colonial rule', context: 'Japan\'s rule over Korea, 1910–1945' },
      { korean: '역사 왜곡', english: 'distortion of history' },
      { korean: '사도광산', english: 'the Sado mine', context: 'the 2024 UNESCO listing dispute' },
    ],
  },
  {
    id: 'overseas-deployment',
    name: { English: 'Overseas deployment and international operations', Korean: '파병·국제활동' },
    note: {
      English:
        'Named ROK units whose English names are fixed — no amount of Korean tells you the Cheonghae Unit is not translated.',
      Korean:
        '영어 이름이 고정된 파병부대들 — 한국어를 아무리 잘해도 청해부대가 번역되지 않는다는 건 알 수 없어요.',
    },
    pairs: [
      { korean: '해외 파병', english: 'overseas deployment' },
      { korean: '파병하다', english: 'to deploy', context: 'ROK press says "dispatch"; US usage is deploy' },
      { korean: '청해부대', english: 'the Cheonghae Unit', context: 'the antipiracy task group off Somalia' },
      { korean: '한빛부대', english: 'the Hanbit Unit', context: 'the engineering contingent in South Sudan' },
      { korean: '동명부대', english: 'the Dongmyeong Unit', context: 'the contingent with UNIFIL in Lebanon' },
      { korean: '아크부대', english: 'the Akh Unit', context: 'the special-forces training contingent in the UAE' },
      { korean: '평화유지활동', english: 'peacekeeping operations (PKO)' },
      { korean: '평화유지군', english: 'peacekeeping forces' },
      { korean: '다국적군', english: 'multinational force', context: 'the third member of the family: 연합 combined, 합동 joint, 다국적 multinational' },
      { korean: '해적행위', english: 'piracy' },
      { korean: '국제사회', english: 'the international community', context: 'never "international society", which is the standard Korean-English error' },
      { korean: '인도적 지원', english: 'humanitarian assistance' },
      { korean: '재난 구호', english: 'disaster relief' },
      { korean: '대테러', english: 'counterterrorism' },
      { korean: '유엔 총회', english: 'the UN General Assembly', context: 'distinct from 안보리, the Security Council' },
    ],
  },
];

const MILITARY_UNIT: BilingualPack = {
  id: 'military-unit',
  name: { English: 'Military Terms: Unit & Staff', Korean: '군사용어 — 부대·참모' },
  description: {
    English:
      'The terms an interpreter needs standing next to a US counterpart — ranks, orders, radio procedure, supply, and the words where a correct-looking translation misleads the listener.',
    Korean:
      '미군 카운터파트 옆에서 바로 나와야 하는 표현 — 계급과 편제, 명령, 무선 절차, 군수, 그리고 직역하면 오해를 부르는 말들.',
  },
  sections: UNIT_SECTIONS,
};

const MILITARY_AFFAIRS: BilingualPack = {
  id: 'military-affairs',
  name: { English: 'Military Terms: Security Affairs', Korean: '군사용어 — 안보·정세' },
  description: {
    English:
      'The register of a briefing and a press statement — the alliance, the North Korean threat picture, missiles and nuclear, and the organizations whose English names you cannot guess.',
    Korean:
      '브리핑과 보도자료의 언어 — 동맹, 북한 위협, 미사일과 핵, 그리고 이름을 모르면 절대 말할 수 없는 기관들.',
  },
  sections: AFFAIRS_SECTIONS,
};

/**
 * One direction of a paired pack.
 *
 * The back is the *other* language, and only the other language. Authoring both
 * sides would be pointless here and slightly harmful: `buildPackCardDraft`
 * writes the study side into the same slot last, so a Korean back on a Korean
 * deck could never be read, and its only effect would be to look authored.
 *
 * `pronounceable` is true in both directions because both have a spoken failure
 * mode — a Korean interpreter has to say "howitzer" out loud, and an
 * English-native learner has to say 잠수함발사 탄도미사일. Every language
 * involved has a TTS voice, so neither direction renders a button that does
 * nothing.
 */
function derivePack(pack: BilingualPack, studyLanguage: PairedLanguage): VocabPack {
  const sections: PackSection[] = pack.sections.map(section => ({
    id: section.id,
    name: section.name,
    ...(section.note ? { note: section.note } : {}),
    entries: section.pairs.map(pair => ({
      study: studyLanguage === 'Korean' ? pair.korean : pair.english,
      back: studyLanguage === 'Korean' ? { English: pair.english } : { Korean: pair.korean },
      ...(pair.context ? { context: pair.context } : {}),
    })),
  }));
  return {
    id: `${pack.id}-${DIRECTION_SUFFIX[studyLanguage]}`,
    name: pack.name,
    description: pack.description,
    layout: 'list',
    pronounceable: true,
    sections,
  };
}

export const MILITARY_UNIT_PACK_KO = derivePack(MILITARY_UNIT, 'Korean');
export const MILITARY_UNIT_PACK_EN = derivePack(MILITARY_UNIT, 'English');
export const MILITARY_AFFAIRS_PACK_KO = derivePack(MILITARY_AFFAIRS, 'Korean');
export const MILITARY_AFFAIRS_PACK_EN = derivePack(MILITARY_AFFAIRS, 'English');
