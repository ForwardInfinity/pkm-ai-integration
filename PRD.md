# Refinery — A Selection Environment for Ideas

## THE PROBLEM

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

## PRODUCT OVERVIEW

**Refinery** is a note-taking system that treats ideas as provisional theories requiring criticism.

**Core premise**: Knowledge grows through conjecture and refutation, not accumulation. Notes are conjectures. The system creates selection pressure by surfacing conflicts, maintaining problem-context, and making past thinking participate in current work.

**The navigation shift**: From "what did I write?" to "what am I trying to solve?" Notes exist to solve problems; problems organize notes.

**Epistemological basis**: Grounded in Popper and Deutsch's evolutionary epistemology. Every feature traces to a specific epistemic function—these aren't metaphors, they're **OPERATIONAL PRINCIPLES**.

**The Bet**: Software which takes epistemology seriously can help users actually think better, not just feel more organized.

---

## TARGET USER

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

## DESIGN DIRECTION

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
- **AI assistance** (on-demand: criticism amplifier, chat interface, etc.,)
- **Conflicts/tensions** for current note (highest priority—epistemic value)
- **Related notes** (contextual support)
- **Tags**
- **Backlinks**

Default: all three panels visible. Both sidebars collapse for maximum focus.

### Editor Behavior

Inherit the **good genes** of existing apps (Obsidian, Notion, Roam, Mem.ai, etc.,):

- Live markdown preview
- Auto-save (changes persist immediately, no manual save)
- Keyboard shortcuts for common actions
- All the small, well-executed features these apps do well

---

## USER STORIES

- US-1: Authentication: **As a** user, **I want** to securely access my personal notes **so that** my thinking remains private and persistent across sessions.
- US-2: Create and Edit Notes: **As a** user, **I want** to create notes with an explicit problem field **so that** future-me can evaluate ideas against the problems they were meant to solve.
- US-3: AI Problem Reconstruction: **As a** user who captured an idea quickly, **I want** AI to help me articulate what problem this note addresses **so that** I maintain epistemic context without friction.
- US-4: Delete and Restore Notes: **As a** user, **I want** to delete notes and recover them if needed **so that** I can kill bad ideas while protecting against accidents.
- US-5: Search Notes: **As a** user, **I want** to find notes by meaning, not just keywords **so that** I can retrieve relevant thinking even when I don't remember exact wording.
- US-6: Automatic Conflict Detection: **As a** user, **I want** the system to detect when my notes contain conflicting claims **so that** contradictions surface for resolution instead of hiding across my knowledge base.
- US-7: Conflict Resolution: **As a** user, **I want** to view and resolve conflicts between my notes **so that** my knowledge base becomes internally consistent through deliberate error-correction.
- US-8: Related Notes Surfacing: **As a** user, **I want** to see notes related to what I'm currently working on **so that** my past thinking actively participates in current problem-solving.
- US-9: Problem Graph Visualization: **As a** user, **I want** to visualize how my notes cluster around problems **so that** I can navigate my knowledge by "what am I trying to solve?" rather than "what did I write?"
- US-10: AI Criticism Amplifier: **As a** user, **I want** AI to help me find weaknesses in my thinking **so that** I can improve my ideas through deliberate criticism.
- US-11: AI Clean Note: **As a** user, **I want** AI to help me improve the readability of my notes **so that** my thinking is clearer without changing the substance.
- US-12: Pin Notes: **As a** user, **I want** to pin important notes **so that** I can quickly access my most active thinking.
- US-13: Admin Dashboard: **As an** admin, **I want** to manage users and view system status **so that** I can administer the system.

---

## CONSTRAINTS

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

- Auto-save handles rapid typing gracefully
- Background processing failures retry without user intervention
- Handle edit-during-processing: reprocess after completion

---

## PHASED DELIVERY

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

## SUCCESS SIGNALS

### Primary: Selection Pressure Works

- Users engage with surfaced conflicts
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

## OPEN CONSIDERATIONS

For implementing agents to consider:

1. **Problem field UX**: The design should make problem entry feel natural and valuable, not like a chore. The AI reconstruction button should feel like helpful assistance. Monitor whether users fill the field when optional.
2. **Conflict sensitivity tuning**: Start conservative (fewer false positives). Tune based on whether users engage with surfaced conflicts.
3. **Problem Graph layout**: Graph layout algorithms significantly affect usability. Consider force-directed layouts that cluster related notes. The graph should be navigable and useful, not just pretty.
4. **AI criticism quality**: The criticism amplifier is only valuable if it surfaces real weaknesses. Prompt engineering matters significantly here.
5. **Diff UX for Clean Note**: The accept/reject interface for AI-cleaned notes should be intuitive. Draw from established code review UX patterns.
6. **Performance at scale**: With many notes, semantic operations could be expensive. Consider incremental approaches, caching, and change-detection to avoid unnecessary reprocessing.