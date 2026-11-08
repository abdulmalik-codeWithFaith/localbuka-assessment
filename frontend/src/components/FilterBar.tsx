import type { LocationSource } from '../hooks/useSearchLocation'
import type { FilterValues } from '../lib/filters'
import { SelectField, type SelectOption } from './SelectField'

const PRICE_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'Any price' },
  { value: '1', label: '₦' },
  { value: '2', label: '₦₦' },
  { value: '3', label: '₦₦₦' },
  { value: '4', label: '₦₦₦₦' },
]

const RATING_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'Any rating' },
  { value: '3', label: '3 and up' },
  { value: '4', label: '4 and up' },
  { value: '4.5', label: '4.5 and up' },
]

const LOCATION_OPTIONS: readonly SelectOption[] = [
  { value: 'anywhere', label: 'Anywhere' },
  { value: 'device', label: 'My location' },
  { value: 'demo', label: 'Yaba, Lagos (demo)' },
]

const RADIUS_OPTIONS: readonly SelectOption[] = [
  { value: '2', label: 'Within 2 km' },
  { value: '5', label: 'Within 5 km' },
  { value: '10', label: 'Within 10 km' },
  { value: '25', label: 'Within 25 km' },
  { value: '50', label: 'Within 50 km' },
]

interface FilterBarProps {
  values: FilterValues
  cuisines: readonly string[]
  onChange: (patch: Partial<FilterValues>) => void
  locationSource: LocationSource
  onLocationChange: (source: LocationSource) => void
  isLocating: boolean
  locationError: string | null
  hasActiveFilters: boolean
  onClear: () => void
}

function isLocationSource(value: string): value is LocationSource {
  return value === 'anywhere' || value === 'device' || value === 'demo'
}

export function FilterBar({
  values,
  cuisines,
  onChange,
  locationSource,
  onLocationChange,
  isLocating,
  locationError,
  hasActiveFilters,
  onClear,
}: FilterBarProps) {
  const cuisineOptions: SelectOption[] = [
    { value: '', label: 'Any cuisine' },
    ...cuisines.map((cuisine) => ({ value: cuisine, label: cuisine })),
  ]

  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SelectField
          label="Cuisine"
          value={values.cuisine}
          options={cuisineOptions}
          onChange={(cuisine) => onChange({ cuisine })}
        />
        <SelectField
          label="Price"
          value={values.price}
          options={PRICE_OPTIONS}
          onChange={(price) => onChange({ price })}
        />
        <SelectField
          label="Rating"
          value={values.rating}
          options={RATING_OPTIONS}
          onChange={(rating) => onChange({ rating })}
        />
        <SelectField
          label="Near"
          value={locationSource}
          options={LOCATION_OPTIONS}
          onChange={(value) => {
            if (isLocationSource(value)) onLocationChange(value)
          }}
        />
        <SelectField
          label="Distance"
          value={values.radius}
          options={RADIUS_OPTIONS}
          onChange={(radius) => onChange({ radius })}
          disabled={locationSource === 'anywhere'}
        />
      </div>

      <div className="mt-3 flex min-h-6 flex-wrap items-center justify-between gap-3 text-sm">
        <div aria-live="polite">
          {isLocating && <p className="text-muted">Finding your location…</p>}
          {locationError && <p className="font-semibold text-pepper-600">{locationError}</p>}
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="font-semibold text-palm-700 underline underline-offset-4 hover:text-palm-800"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  )
}
