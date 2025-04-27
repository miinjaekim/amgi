# Amgi AI Project Scratchpad

## Background & Motivation

WHY THIS MATTERS  
Language learners bounce between two tools:  
• an LLM for nuanced explanations  
• a flash-card app for spaced repetition  
That context-switch kills flow and hurts retention. Amgi AI should be ONE place where learners can ask, understand, and remember new words without juggling tools.

CORE ASPIRATION  
Feel like "chatting with a brilliant native speaker who instantly turns each explanation into the perfect flash-card, then reminds you just before you forget."

WHAT "GREAT" LOOKS LIKE FOR A LEARNER  
- Seamless insight-to-memory loop (type → understand → save → review).
- Adaptive depth (beginners get simple defs; advanced users get cultural nuance, etymology, hanja roots, etc.).
- Motivating rhythm (daily streaks, XP, gentle encouragement).
- Trust & ownership (easy export; clear privacy; learner controls pace and data).

GUIDING DESIGN PRINCIPLES  
• Stay in flow – UI never drags attention away from the word.  
• Depth on demand – Enough detail by default; drill deeper only when curious.  
• Progress is visible – Streaks and review counts are always one glance away.  
• Start narrow, expand later – Korean first, but architecture must welcome future languages/media.  
• Own your learning – Honest data policies, no dark patterns, easy export.

LONG-TERM POSSIBILITIES (beyond MVP)  
• Multi-media prompts (image → card, audio → card).  
• Social layer: share decks, community explanation presets, friendly challenges.  
• AI-driven pronunciation feedback.  
• Cross-language "bridge" explanations (e.g., show kanji if the user knows Chinese).

NEAR-TERM OUTCOMES WE CARE ABOUT  
• Learners say: "Capturing new words finally feels effortless."  
• Beta testers keep a 7-day streak without external reminders.  
• Early adopters ask when they can add other languages.

## Non-Technical Success Criteria

- Users can capture new words and explanations in a single, uninterrupted flow.
- Users can review saved words with spaced repetition.
- The app adapts explanation depth to user level (beginner/advanced).
- Progress is visible at a glance (streaks, review counts).
- Users can easily export their data.
- Clear, honest privacy and data ownership policies.
- Users feel motivated to return daily (gentle encouragement, XP, streaks).
- Early users request support for additional languages.

## Open UX Questions to Settle Before Coding

1. How does the user set or change their explanation-depth preference?
2. What does the onboarding flow look like for a new user?
3. How are streaks and XP visually represented and tracked?
4. What is the minimum viable review/flashcard interface?
5. How does the user "save" a word or explanation from chat?
6. How is progress (streaks, review counts) surfaced in the main UI?
7. What export formats are supported (CSV, Anki, etc.)?
8. How do we communicate privacy/data ownership simply and clearly?
9. How do we handle "depth on demand" (e.g., tap to expand for etymology)?
10. What are the default encouragements or notifications (if any)?
11. How can we design the user flow to allow saving a card directly from an AI explanation without switching contexts or copying/pasting information?

## Proposed Technical Plan

### Technology Stack
- **Frontend:** React (with Next.js for SSR and routing)
- **Backend:** Firebase (for real-time data, authentication, and hosting)
- **Database:** Firebase Firestore (for flexible schema and scalability)
- **AI Integration:** Google Gemini API for nuanced explanations and flashcard generation
- **Authentication:** Firebase Authentication
- **Deployment:** Firebase Hosting (frontend) and Google Cloud Platform (GCP) (backend)

### Data Model
- **User:** Profile, preferences (explanation depth, language), streaks, XP
- **Word:** Term, explanation, examples, metadata (etymology, cultural notes)
- **Flashcard:** Word reference, review status, next review date
- **Progress:** Daily streaks, review counts, XP history

### Phased Rollout
1. **MVP (Korean Language):**
   - Basic chat interface for word explanations
   - Simple flashcard creation and review
   - User authentication and profile management
   - Streak and XP tracking

2. **Enhancement Phase:**
   - Adaptive explanation depth
   - Export functionality (CSV, Anki)
   - Onboarding flow and UX improvements

3. **Expansion Phase:**
   - Support for additional languages
   - Multi-media prompts (image, audio)
   - Social features (deck sharing, challenges)

