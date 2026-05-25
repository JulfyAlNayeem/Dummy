import React from 'react'
import { useRouteError } from 'react-router-dom'

export function RouterErrorFallback(): JSX.Element {
  const error: any = useRouteError()
  return (
    <div>
      <p>Something went wrong:</p>
      <pre>{error?.message || 'Unknown error'}</pre>
    </div>
  )
}

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export default function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps): JSX.Element {
  return (
    <div>
      <p>Something went wrong:</p>
      <pre>{error?.message || 'Unknown error'}</pre>
      <button onClick={resetErrorBoundary}> Try again</button>
    </div>
  )
}
