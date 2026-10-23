import { expect, test, vi } from 'vitest'
vi.mock('openai', () => ({ default: class {
  chat = { completions: { create: vi.fn().mockRejectedValue(new Error('offline fixture')) } }
} }))
import { generateEmail } from './emailGenerator.js'

test.each(['ja', 'en'] as const)('offline %s fallback has a valid default tone and content', async (language) => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    const result = await generateEmail({ cardData: { name: 'Fixture recipient' }, senderName: 'Fixture sender', language })
    expect(result.tone).toBe('professional')
    expect(result.language).toBe(language)
    expect(result.subject.length).toBeGreaterThan(0)
    expect(result.body).toContain('Fixture sender')
  } finally { log.mockRestore() }
})
