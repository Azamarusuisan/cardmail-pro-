import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ExtractedData {
  name: string
  company: string
  role: string
  email: string
  phone: string
  confidence: number
}

export interface EmailContent {
  subject: string
  body: string
  tone: 'professional' | 'friendly' | 'casual'
  language: 'ja' | 'en'
}

export interface CardData {
  id: string
  fileName: string
  thumbnailUrl?: string
  rawText: string
  extractedData?: ExtractedData
  emailContent?: EmailContent
  status: 'processing' | 'reviewing' | 'ready' | 'sending' | 'sent' | 'failed'
  createdAt: string
  updatedAt: string
  sentAt?: string
}

interface CardStore {
  pendingCards: CardData[]
  sentCards: CardData[]
  selectedCardId: string | null
  
  addCard: (card: Omit<CardData, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateCard: (id: string, updates: Partial<CardData>) => void
  setSelectedCard: (id: string | null) => void
  clearCard: (id: string) => void
  sendCard: (id: string) => void
}

export const useCardStore = create<CardStore>()(
  persist(
    (set, get) => ({
      pendingCards: [],
      sentCards: [],
      selectedCardId: null,

      addCard: (card) => {
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        const newCard: CardData = {
          ...card,
          id,
          createdAt: now,
          updatedAt: now
        }
        
        set((state) => ({
          pendingCards: [...state.pendingCards, newCard],
          selectedCardId: id
        }))
        
        return id
      },

      updateCard: (id, updates) => {
        set((state) => ({
          pendingCards: state.pendingCards.map(card =>
            card.id === id 
              ? { ...card, ...updates, updatedAt: new Date().toISOString() }
              : card
          )
        }))
      },

      setSelectedCard: (id) => {
        set({ selectedCardId: id })
      },

      clearCard: (id) => {
        set((state) => ({
          pendingCards: state.pendingCards.filter(card => card.id !== id),
          selectedCardId: state.selectedCardId === id ? null : state.selectedCardId
        }))
      },

      sendCard: (id) => {
        set((state) => {
          const card = state.pendingCards.find(c => c.id === id)
          if (!card) return state

          return {
            pendingCards: state.pendingCards.filter(c => c.id !== id),
            sentCards: [...state.sentCards, {
              ...card,
              status: 'sent' as const,
              sentAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }]
          }
        })
      }
    }),
    {
      name: 'cardmail-cards'
    }
  )
)

// Helper hooks
export const usePendingCards = () => useCardStore(state => state.pendingCards)
export const useSentCards = () => useCardStore(state => state.sentCards)
export const useSelectedCard = () => {
  const { pendingCards, selectedCardId } = useCardStore()
  return pendingCards.find(card => card.id === selectedCardId)
}