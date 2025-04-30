# Amgi AI Project Scratchpad

## 1. Project Vision & Goals

### Background & Motivation
Language learners bounce between two tools:  
• an LLM for nuanced explanations  
• a flash-card app for spaced repetition  
That context-switch kills flow and hurts retention. Amgi AI should be ONE place where learners can ask, understand, and remember new words without juggling tools.

**Core Aspiration:**  
Feel like "chatting with a brilliant native speaker who instantly turns each explanation into the perfect flash-card, then reminds you just before you forget."

### Success Criteria
- Users can capture new words and explanations in a single, uninterrupted flow
- Users can review saved words with spaced repetition
- The app adapts explanation depth to user level (beginner/advanced)
- Progress is visible at a glance (streaks, review counts)
- Users can easily export their data
- Clear, honest privacy and data ownership policies
- Users feel motivated to return daily (gentle encouragement, XP, streaks)
- Early users request support for additional languages

### Design Principles
• Stay in flow – UI never drags attention away from the word  
• Depth on demand – Enough detail by default; drill deeper only when curious  
• Progress is visible – Streaks and review counts are always one glance away  
• Start narrow, expand later – Korean first, but architecture must welcome future languages/media  
• Own your learning – Honest data policies, no dark patterns, easy export

### Long-term Vision
• Multi-media prompts (image → card, audio → card)  
• Social layer: share decks, community explanation presets, friendly challenges  
• AI-driven pronunciation feedback  
• Cross-language "bridge" explanations (e.g., show kanji if the user knows Chinese)

## 2. Technical Architecture

### Technology Stack
- **Frontend:** React (with Next.js for SSR and routing)
- **Backend:** Firebase (for real-time data, authentication, and hosting)
- **Database:** Firebase Firestore (for flexible schema and scalability)
- **AI Integration:** Google Gemini API for nuanced explanations and flashcard generation
- **Authentication:** Firebase Authentication
- **Deployment:** Firebase Hosting (frontend) and Google Cloud Platform (GCP) (backend)

**Technology Decisions:**
- **Firebase vs. MongoDB:** Firebase offers real-time capabilities, built-in authentication, and seamless integration with Google services
- **Google Gemini vs. OpenAI API:** Google Gemini chosen for newer features and Google ecosystem integration
- **GCP vs. AWS:** GCP selected for deep integration with Firebase and other Google services

### Data Model
- **User:** Profile, preferences (explanation depth, language), streaks, XP
- **Word:** Term, explanation, examples, metadata (etymology, cultural notes)
- **Flashcard:** Word reference, review status, next review date
- **Progress:** Daily streaks, review counts, XP history

### Implementation Phases
1. **MVP (Korean Language)**
   - Basic chat interface for word explanations
   - Simple flashcard creation and review
   - User authentication and profile management
   - Streak and XP tracking

2. **Enhancement Phase**
   - Adaptive explanation depth
   - Export functionality (CSV, Anki)
   - Onboarding flow and UX improvements

3. **Expansion Phase**
   - Support for additional languages
   - Multi-media prompts (image, audio)
   - Social features (deck sharing, challenges)

## 3. Project Status

