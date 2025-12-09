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
