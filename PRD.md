# Refinery — A Selection Environment for Ideas

## 1. THE PROBLEM

### What Current Tools Get Wrong

Note-taking apps (Notion, Obsidian, Roam) optimize for **storage and retrieval**—capture speed, search accuracy, graph aesthetics. This solves the wrong problem. They fail to support the actual cognitive work of knowledge creation.

These tools treat notes as artifacts to be archived rather than as episodes in an ongoing knowledge-creation process. They embody inductivist epistemology and the bucket theory of mind. Capture more, organize better, retrieve faster → understanding emerges. This is epistemologically wrong. Knowledge doesn't accumulate—it **evolves through conjecture and refutation**. Ideas must face **SELECTION PRESSURE** to improve.

Current tools provide zero selection pressure:

- No mechanism for error-correction beyond manual revision
- No system forces you to critique ideas, define constraints, identify contradictions, or kill bad conjectures
- Stored knowledge remains inert—it doesn't activate when relevant

### Three Specific Failures

1. **Epistemic context is severed**: Notes capture conclusions but lose the problem-situation. Solutions without problems are unjudgeable—you can't evaluate whether an idea is good without knowing what it was trying to solve.
2. **Ideas never confront each other**: Note A claims X, Note B claims not-X. Both persist indefinitely. No mechanism detects the conflict, so no selection pressure exists.
3. **Stored knowledge stays inert**: You wrote something relevant three years ago. You'll never find it when you need it because retrieval is keyword-based while relevance is meaning-based.

### The Real Questions

- How do we create an environment where knowledge **EVOLVES** through criticism?
- How do contradictions surface automatically instead of hiding in separate notes?
- How does writing a note become an act of **PROBLEM-SOLVING** rather than filing?
- How do we make past thinking **actively useful** for current problems?
- How do we make bad ideas die fast?

### What Success Looks Like

Users experience:

- Their notes getting **better over time** through forced confrontation with conflicts
- Past thinking **activating** when working on related problems
- The system **pushing back** on their ideas rather than passively accepting them
- Genuine compounding—years of notes making them measurably smarter

Measurable signals:

- Most notes have explicit problem-context (reflects habit formation)
- Users engage with surfaced conflicts (selection pressure is working)
- Auto-surfaced notes are actually useful (relevance works)
- Users return regularly to resolve conflicts and refine thinking

---

## 2. PRODUCT OVERVIEW

**Refinery** is a note-taking system that treats ideas as provisional theories requiring criticism.

**Core premise**: Knowledge grows through conjecture and refutation, not accumulation. Notes are conjectures. The system creates selection pressure by surfacing conflicts, maintaining problem-context, and making past thinking participate in current work.

**The navigation shift**: From "what did I write?" to "what am I trying to solve?" Notes exist to solve problems; problems organize notes.

**Epistemological basis**: Grounded in Popper and Deutsch's evolutionary epistemology. Every feature traces to a specific epistemic function—these aren't metaphors, they're **OPERATIONAL PRINCIPLES**.

**The Bet**: Software which takes epistemology seriously can help users actually think better, not just feel more organized.

---

## 3. TARGET USER

### The Serious Autodidact

**Profile**: Researcher, writer, analyst, indie scholar, or knowledge worker whose output depends on thinking quality. Age 25-45, primarily desktop for deep work.

**Defining characteristics**:

- Has **active problems** they're working on—questions they return to, positions they're refining, confusions they haven't resolved
- Has **experienced tool failure**—tried Roam, Obsidian, Notion, Zettelkasten and found them ultimately insufficient
- Tolerates **productive friction**—understands some cognitive work shouldn't be automated and is willing to do the work if the system makes it tractable

**Pain points they'll articulate**:

- "I know I wrote something about this but can't find it"
- "I found the note but don't remember why I wrote it"
- "I hold inconsistent beliefs across my notes and don't know it"
- "My notes don't help me think, they just sit there"
- "Years of note-taking haven't made me measurably smarter"

---

