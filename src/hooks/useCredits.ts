"use client"

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { UserCredits } from '@/lib/credits'

interface CreditsData {
  credits: UserCredits
  tier: 'free' | 'pro'
  isPro: boolean
  maxFileSize: number
  maxFileSizeMB: number
}

export function useCredits() {
  const { isSignedIn, isLoaded } = useUser()
  const [data, setData] = useState<CreditsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCredits = useCallback(async () => {
    if (!isSignedIn) {
      setData(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/credits')

      if (!response.ok) {
        throw new Error('Failed to fetch credits')
      }

      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      console.error('Error fetching credits:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [isSignedIn])

  useEffect(() => {
    if (isLoaded) {
      fetchCredits()
    }
  }, [isLoaded, isSignedIn, fetchCredits])

  const deductCredit = async (type: 'transcription' | 'speakerSplit' | 'documents' | 'voiceClone') => {
    try {
      const response = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })

      if (!response.ok) {
        const result = await response.json()
        if (response.status === 402) {
          throw new Error(`Insufficient ${type} credits`)
        }
        throw new Error(result.error || 'Failed to deduct credit')
      }

      const result = await response.json()
      // Update local state with new credits
      if (data) {
        setData({
          ...data,
          credits: result.credits
        })
      }

      return result
    } catch (err) {
      throw err
    }
  }

  const checkCredits = (type: 'transcription' | 'speakerSplit' | 'documents' | 'voiceClone'): boolean => {
    if (!data) return false
    return data.credits[type] > 0
  }

  const refetch = () => {
    fetchCredits()
  }

  return {
    credits: data?.credits || null,
    tier: data?.tier || 'free',
    isPro: data?.isPro || false,
    maxFileSize: data?.maxFileSize || 50 * 1024 * 1024,
    maxFileSizeMB: data?.maxFileSizeMB || 50,
    loading,
    error,
    deductCredit,
    checkCredits,
    refetch
  }
}
