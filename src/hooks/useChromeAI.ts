import { useState, useEffect, useCallback } from 'react'

interface AISession {
  prompt: (input: string) => Promise<string>
  promptStreaming: (input: string) => AsyncIterable<string>
  destroy: () => void
}

interface ChromeAIHook {
  isAvailable: boolean
  isReady: boolean
  status: string
  createSession: (systemPrompt?: string) => Promise<AISession | null>
  checkAvailability: () => Promise<void>
}

export const useChromeAI = (): ChromeAIHook => {
  const [isAvailable, setIsAvailable] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [status, setStatus] = useState('checking')

  const checkAvailability = useCallback(async () => {
    try {
      if (typeof window.LanguageModel === 'undefined') {
        setStatus('not-available')
        setIsAvailable(false)
        setIsReady(false)
        return
      }

      const availability = await window.LanguageModel.availability()
      setStatus(availability)
      setIsAvailable(true)
      setIsReady(availability === 'available')
      
      console.log('Chrome AI availability:', availability)
    } catch (error) {
      console.error('Error checking Chrome AI:', error)
      setStatus('error')
      setIsAvailable(false)
      setIsReady(false)
    }
  }, [])

  const createSession = useCallback(async (systemPrompt?: string): Promise<AISession | null> => {
    if (!isReady) return null

    try {
      const params = await window.LanguageModel.params()
      
      const session = await window.LanguageModel.create({
        temperature: params.defaultTemperature || 0.7,
        topK: params.defaultTopK || 40,
        outputLanguage: 'en',
        systemPrompt: systemPrompt || 'You are a helpful AI assistant. Respond naturally and conversationally. Keep responses concise unless detailed explanations are requested.'
      })

      return {
        prompt: async (input: string) => {
          return await session.prompt(input)
        },
        promptStreaming: (input: string) => {
          return session.promptStreaming(input)
        },
        destroy: () => {
          session.destroy()
        }
      }
    } catch (error) {
      console.error('Error creating AI session:', error)
      return null
    }
  }, [isReady])

  useEffect(() => {
    checkAvailability()
  }, [checkAvailability])

  return {
    isAvailable,
    isReady,
    status,
    createSession,
    checkAvailability
  }
}