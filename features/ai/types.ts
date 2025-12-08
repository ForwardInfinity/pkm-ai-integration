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

export interface CleanedNote {
  title: string;
  problem: string;
  content: string;
}

export interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}
