import { beforeEach, expect, test, vi } from 'vitest'
vi.mock('zustand/middleware', () => ({ persist: (initializer: unknown) => initializer }))
import { useCardStore, type CardData } from './useCardStore'

const card = (id: string, status: CardData['status'] = 'reviewing'): CardData => ({
  id, status, fileName: `${id}.png`, rawText: '', createdAt: '2026-10-23', updatedAt: '2026-10-23',
})
beforeEach(() => { useCardStore.setState({ pendingCards: [card('one'), card('two', 'failed')], sentCards: [card('sent', 'sent')], selectedCardId: 'one' }); })

test('skipping changes queue order and ignores an unknown card', () => {
  useCardStore.getState().moveCardToBottom('one')
  expect(useCardStore.getState().pendingCards.map(card => card.id)).toEqual(['two', 'one'])
  useCardStore.getState().moveCardToBottom('missing')
  expect(useCardStore.getState().pendingCards.map(card => card.id)).toEqual(['two', 'one'])
})
test('retry changes only failed cards and clears their error', () => {
  useCardStore.getState().updateCard('two', { error: 'fixture error' })
  useCardStore.getState().retryFailedCards()
  expect(useCardStore.getState().pendingCards.map(card => card.status)).toEqual(['reviewing', 'reviewing'])
  expect(useCardStore.getState().pendingCards[1].error).toBeUndefined()
})
test('sending moves one card to history with a sent timestamp', () => {
  useCardStore.getState().sendCard('one')
  expect(useCardStore.getState().pendingCards.map(card => card.id)).toEqual(['two'])
  const sent = useCardStore.getState().sentCards.find(card => card.id === 'one')!
  expect(sent.status).toBe('sent')
  expect(Number.isNaN(Date.parse(sent.sentAt!))).toBe(false)
})
test('removing a selected card clears the selection', () => {
  useCardStore.getState().clearCard('one')
  expect(useCardStore.getState().selectedCardId).toBeNull()
  expect(useCardStore.getState().pendingCards.map(card => card.id)).toEqual(['two'])
})
test('clearing sent history preserves the pending queue', () => {
  useCardStore.getState().clearSentCards()
  expect(useCardStore.getState().sentCards).toEqual([])
  expect(useCardStore.getState().pendingCards).toHaveLength(2)
})
