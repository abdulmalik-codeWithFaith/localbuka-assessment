export interface DemoSettings {
  slowLoading: boolean
  failFavorites: boolean
}

interface DemoControlsProps {
  settings: DemoSettings
  onChange: (patch: Partial<DemoSettings>) => void
}

/** Switches that make the loading and failure states easy to see. They change nothing else. */
export function DemoControls({ settings, onChange }: DemoControlsProps) {
  return (
    <details className="mt-12 rounded-xl border border-line bg-white p-4 text-sm">
      <summary className="cursor-pointer font-semibold">Demo controls</summary>
      <p className="mt-3 text-muted">
        Use these to see how the page behaves when things go slowly or wrong.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.slowLoading}
            onChange={(event) => onChange({ slowLoading: event.target.checked })}
            className="size-4 accent-palm-700"
          />
          Slow down loading by 2 seconds, to see the skeleton cards
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.failFavorites}
            onChange={(event) => onChange({ failFavorites: event.target.checked })}
            className="size-4 accent-palm-700"
          />
          Make saving a favorite fail, to see it roll back
        </label>
      </div>
    </details>
  )
}
