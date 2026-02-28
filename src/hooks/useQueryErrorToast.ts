import { useEffect } from 'react'
import { useToast } from '../components/Toast'

interface QueryWithError {
  isError: boolean
  error: unknown
}

export function useQueryErrorToast(query: QueryWithError, fallbackMessage: string) {
  const { showToast } = useToast()

  useEffect(() => {
    if (!query.isError) return

    const message = query.error instanceof Error ? query.error.message : fallbackMessage
    showToast(message, 'error')
  }, [query.isError, query.error, fallbackMessage, showToast])
}
