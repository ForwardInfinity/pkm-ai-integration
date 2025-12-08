'use client'

import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { nanoid } from 'nanoid'
import type {
  CrucibleSession,
  ThesisAnalysis,
  Challenge,
  Defense,
  DefenseEvaluation,
  Exchange,
  ChallengeAngle,
} from '@/features/criticism/types'

interface CrucibleState {
  session: CrucibleSession | null
  isOpen: boolean
  currentChallenge: string
  isStreaming: boolean
}

interface CrucibleActions {
  openCrucible: () => void
  closeCrucible: () => void
  startSession: (noteId: string, thesis: ThesisAnalysis, totalRounds?: number) => void
  setStatus: (status: CrucibleSession['status']) => void
  addChallenge: (angle: ChallengeAngle, content: string) => void
  updateStreamingChallenge: (content: string) => void
  setStreaming: (streaming: boolean) => void
  addDefense: (challengeId: string, content: string) => void
  setEvaluation: (challengeId: string, evaluation: DefenseEvaluation) => void
  concedeChallenge: (challengeId: string) => void
  advanceRound: () => void
  completeSession: () => void
  reset: () => void
}

type CrucibleStore = CrucibleState & CrucibleActions

const initialState: CrucibleState = {
  session: null,
  isOpen: false,
  currentChallenge: '',
  isStreaming: false,
}

export const useCrucibleStore = create<CrucibleStore>((set, get) => ({
  ...initialState,

  openCrucible: () => {
    set({ isOpen: true })
  },

  closeCrucible: () => {
    set({ isOpen: false })
  },

  startSession: (noteId: string, thesis: ThesisAnalysis, totalRounds = 5) => {
    const session: CrucibleSession = {
      id: nanoid(),
      noteId,
      thesis,
      currentRound: 1,
      totalRounds,
      exchanges: [],
      concessions: [],
      status: 'challenging',
      startedAt: Date.now(),
      completedAt: null,
    }
    set({ session, isOpen: true })
  },

  setStatus: (status) => {
    const { session } = get()
    if (session) {
      set({ session: { ...session, status } })
    }
  },

  addChallenge: (angle: ChallengeAngle, content: string) => {
    const { session } = get()
    if (!session) return

    const challenge: Challenge = {
      id: nanoid(),
      angle,
      content,
      round: session.currentRound,
    }

    const exchange: Exchange = {
      challenge,
      defense: null,
      evaluation: null,
      conceded: false,
    }

    set({
      session: {
        ...session,
        exchanges: [...session.exchanges, exchange],
        status: 'awaiting_defense',
      },
      currentChallenge: '',
      isStreaming: false,
    })
  },

  updateStreamingChallenge: (content: string) => {
    set({ currentChallenge: content })
  },

  setStreaming: (streaming: boolean) => {
    set({ isStreaming: streaming })
  },

  addDefense: (challengeId: string, content: string) => {
    const { session } = get()
    if (!session) return

    const defense: Defense = {
      challengeId,
      content,
      timestamp: Date.now(),
    }

    const updatedExchanges = session.exchanges.map((exchange) =>
      exchange.challenge.id === challengeId
        ? { ...exchange, defense }
        : exchange
    )

    set({
      session: {
        ...session,
        exchanges: updatedExchanges,
        status: 'evaluating',
      },
    })
  },

  setEvaluation: (challengeId: string, evaluation: DefenseEvaluation) => {
    const { session } = get()
    if (!session) return

    const updatedExchanges = session.exchanges.map((exchange) =>
      exchange.challenge.id === challengeId
        ? { ...exchange, evaluation }
        : exchange
    )

    set({
      session: {
        ...session,
        exchanges: updatedExchanges,
      },
    })
  },

  concedeChallenge: (challengeId: string) => {
    const { session } = get()
    if (!session) return

    const exchange = session.exchanges.find(
      (e) => e.challenge.id === challengeId
    )
    if (!exchange) return

    const updatedExchanges = session.exchanges.map((e) =>
      e.challenge.id === challengeId ? { ...e, conceded: true } : e
    )

    set({
      session: {
        ...session,
        exchanges: updatedExchanges,
        concessions: [...session.concessions, exchange.challenge.content],
      },
    })
  },

  advanceRound: () => {
    const { session } = get()
    if (!session) return

    const nextRound = session.currentRound + 1

    if (nextRound > session.totalRounds) {
      get().completeSession()
    } else {
      set({
        session: {
          ...session,
          currentRound: nextRound,
          status: 'challenging',
        },
      })
    }
  },

  completeSession: () => {
    const { session } = get()
    if (!session) return

    set({
      session: {
        ...session,
        status: 'complete',
        completedAt: Date.now(),
      },
    })
  },

  reset: () => {
    set(initialState)
  },
}))

// Selector hooks
export const useCrucibleSession = () =>
  useCrucibleStore((state) => state.session)

export const useCrucibleOpen = () => useCrucibleStore((state) => state.isOpen)

export const useCrucibleStreaming = () =>
  useCrucibleStore(
    useShallow((state) => ({
      currentChallenge: state.currentChallenge,
      isStreaming: state.isStreaming,
    }))
  )

export const useCrucibleActions = () =>
  useCrucibleStore(
    useShallow((state) => ({
      openCrucible: state.openCrucible,
      closeCrucible: state.closeCrucible,
      startSession: state.startSession,
      setStatus: state.setStatus,
      addChallenge: state.addChallenge,
      updateStreamingChallenge: state.updateStreamingChallenge,
      setStreaming: state.setStreaming,
      addDefense: state.addDefense,
      setEvaluation: state.setEvaluation,
      concedeChallenge: state.concedeChallenge,
      advanceRound: state.advanceRound,
      completeSession: state.completeSession,
      reset: state.reset,
    }))
  )

// Derived selectors
export const useCurrentExchange = () =>
  useCrucibleStore((state) => {
    if (!state.session) return null
    const exchanges = state.session.exchanges
    return exchanges.length > 0 ? exchanges[exchanges.length - 1] : null
  })

export const useCrucibleProgress = () =>
  useCrucibleStore(
    useShallow((state) => {
      if (!state.session) return { current: 0, total: 0, percentage: 0 }
      const { currentRound, totalRounds } = state.session
      return {
        current: currentRound,
        total: totalRounds,
        percentage: Math.round((currentRound / totalRounds) * 100),
      }
    })
  )