## 4. DESIGN DIRECTION

### Design Philosophy

Clean, modern, minimalist. The interface should disappear—attention belongs on thinking, not the tool.

**Vibe**: Professional, organized, airy, functional. Distraction-free writing. Heavy reliance on negative space/whitespace.

**Aesthetic**: Apple-like or Notion-like. Sans-serif typography, modern SaaS feel. Neutral base colors, single accent for interactive elements.

### Layout: Three-Panel Structure

**Left Sidebar** (collapsible):

- Standard note-taking navigation
- Create note, search, filters
- Problem Graph access (epistemic navigation)
- Conflicts indicator with count (high-value epistemic signal)
- Trash (footer or user settings—agent discretion)

**Main Content Area** (largest, primary workspace):

- Adapts to context: note editor, note list, conflict resolution view, problem graph
- When editing a note, structured as:
    1. **Big Title** (top)
    2. **Problem field** (directly below title—the epistemic differentiator, with AI reconstruct button inside)
    3. **Content area** (abundant whitespace, distraction-free)

**Right Inspector Panel** (collapsible):

- Surfaces information that helps you think better about current work
- **Conflicts/tensions** for current note (highest priority—epistemic value)
- **Related notes** (contextual support)
- **AI assistance** (on-demand: criticism amplifier, clean note, chat interface, etc.,)
- **Backlinks**

Default: all three panels visible. Both sidebars collapse for maximum focus.

### Editor Behavior

Inherit the **good genes** of existing apps (Obsidian, Notion, Roam, Mem.ai, etc.,):

- Live markdown preview
- Auto-save (changes persist immediately, no manual save)
- Keyboard shortcuts for common actions
- All the small, well-executed features these apps do well

---

## 5. USER STORIES

### US-1: Authentication

**As a** user, **I want** to securely access my personal notes **so that** my thinking remains private and persistent across sessions.

**Acceptance Criteria**:

