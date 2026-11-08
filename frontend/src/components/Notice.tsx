import { CloseIcon } from './icons'

interface NoticeProps {
  message: string
  onDismiss: () => void
}

/** A message that appears over the page and is announced to screen readers. */
export function Notice({ message, onDismiss }: NoticeProps) {
  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-4 z-20 mx-auto flex max-w-xl items-start gap-3 rounded-xl border border-pepper-500 bg-pepper-50 p-4 shadow-lg"
    >
      <p className="flex-1 text-sm font-semibold text-pepper-600">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss message"
        className="grid size-6 place-items-center rounded text-pepper-600 hover:bg-white"
      >
        <CloseIcon className="size-4" />
      </button>
    </div>
  )
}
