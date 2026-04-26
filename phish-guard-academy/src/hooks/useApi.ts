/**
 * React hook helpers for calling backend API endpoints.
 * This file defines the useApi hook for fetching data from a given URL and managing loading and error states, as well as helper functions apiPost and apiGet for making POST and GET requests to the backend API. These utilities are used throughout the PhishGuard Academy application to interact with the backend services.
 * - useApi: A custom React hook that takes a URL and optional options, and returns the fetched data, loading state, and error state.
 * - apiPost: A helper function for making POST requests to the backend API, which takes a URL and a request body, and returns the response data.
 * - apiGet: A helper function for making GET requests to the backend API, which takes a URL and returns the response data.
 */

import { useState, useEffect } from 'react'

interface UseApiOptions {
  skip?: boolean
}

export function useApi<T>(url: string, options?: UseApiOptions) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (options?.skip) return

        const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(url)
        if (!res.ok) throw new Error(`${res.status}`)
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [url, options?.skip])

  return { data, loading, error }
}

export async function apiPost<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}