- [ ] Sign up with email and password
- [ ] Log in with email and password
- [ ] Reset password via email
- [ ] Session persists across browser close
- [ ] All data strictly scoped to authenticated user (must never see other users' data)
- [ ] Log out from any page

---

### US-2: Create and Edit Notes

**As a** user, **I want** to create notes with an explicit problem field **so that** future-me can evaluate ideas against the problems they were meant to solve.

**Acceptance Criteria**:

- [ ] Note has three fields: Title (required), Problem (encouraged, not required), Content (markdown)
- [ ] Problem field is visually prominent—positioned directly below title, clearly marked as important
- [ ] Problem field contains a "Reconstruct Problem" button that activates AI assistance (see US-3)
- [ ] Markdown renders correctly in live preview (headers, bold, italic, code, links, lists, blockquotes)
- [ ] Auto-save: changes persist automatically with no manual save action
- [ ] All fields are editable after creation
- [ ] Edit triggers re-processing for conflict detection (async, non-blocking)

---

### US-3: AI Problem Reconstruction

**As a** user who captured an idea quickly, **I want** AI to help me articulate what problem this note addresses **so that** I maintain epistemic context without friction.

**Acceptance Criteria**:

- [ ] "Reconstruct Problem" button appears inside the problem field
- [ ] Clicking the button sends note content to AI and returns a suggested problem statement
- [ ] Suggestion appears within the problem field as editable text the user can accept, modify, or dismiss
- [ ] If user dismisses, they can request alternative suggestions (AI generates 2-3 different framings)
- [ ] User can always write their own problem manually instead
- [ ] AI reconstruction is a helpful tool, never a gate—notes save regardless of problem field status

---

### US-4: Delete and Restore Notes

**As a** user, **I want** to delete notes and recover them if needed **so that** I can kill bad ideas while protecting against accidents.

**Acceptance Criteria**:

- [ ] Delete action moves note to Trash (soft delete)
- [ ] Trash is accessible from sidebar
- [ ] Notes in Trash are recoverable for 30 days
- [ ] After 30 days, notes are permanently deleted
- [ ] User can permanently delete from Trash immediately if desired
- [ ] Deleted notes are excluded from search, conflict detection, and related notes

---

### US-5: Search Notes

**As a** user, **I want** to find notes by meaning, not just keywords **so that** I can retrieve relevant thinking even when I don't remember exact wording.

**Acceptance Criteria**:

- [ ] Search bar accessible from all main views
- [ ] Search queries against: title, problem field, content
- [ ] Search understands semantic meaning (finds conceptually related notes, not just keyword matches)
- [ ] Results display: title, problem (truncated), content snippet with relevant portion highlighted
- [ ] Results ranked by relevance
- [ ] Clicking a result opens the note
- [ ] Search feels fast (no perceptible delay that breaks flow)

---

### US-6: Automatic Conflict Detection

**As a** user, **I want** the system to detect when my notes contain conflicting claims **so that** contradictions surface for resolution instead of hiding across my knowledge base.

**Acceptance Criteria**:

- [ ] After a note is saved, system analyzes it against existing notes for potential conflicts
- [ ] Conflicts include: direct contradictions, tensions, and notes that seem to say different things about the same topic
- [ ] Detected conflicts appear in the right panel when viewing either involved note
- [ ] Sidebar shows total count of unresolved conflicts (badge)
- [ ] Conflict detection happens in background—never blocks saving or editing
- [ ] Each conflict displays: summary of both notes, explanation of why they might conflict

---

### US-7: Conflict Resolution

**As a** user, **I want** to view and resolve conflicts between my notes **so that** my knowledge base becomes internally consistent through deliberate error-correction.

**Acceptance Criteria**:

- [ ] Dedicated Conflicts view accessible from sidebar
- [ ] Lists all unresolved conflicts
- [ ] Each conflict expandable to show full content of both notes
- [ ] Resolution actions: Edit Note A, Edit Note B, Dismiss (mark as not a real conflict), Defer (keep in queue for later)
- [ ] Dismissing removes conflict from queue permanently (doesn't resurface)
- [ ] After editing a note, system re-evaluates if conflict is resolved
- [ ] Resolved conflicts are removed from queue
- [ ] Can navigate directly from conflict view to edit either note

---

### US-8: Related Notes Surfacing

**As a** user, **I want** to see notes related to what I'm currently working on **so that** my past thinking actively participates in current problem-solving.

**Acceptance Criteria**:

- [ ] When viewing/editing a note, right panel shows semantically related notes
- [ ] Related notes ranked by relevance
- [ ] Each related note shows: title, problem, brief content preview
- [ ] Clicking a related note opens it
- [ ] Surfacing is automatic—no manual action required

---

### US-9: Problem Graph Visualization

**As a** user, **I want** to visualize how my notes cluster around problems **so that** I can navigate my knowledge by "what am I trying to solve?" rather than "what did I write?"

**Acceptance Criteria**:

- [ ] Dedicated Problem Graph view accessible from sidebar
- [ ] Visual graph where nodes represent notes and problems
- [ ] Notes with similar/same problems cluster together
- [ ] Connections show relationships: shared problems, conflicts, semantic similarity
- [ ] Clicking a node opens that note
- [ ] Graph updates as notes are created/edited/deleted
- [ ] Visual indication of conflicts (e.g., color, edge style)
- [ ] User can zoom, pan, and explore the graph
- [ ] Graph provides an alternative navigation paradigm focused on problem-relationships

---

### US-10: AI Criticism Amplifier

**As a** user, **I want** AI to help me find weaknesses in my thinking **so that** I can improve my ideas through deliberate criticism.

**Acceptance Criteria**:

- [ ] Accessible from right panel when viewing a note
- [ ] "Critique This Note" action sends note content to AI
- [ ] AI returns: steelmanned counterarguments, weak inferential links, hidden assumptions, potential blindspots
- [ ] Criticism appears in a readable format in the right panel or modal
- [ ] User can dismiss or save the criticism as a linked note
- [ ] This is a tool for generating selection pressure—helping the user attack their own ideas

---

### US-11: AI Clean Note

**As a** user, **I want** AI to help me improve the readability of my notes **so that** my thinking is clearer without changing the substance.

**Acceptance Criteria**:

- [ ] Accessible from right panel or note actions menu
- [ ] "Clean Note" action sends note content to AI
- [ ] AI returns a reformatted version: improved structure, headings where appropriate, better organization
- [ ] Changes displayed as a diff (like code review: additions, deletions, modifications highlighted)
- [ ] User can: Accept all changes, Reject all changes, or selectively accept/reject individual changes
- [ ] Original content is never modified until user explicitly accepts
- [ ] This is a utility feature—improves form, not epistemic substance

---

### US-12: Pin Notes

**As a** user, **I want** to pin important notes **so that** I can quickly access my most active thinking.

**Acceptance Criteria**:

- [ ] Any note can be pinned/unpinned
- [ ] Pinned notes appear in a dedicated section at top of note list
- [ ] Pin status persists across sessions
- [ ] Visual indicator shows pinned state

---

### US-13: Admin Dashboard

**As an** admin, **I want** to manage users and view system status **so that** I can administer the system.

**Acceptance Criteria**:

- [ ] Admin-only access (role-based)
- [ ] View list of users (email, creation date, note count)
- [ ] Trigger password reset for a user
- [ ] Disable/enable user accounts
- [ ] Minimal scope—enough for basic administration, not a full analytics platform
---

## 6. USER FLOW

### Entry & Authentication

**Unauthenticated State**: User sees Landing Page with options to Log In, Sign Up, or Reset Password.

**Login Flow**: User enters email and password. On success, redirect to Note List view. On failure, show error and remain on Login.

**Sign Up Flow**: User enters email and password. On success, create account and redirect to Note List view. On failure, show validation errors.

**Password Reset Flow**: User enters email. System sends reset link. User clicks link, enters new password. On success, redirect to Login.

**Session Behavior**: Authenticated sessions persist across browser close. All subsequent views require authentication. Unauthenticated requests redirect to Login.

---

### Main Application Structure

All authenticated views share a three-panel layout:

**Left Sidebar** contains: Create Note button, Search input, All Notes link, Conflicts link (with unresolved count badge), Problem Graph link, Trash link. Sidebar is collapsible.

**Main Content Area** displays the current view's primary content. This area adapts based on which view is active.

**Right Panel** displays contextual information relevant to the current view. Panel is collapsible. Empty when no contextual information applies.

---

### View: Note List

**Context**: Default view after login. Shows all user's notes.

**Main Content Area displays**: Pinned notes section at top (if any pinned), then all notes sorted by last modified descending. Each note row shows title and problem (truncated).

**Right Panel displays**: Empty, or onboarding tips for new users with zero notes.

**Available actions**:

- Click any note → Navigate to Note Editor for that note
- Click Create Note → Navigate to Note Editor for a new note
- Click Search input and enter query → Navigate to Search Results
- Click Conflicts → Navigate to Conflicts view
- Click Problem Graph → Navigate to Problem Graph view
- Click Trash → Navigate to Trash view

---

### View: Note Editor

**Context**: Creating a new note or editing an existing note.

**Main Content Area displays**:

- Title field (required, top position)
- Problem field (directly below title, visually prominent, contains "Reconstruct Problem" button)
- Content field (markdown with live preview, largest area, abundant whitespace)

**Right Panel displays**:

- AI Tools section: "Critique This Note" button, "Clean Note" button
- Conflicts section: any conflicts involving this note (if none, section hidden or shows "No conflicts")
- Related Notes section: semantically related notes ranked by relevance
- Backlinks section: notes that link to this note

**Available actions**:

- Type in any field → Auto-save triggers, indicator updates
- Click "Reconstruct Problem" button → Initiate AI Problem Reconstruction flow
- Click any conflict → Navigate to Conflicts view with that conflict focused
- Click any related note → Navigate to Note Editor for that note
- Click "Critique This Note" → Initiate AI Criticism flow
- Click "Clean Note" → Initiate AI Clean Note flow
- Click Pin/Unpin toggle → Toggle note's pinned state
- Click Delete → Move note to Trash, navigate to Note List

---

### View: Conflicts

**Context**: Reviewing and resolving detected conflicts between notes.

**Main Content Area displays**: List of all unresolved conflicts. Each conflict row shows: Note A title and problem summary, Note B title and problem summary, system-generated explanation of the conflict. Each conflict is expandable to reveal full content of both notes.

**Right Panel displays**: Empty, or details of currently selected conflict.

**Available actions**:

- Click a conflict row → Expand to show full note contents inline
- Click "Edit Note A" → Navigate to Note Editor for Note A
- Click "Edit Note B" → Navigate to Note Editor for Note B
- Click "Dismiss" → Mark conflict as not real, remove from queue permanently
- Click "Defer" → Keep conflict in queue, collapse if expanded

**Resolution behavior**: After user edits a note and returns to Conflicts view, system re-evaluates whether the conflict is resolved. Resolved conflicts are automatically removed from the queue.

---

### View: Problem Graph

**Context**: Visual exploration of notes organized by problem-relationships.

**Main Content Area displays**: Interactive graph visualization. Nodes represent notes. Spatial clustering groups notes with similar or identical problems. Edges represent relationships: shared problems, detected conflicts, semantic similarity. Conflict relationships are visually distinguished (different color or edge style).

**Right Panel displays**: Empty when no node selected. When a node is selected: note title, problem, content preview.

**Available actions**:

- Pan and zoom → Navigate the graph spatially
- Hover over a node → Show tooltip with note title and problem
- Click a node → Select it (details appear in Right Panel)
- Double-click a node → Navigate to Note Editor for that note

---

### View: Search Results

**Context**: Results from a search query.

**Main Content Area displays**: Search query at top (editable). Results list below, ranked by relevance. Each result shows: title, problem (truncated), content snippet with matching/relevant portions highlighted.

**Right Panel displays**: Empty.

**Available actions**:

- Modify query → Results update in place
- Click any result → Navigate to Note Editor for that note
- Clear query → Navigate to Note List

---

### View: Trash

**Context**: Reviewing and managing deleted notes within the 30-day recovery window.

**Main Content Area displays**: List of soft-deleted notes. Each row shows: title, date deleted, days remaining until permanent deletion.

**Right Panel displays**: Empty.

**Available actions**:

- Click "Restore" on a note → Restore note to active state, remove from Trash
- Click "Delete Permanently" on a note → Permanently delete note (irreversible, no confirmation recovery)

---

### View: Admin Dashboard

**Context**: System administration. Only accessible to users with admin role.

**Main Content Area displays**: User list showing: email, account creation date, note count, account status (active/disabled).

**Right Panel displays**: Empty, or selected user details.

**Available actions**:

- Click a user row → Expand to show user details
- Click "Reset Password" for a user → Trigger password reset email to that user
- Click "Disable" for an active user → Disable account (user cannot log in)
- Click "Enable" for a disabled user → Re-enable account

---

### Flow: AI Problem Reconstruction

**Trigger**: User clicks "Reconstruct Problem" button inside the problem field.

**Step 1**: Button enters loading state. System sends note content (title and content) to AI.

**Step 2**: AI returns a suggested problem statement. Suggestion appears in the problem field as editable text, visually distinguished as a suggestion.

**Step 3 — User decision**:

- User edits the suggestion → Suggestion becomes the problem field value. Flow complete.
- User accepts as-is → Suggestion becomes the problem field value. Flow complete.
- User dismisses → Suggestion is cleared. "Try alternatives" option appears.

**Step 4 (if dismissed)**: User clicks "Try alternatives." System requests 2-3 alternative problem framings from AI. Alternatives appear as selectable options.

**Step 5**: User selects one alternative (becomes problem field value) or writes their own manually. Flow complete.

**Constraint**: This flow never blocks saving. User can navigate away at any point; note saves with whatever problem field value exists.

---

### Flow: AI Criticism

**Trigger**: User clicks "Critique This Note" in the Right Panel while viewing a note.

**Step 1**: Button enters loading state. System sends note content to AI with instructions to generate criticism.

**Step 2**: AI returns criticism containing: steelmanned counterarguments, identification of weak inferential links, hidden assumptions, potential blindspots.

**Step 3**: Criticism is displayed in the Right Panel or a modal overlay.

**Step 4 — User decision**:

- User clicks "Dismiss" → Criticism view closes. No changes.
- User clicks "Save as Note" → System creates a new note containing the criticism, automatically linked to the original note. User optionally navigates to the new note.

---

### Flow: AI Clean Note

**Trigger**: User clicks "Clean Note" in the Right Panel while viewing a note.

**Step 1**: Button enters loading state. System sends note content to AI with instructions to improve structure and readability without changing substance.

**Step 2**: AI returns a reformatted version of the note content.

**Step 3**: System displays a diff view comparing original content to cleaned content. Additions, deletions, and modifications are visually highlighted (similar to code review interfaces).

**Step 4 — User decision**:

- User clicks "Accept All" → Note content is replaced with cleaned version. Diff view closes.
- User clicks "Reject All" → No changes. Diff view closes.
- User selectively accepts/rejects individual changes → Each accepted change is applied; rejected changes are discarded. When user confirms, diff view closes.

---

## 7. DATA MODEL SKETCH

### Entities

**User**

- Unique identifier
- Email (unique)
- Password (hashed)
- Role (user | admin)
- Timestamps (created, updated)
- Relationships: owns Notes, owns Conflicts

**Note**

- Unique identifier
- Owner (User reference)
- Title (required)
- Problem (optional, encouraged)
- Content (markdown)
- Semantic representation (for similarity/conflict detection)
- Pinned status
- Soft-delete status and deleted timestamp (for Trash)
- Timestamps (created, updated)
- Relationships: belongs to User, can have Conflicts with other Notes

**Conflict**

- Unique identifier
- Owner (User reference—derived from notes)
- Note A reference
- Note B reference
- Explanation (system-generated description of the conflict)
- Status (unresolved | resolved | dismissed)
- Timestamps (created, resolved_at)
- Relationships: connects two Notes

### Key Constraints

- **User isolation is absolute**: All queries must be scoped by user. No user can ever access another user's data. Implement at application layer with defense-in-depth at database layer.
- **Soft delete lifecycle**: Deleted notes remain in Trash for 30 days. After 30 days, permanently deleted. Soft-deleted notes excluded from all normal operations (search, conflicts, related notes).
- **Conflict integrity**: If both notes in a conflict are deleted, the conflict should be cleaned up.
- **Async processing**: Semantic representation generation and conflict detection happen in background. Never block user actions on these processes.

### Processing Behaviors

- **On note save**: Queue semantic representation generation (async). Don't block save.
- **After semantic representation ready**: Run conflict detection against existing notes.
- **On edit during processing**: After current processing completes, re-queue with latest content.
- **On processing failure**: Retry with backoff. Don't surface errors for background processes unless persistent.
- **Rate limiting**: Expensive AI operations (conflict detection, semantic processing) should not run on every keystroke. Implement appropriate debouncing/throttling.

---

## 8. TECH STACK

| Layer                  | Technology                                      |
| ---------------------- | ----------------------------------------------- |
| **Database**           | Supabase (PostgreSQL)                           |
| **Vector Storage**     | pgvector extension                              |
| **Auth**               | Supabase Auth                                   |
| **Backend**            | Next.js API Routes + Server Actions             |
| **Frontend**           | Next.js (App Router)                            |
| **Styling**            | Tailwind CSS + shadcn/ui                        |
| **Markdown Editor**    | Tiptap                                          |
| **Graph Viz**          | React Flow                                      |
| **Validation**         | Zod                                             |
| **State**              | Zustand                                         |
| **Data Fetching**      | TanStack Query                                  |
| **Background Jobs**    | Inngest                                         |
| **Embeddings**         | OpenRouter (openai/text-embedding-3-small)      |
| **LLM**                | OpenRouter (openai/gpt-4o-mini or other models) |
| **AI Integration**     | Vercel AI SDK + OpenRouter provider             |
| **Unit & Integration** | Vitest                                          |
| **Component Testing**  | React Testing Library                           |
| **E2E Testing**        | Playwright                                      |
| **API Mocking**        | MSW                                             |
| **Deployment**         | Vercel                                          |


---
## 9. CONSTRAINTS

### Performance (User-Meaningful)

- Note saving feels instant—no perceptible delay
- Search results appear fast enough that user doesn't lose train of thought
- AI operations (problem reconstruction, criticism, clean note) complete within a few seconds
- Conflict detection happens in background; user notified when complete but never blocked

### Security

- All operations scoped by authenticated user
- Background jobs maintain user scoping
- Standard auth: email/password, session persistence, password reset
- Admin functions restricted to admin role

### Reliability

- Auto-save handles rapid typing gracefully (debounce)
- Background processing failures retry without user intervention
- Handle edit-during-processing: reprocess after completion

---

## 10. PHASED DELIVERY

### Phase 1: Foundation

Build the core note-taking experience with the epistemic differentiator:

- Authentication (US-1)
- Note creation/editing with problem field (US-2)
- AI problem reconstruction (US-3)
- Delete and restore (US-4)
- Basic search (US-5)
- Pin notes (US-12)

**Exit**: Users can create notes with problem context. Core experience feels good. AI helps with problem articulation.

### Phase 2: Selection Pressure

Add the mechanisms that create selection pressure:

- Semantic representation for notes (background processing)
- Conflict detection (US-6)
- Conflict resolution (US-7)
- AI criticism amplifier (US-10)

**Exit**: System actively surfaces conflicts. Users can resolve them. AI helps critique ideas.

### Phase 3: Relevance & Navigation

Make past thinking participate in current work and enable problem-first navigation:

- Related notes surfacing (US-8)
- Semantic search enhancement (US-5 expansion)
- Problem graph visualization (US-9)
- AI clean note (US-11)
- Admin dashboard (US-13)

**Exit**: Users experience their notes becoming actively useful. Problem graph enables new navigation paradigm.

---

## 11. SUCCESS SIGNALS

### Primary: Selection Pressure Works

- Users engage with surfaced conflicts (majority resolved/dismissed within a week)
- Indicates the system is creating productive friction

### Secondary

- Auto-surfaced notes are useful (users don't dismiss most as irrelevant)
- Most notes have problem context (epistemic hygiene habit forming)
- Users return regularly (system is valuable enough to revisit)
- AI criticism is used (users actively seek to attack their own ideas)

### Qualitative

- User self-report: "Did resolving this conflict improve your understanding?"
- Downstream indicators: Users export notes, reference them in work, etc.

---

## 12. OPEN CONSIDERATIONS

For implementing agents to consider:

1. **Problem field UX**: The design should make problem entry feel natural and valuable, not like a chore. The AI reconstruction button should feel like helpful assistance. Monitor whether users fill the field when optional.
2. **Conflict sensitivity tuning**: Start conservative (fewer false positives). Tune based on whether users engage with surfaced conflicts.
3. **Problem Graph layout**: Graph layout algorithms significantly affect usability. Consider force-directed layouts that cluster related notes. The graph should be navigable and useful, not just pretty.
4. **AI criticism quality**: The criticism amplifier is only valuable if it surfaces real weaknesses. Prompt engineering matters significantly here.
5. **Diff UX for Clean Note**: The accept/reject interface for AI-cleaned notes should be intuitive. Draw from established code review UX patterns.
6. **Performance at scale**: With many notes, semantic operations could be expensive. Consider incremental approaches, caching, and change-detection to avoid unnecessary reprocessing.