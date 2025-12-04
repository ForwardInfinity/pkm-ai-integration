// AI-related type definitions

export interface ProblemReconstructionResult {
  suggestion: string;
  alternatives?: string[];
}

export interface CritiqueResult {
  counterarguments: string[];
  weakLinks: string[];
  hiddenAssumptions: string[];
  blindspots: string[];
}

export interface CleanNoteResult {
  cleanedContent: string;
  diff: DiffChange[];
}

export interface DiffChange {
  type: 'addition' | 'deletion' | 'modification';
  original?: string;
  modified?: string;
  lineNumber: number;
}