4. **Long-term Vision:**
   - AI-driven pronunciation feedback
   - Cross-language "bridge" explanations

### Note on Tech Stack Choices
- **Firebase vs. MongoDB:** Firebase offers real-time capabilities, built-in authentication, and seamless integration with other Google services, which can simplify development and scaling. MongoDB provides more flexibility for complex queries and data relationships, but Firebase's ease of use and real-time features align well with the project's goals.
- **Google Gemini vs. OpenAI API:** Both are powerful AI models. Google Gemini is newer and may offer unique features or integrations with Google's ecosystem, while OpenAI's API is well-established with extensive documentation and community support. The choice may depend on specific requirements, cost, and integration ease.
- **GCP vs. AWS:** Both are robust cloud platforms. GCP offers deep integration with Firebase and other Google services, which can streamline development and deployment. AWS provides a broader range of services and global reach, but GCP's integration with Firebase may be more convenient for this project.

### Mobile Accessibility Considerations
- **Responsive Design:** Ensure the UI is fully responsive and optimized for mobile devices.
- **Offline Support:** Implement offline capabilities for users to access saved words and flashcards without an internet connection.
- **Touch-Friendly Interface:** Design with touch interactions in mind, ensuring buttons and interactive elements are easily accessible on smaller screens.
- **Performance Optimization:** Optimize load times and performance for mobile users, considering varying network conditions and device capabilities.

## Project Status Board

- [x] Initial planning and vision documentation
- [x] Core functionality (Gemini, flashcard creation, authentication, Firestore, display)
- [ ] Flashcard Review Interface & Spaced Repetition (In Progress)
- [ ] UI/UX Polish
- [ ] Card Management Improvements
- [x] Create AmgiLogo React component with dynamic color/size props
- [x] Implement header/navigation bar with logo, navigation buttons, and profile/user button using the new palette
- [x] Adjust header: logo/title as 'amgi', left-aligned nav
- [x] Adjust header: logo only (no text), nav buttons as placeholders
- [x] Move user state/auth logic to React context
- [x] Header uses context for user info and sign in/out
- [x] Remove branding and user info from main content for minimal layout
- [ ] Refactor input, explanation, and flashcard list for minimalism and focus
- [ ] Ensure responsiveness and accessibility

## Current Status / Progress Tracking

- [x] Design review screen for cards due today/overdue (User can pick Again, Hard, Good, Easy)
- [x] Implement spaced repetition algorithm (SM-2)
- [x] Unit tests for SM-2 logic
- [x] Edit flashcards
- [ ] Delete flashcards (In Progress)
- [ ] Search/filter flashcards
- [ ] Export flashcards (CSV, Anki, etc.)

## Executor's Feedback or Assistance Requests

- Edit functionality is implemented and working.
- Delete functionality is now implemented: users can delete flashcards with confirmation, and cards are removed from Firestore and UI.
- Next: verify delete works as expected, then proceed to search/filter or export as requested.
- The AmgiLogo React component is complete and ready for use. It supports dynamic color, stroke, and size props for easy integration and theming.
- Next step: Implement the header/navigation bar, integrating the logo and applying the new color palette and font.
- The Header component is implemented and imported in layout.tsx. It includes the AmgiLogo, navigation buttons (Learn, Review), and a user/profile button, all styled with the new palette.
- Linter error is resolved.
- Next step: Visually verify the header in the app and ensure navigation works as expected.
- The header now displays only the logo (no text title), with the Learn and Review buttons left-aligned as placeholders for future icons. The profile button remains on the right. Layout remains clean and minimal.
- Next step: Visually verify the header, then proceed to refactor the main content layout.
- User state/auth logic is now in a React context (UserContext). The header uses this context to display user info and sign in/out actions. The main content no longer shows branding or user info, making the layout more minimal and focused.
- Next: Refactor the input, explanation, and flashcard list for further minimalism and focus.

## Display Saved Flashcards Planning

- Fetch flashcards from Firestore where `uid` matches the current user.
- Display a list of saved flashcards below the input/explanation area.
- Show term, definition, and optionally examples/notes for each card.
- Handle loading and empty states.
- Prepare for future review/quiz features.

## Firebase Authentication Planning

