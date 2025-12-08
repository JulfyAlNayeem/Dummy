import React from 'react'
import { useRouteError } from 'react-router-dom'

export function RouterErrorFallback() {
  const error = useRouteError()
  return (
    <div>
      <p>Something went wrong:</p>
      <pre>{error?.message || 'Unknown error'}</pre>
    </div>
  )
}

export default function ErrorFallback({error, resetErrorBoundary}) {
  return (
    <div>
      <p>Something went wrong:</p>
      <pre>{error?.message || 'Unknown error'}</pre>
      <button onClick={resetErrorBoundary}> Try again</button>
    </div>
  )
}
