// Conflicts feature public exports

// Types
export type {
  Conflict,
  ConflictStatus,
  ConflictType,
  ConflictWithNotes,
  NoteConflict,
} from './types';

// Hooks
export { useConflicts, conflictKeys } from './hooks/use-conflicts';
export { useNoteConflicts } from './hooks/use-note-conflicts';
export { useConflictCount } from './hooks/use-conflict-count';
export { useDismissConflict } from './hooks/use-dismiss-conflict';

// Actions
export { getConflicts } from './actions/get-conflicts';
export { getNoteConflicts } from './actions/get-note-conflicts';
export { dismissConflict } from './actions/dismiss-conflict';

// Components
export { ConflictList } from './components/conflict-list';
export { ConflictCard } from './components/conflict-card';
export { ConflictEmptyState } from './components/conflict-empty-state';