- Add sign-in and sign-out functionality (Google provider recommended for simplicity).
- Display user info (name, avatar) when signed in.
- Restrict flashcard saving to authenticated users (for now, just show a message if not signed in).
- Prepare for future integration with Firestore for persistent flashcard storage.

## Next Steps & Considerations (Planner)

Based on the original vision and current progress, here are recommended next steps and considerations:

### 1. Flashcard Review & Spaced Repetition
- Implement a review interface for saved flashcards (e.g., daily review, spaced repetition algorithm).
- Track review history, streaks, and XP for user motivation.
- Show progress indicators (e.g., cards due today, streak count).

### 2. UI/UX Polish
- Refine the look and feel of the app for both desktop and mobile.
- Add animations, transitions, and visual feedback for actions.
- Improve accessibility and responsive design.

### 3. Card Management
- Allow users to edit or delete saved flashcards.
- Add search/filter functionality for large card collections.
- Support exporting cards (CSV, Anki, etc.).

### 4. Onboarding & Personalization
- Create a simple onboarding flow for new users.
- Let users set preferences (e.g., explanation depth, target language).

### 5. Advanced Features (for future phases)
- Multi-media prompts (image/audio to card).
- Social features: deck sharing, community explanations, friendly challenges.
- AI-driven pronunciation feedback.
- Cross-language "bridge" explanations.

### 6. Data & Privacy
- Add a clear privacy/data policy page.
- Make it easy for users to export or delete their data.

### 7. Performance & Reliability
- Optimize for fast load times and smooth interactions.
- Add error boundaries and robust error handling.

---

**Recommendation:**
- Start with the review interface and spaced repetition logic, as this is core to the "insight-to-memory" loop.
- In parallel, begin UI/UX polish and card management improvements.
- Plan for onboarding and personalization as the next user-facing milestone.

Let the Executor know which direction to prioritize, or if you'd like a more detailed breakdown for any of these areas!

## High-level Task Breakdown: Next Implementation Phase

### 1. Flashcard Review Interface & Spaced Repetition (Priority)
- Design a review screen that shows cards due for review (today or overdue).
- Implement a simple spaced repetition algorithm (e.g., SM-2 or Leitner system).
- Allow users to mark cards as "remembered" or "forgotten" and update scheduling accordingly.
- Track and display review streaks, XP, and progress indicators.

### 2. UI/UX Polish
- Refine layout, spacing, and typography for clarity and beauty.
- Add visual feedback for actions (saving, reviewing, errors).
- Improve mobile responsiveness and accessibility.
- Add loading spinners and transitions where appropriate.

### 3. Card Management Improvements
- Add ability to edit or delete flashcards from the saved list.
- Implement search and filter for large card collections.
- Add export functionality (CSV, Anki, etc.).

---

**Implementation Order:**
1. Flashcard Review Interface & Spaced Repetition
2. UI/UX Polish
3. Card Management Improvements

Each step will be broken down into smaller tasks as we proceed. Ready to start with the review interface? Let the Executor know to begin implementation!

## UI/UX Planning and Discussion

### Current State
- The app uses a simple, functional layout with a single main page.
- Users can sign in, enter a term, get an AI-generated explanation, and save it as a flashcard.
- Saved flashcards are listed below, with options to edit or delete.
- Review mode is available for cards due today/overdue, with spaced repetition logic.
- The design is clean but basic, with minimal visual feedback, transitions, or advanced navigation.

### Inspiration & Preferences
- Inspired by Monkeytype: dark/green background, code-style font, minimalism, small icon buttons, logo top left.
- Color palette:
  - Background: #173F35
  - Background text: #418E7B
  - Text: #E9E0D2
  - Highlight: #EAA09C
- Logo: Provided SVG, but color should be dynamically set to match the palette (not the SVG's default color).
- Navigation: Logo top left, nav buttons for "Learn" and "Review," profile/user button top right.
- Prioritize minimalism and functionality, no complex animations.

### Next Steps
1. Set up Tailwind (or CSS) theme with the provided color palette and code-style font.
2. Add header bar with logo (dynamically colored), nav buttons, and profile/user button.
3. Refactor main content for minimal, focused layout.
4. Ensure responsiveness and accessibility.

Ready to break down and implement these steps. Let me know if you have any further clarifications or want to provide the SVG file for the logo! 