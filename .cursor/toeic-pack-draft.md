# TOEIC Vocabulary Pack — Draft for Review

**Concept:** one large curated pool (~130 words, expandable) that a user browses and draws from over time — e.g. going through individual words on a given day and adding the ones they're learning to their deck. Not a one-shot import list.

**Selection filter:** words where a one-word Korean gloss is insufficient — nuanced verbs/adjectives, and familiar words whose TOEIC/business meaning differs from the school meaning. Words every Korean high-school graduate already knows (accept, agree, salary, meeting, email…) are deliberately excluded.

**Context hints:** polysemous words carry a short context so `/api/explain` resolves the intended (business) sense instead of flagging the word ambiguous or explaining the school meaning.

**Sources:** [Barron's 600 Essential Words for the TOEIC](https://www.vocabulary.com/lists/196080), [pass-the-toeic-test.com word list (1,000+)](https://www.pass-the-toeic-test.com/toeic-word-list.php), cross-checked against [PrepScholar's TOEFL 327](https://blog.prepscholar.com/toefl-vocabulary-list) for overlap.

---

## 1. Core business verbs (45)

comply · accommodate · facilitate · expedite · allocate · implement · reimburse · delegate · streamline · consolidate · designate · waive · incur · adhere · rectify · compensate · authorize · anticipate · defer · solicit · assess · conduct · deduct · dismiss · enclose · enroll · estimate · fulfill · itemize · jeopardize · justify · nominate · notify · postpone · prohibit · pursue · renovate · restructure · retain · revise · submit · supervise · terminate · verify · withdraw

## 2. 아는 단어, 다른 뜻 — familiar words, second meanings (30, all with context hints)

| word | context hint |
|---|---|
| address | to deal with a problem or issue |
| outstanding | unpaid, as in an outstanding invoice |
| issue | to officially give out, as in issue a refund |
| cover | to substitute for someone or pay for a cost |
| meet | to satisfy, as in meet a deadline or requirement |
| run | to operate or manage, as in run a business |
| fine | a penalty payment |
| book | to reserve, as in book a room |
| field | to handle, as in field questions |
| party | a person or group in a contract |
| interest | money charged on a loan |
| balance | the remaining amount of money in an account |
| figure | a number or amount |
| term | a condition of a contract, or a period of time |
| charge | to bill money for something |
| file | to formally submit, as in file a complaint |
| draft | a preliminary version of a document |
| board | a group of company directors |
| subject | subject to — affected by or dependent on |
| practice | a usual way of doing things, as in business practice |
| bill | a request for payment |
| claim | to request something you are owed, as in an insurance claim |
| notice | a formal announcement, as in give two weeks' notice |
| raise | an increase in pay |
| yield | to produce a result or profit |
| stock | goods kept on hand, as in in stock / out of stock |
| firm | a company |
| branch | a local office of a company |
| commission | money earned per sale |
| shift | a scheduled work period |

## 3. Nuanced adjectives (35)

tentative · feasible · adjacent · adequate · ambiguous · arbitrary · coherent · comprehensive · consistent · crucial · deliberate · eligible · explicit · inevitable · plausible · pragmatic · prevalent · subtle · viable · vulnerable · mandatory · compatible · durable · defective · hazardous · redundant · thorough · pending · preliminary · subsequent · applicable · confidential · overdue · prompt *(hint: quick and on time)* · complimentary *(hint: free of charge)*

## 4. Workplace & procedure nouns (23)

invoice · itinerary · inventory · warranty · grievance · incentive · expenditure · liability · dividend · quotation · remittance · subsidiary · takeover · vacancy · venue · patent · lease · mortgage · surcharge · backlog · turnover *(hint: rate of employees leaving, or total sales)* · proceeds *(hint: money from a sale or event)* · premises *(hint: a company's building and land)*

---

**Total: 133 words** (45 + 30 + 35 + 23)

## Open questions

- Any words to cut/add? Sections to rebalance?
- Should section themes surface in the UI (filter chips within the pack) or stay an editorial convenience?
- Daily-draw UX: how does "going through cards on a given day" look — a swipeable word feed? a checklist? "show me N I haven't added"?
