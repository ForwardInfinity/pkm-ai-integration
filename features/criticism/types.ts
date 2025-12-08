// Crucible AI Criticism Feature Types

export type ChallengeAngle =
  | 'hidden_assumption'
  | 'logical_gap'
  | 'steelmanned_counter'
  | 'empirical_challenge'
  | 'scope_limits'

export const CHALLENGE_ANGLES: ChallengeAngle[] = [
  'hidden_assumption',
  'logical_gap',
  'steelmanned_counter',
  'empirical_challenge',
  'scope_limits',
]

export const CHALLENGE_ANGLE_LABELS: Record<ChallengeAngle, string> = {
  hidden_assumption: 'Hidden Assumption',
  logical_gap: 'Logical Gap',
  steelmanned_counter: 'Steelmanned Counter',
  empirical_challenge: 'Empirical Challenge',
  scope_limits: 'Scope & Limits',
}

export interface ThesisAnalysis {
  thesis: string
  assumptions: string[]
  keyInferences: string[]
}

export interface Challenge {
  id: string
  angle: ChallengeAngle
  content: string
  round: number
}

export interface Defense {
  challengeId: string
  content: string
  timestamp: number
}

export type DefenseEvaluation = {
  quality: 'strong' | 'weak' | 'partial'
  feedback: string
  shouldEscalate: boolean
  escalationPrompt?: string
}

export interface Exchange {
  challenge: Challenge
  defense: Defense | null
  evaluation: DefenseEvaluation | null
  conceded: boolean
}

export interface CrucibleSession {
  id: string
  noteId: string
  thesis: ThesisAnalysis
  currentRound: number
  totalRounds: number
  exchanges: Exchange[]
  concessions: string[]
  status: 'analyzing' | 'challenging' | 'awaiting_defense' | 'evaluating' | 'complete'
  startedAt: number
  completedAt: number | null
}

export interface CrucibleReport {
  sessionId: string
  noteId: string
  thesis: string
  survivedChallenges: Array<{
    angle: ChallengeAngle
    challenge: string
    defense: string
    evaluation: string
  }>
  concessions: string[]
  suggestedRevisions: string[]
  duration: number
  completedRounds: number
}
