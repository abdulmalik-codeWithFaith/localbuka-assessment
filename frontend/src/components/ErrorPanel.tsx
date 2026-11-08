interface ErrorPanelProps {
  message: string
  onRetry: () => void
}

export function ErrorPanel({ message, onRetry }: ErrorPanelProps) {
  return (
    <div role="alert" className="rounded-xl border border-pepper-500 bg-pepper-50 p-4">
      <p className="font-semibold text-pepper-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-lg bg-palm-700 px-4 py-2 text-sm font-semibold text-white hover:bg-palm-800"
      >
        Try again
      </button>
    </div>
  )
}