### Completed Items
- [x] Initial planning and vision documentation
- [x] Core functionality (Gemini, flashcard creation, authentication, Firestore, display)
- [x] Create AmgiLogo React component with dynamic color/size props
- [x] Implement header/navigation bar with logo, navigation buttons, and profile/user button
- [x] Move user state/auth logic to React context
- [x] Header uses context for user info and sign in/out
- [x] Remove branding and user info from main content for minimal layout
- [x] Refactor input, explanation, and flashcard list for minimalism and focus
- [x] Make background uniform with main palette color (#173F35)
- [x] **Bidirectional Review System:** Implement complete bidirectional flashcard review with independent tracking

### In Progress
- [ ] **UI/UX Polish:** Improve responsiveness and accessibility
- [ ] **Redesign Explanation Output:** Make definition always visible with expandable context/hanja/examples
- [ ] **Minimal Flashcard Save Flow:** Streamline term + concise definition/translation saving

### Upcoming Tasks
- [ ] Fix review page route (implement `/review` page)
- [ ] Redesign explanation output (definition always, expandable context/hanja/examples)
- [ ] Minimal flashcard save flow (term + concise definition/translation)
- [ ] Move review UI to dedicated page
- [ ] Add deck management UI (list decks, review/manage by deck)
- [ ] UI/UX Polish
- [ ] Card Management Improvements (search, filter, export)

## 4. Current Sprint: Bidirectional Review System

### Background & Requirements
- Current review flow shows all card info at once, which does not match the classic flashcard experience
- Users should see only one side (front or back), try to recall the other, then reveal and rate themselves
- Each direction (front→back, back→front) should be tracked separately with its own scheduling
- If a user marks a card as "Again" (wrong), it should be shown again immediately in the same session

### Data Model Updates
```typescript
interface ReviewTracking {
  nextReview: Date;
  interval: number;
  ease: number;
  repetitions: number;
}

interface Flashcard {
  id?: string;
  uid: string;
  term: string;
  definition: string;
  examples?: string[];
  notes?: string;
  createdAt: Date;
  // New bidirectional review tracking
  frontToBack: ReviewTracking;
  backToFront: ReviewTracking;
  // Legacy fields (for backward compatibility)
  nextReview?: Date | string;
  interval?: number;
  ease?: number;
  repetitions?: number;
}
```

### Implementation Tasks
1. **Data Model & Migration** [COMPLETED]
   - [x] Update Flashcard type in `src/services/firestore.ts`
   - [x] Create migration utility for existing cards
   - [x] Update card creation to initialize both direction trackers
   - **Success Criteria:** Each new card has separate tracking for each direction

2. **Review Session Queue** [COMPLETED]
   - [x] Update due card fetching to check both directions independently
   - [x] Update session queue to track direction with each card
   - [x] Implement re-insertion logic for "Again" responses
   - **Success Criteria:** Failed cards are shown again soon in the same session

3. **Reversible Review Card UX** [COMPLETED]
   - [x] Update review UI to clearly indicate which direction is being tested
   - [x] Add "Show Answer" button and flip interaction
   - [x] After reveal, show the answer and all extra info
   - [x] Track progress through the session
   - **Success Criteria:** User can effectively review cards in both directions

4. **Spaced Repetition Logic** [COMPLETED]
   - [x] Update SM-2 implementation to handle direction-specific scheduling
   - [x] Ensure "Again" responses update the correct direction's stats
   - **Success Criteria:** Each direction's scheduling is updated independently

## 5. UI/UX Guidelines

### Design System
- **Color Palette:**
  - Background: #173F35
  - Background text: #418E7B
  - Text: #E9E0D2
  - Highlight: #EAA09C
- **Typography:** Code-style font for technical feel
- **Layout:** Minimal, focused design inspired by Monkeytype

### Navigation Structure
- Logo (top left)
- Nav buttons for "Learn" and "Review"
- Profile/user button (top right)
- Minimal transitions and animations

### Responsive Design
- Fully responsive and optimized for mobile devices
- Touch-friendly interface with accessible buttons
- Optimized load times for varying network conditions

### Explanation Output Redesign
- For each inputted term, show:
  - Concise definition (always visible)
  - Relevant cultural/social context (expandable)
  - Hanja/component breakdown (expandable)
  - Example usage (expandable)
  - Suggested flashcard (expandable)
- Always show the core definition, but let users expand other sections based on curiosity

## 6. Notes & Planning Documents

### Open Questions
1. How does the user set or change their explanation-depth preference?
2. What does the onboarding flow look like for a new user?
3. How are streaks and XP visually represented and tracked?
4. How does the user "save" a word or explanation from chat?
5. What export formats are supported (CSV, Anki, etc.)?
6. How do we handle "depth on demand" for etymology and cultural notes?
7. What are the default encouragements or notifications (if any)?

### Implementation Notes
- When creating new cards, initialize both directions with the same default values
- Consider adding a user preference for which direction they want to prioritize
- Consider showing stats per direction (e.g., "Korean→English: 80% correct")
- Consider allowing users to disable review in one direction if they prefer

### Lessons Learned
- Git pushes and scratchpad updates will now happen in parallel, not strictly after every code change
- Main content is now minimal and focused, using the new palette and code font
- Background is uniform (#173F35) for a cohesive look
- Include info useful for debugging in the program output
- Read files before trying to edit them
- Run npm audit before proceeding if vulnerabilities appear in the terminal
- Always ask before using the -force git command