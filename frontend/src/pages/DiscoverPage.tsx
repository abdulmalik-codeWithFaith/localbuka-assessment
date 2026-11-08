import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchRestaurants } from '../api/restaurants'
import { DemoControls, type DemoSettings } from '../components/DemoControls'
import { ErrorPanel } from '../components/ErrorPanel'
import { FilterBar } from '../components/FilterBar'
import { SearchIcon } from '../components/icons'
import { Notice } from '../components/Notice'
import { RestaurantGrid } from '../components/RestaurantGrid'
import { RestaurantGridSkeleton } from '../components/RestaurantCardSkeleton'
import { useAsyncData } from '../hooks/useAsyncData'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useDelayedFlag } from '../hooks/useDelayedFlag'
import { useFavorites } from '../hooks/useFavorites'
import { useSearchLocation } from '../hooks/useSearchLocation'
import {
  DEFAULT_FILTER_VALUES,
  matchesSearch,
  toApiFilters,
  uniqueCuisines,
  type FilterValues,
} from '../lib/filters'
import { pluralize } from '../lib/format'
import { wait } from '../lib/wait'

/** How long loading must take before the skeleton replaces results that are already on screen. */
const SKELETON_DELAY_MS = 250
const SLOW_LOADING_MS = 2000
const NOTICE_DURATION_MS = 7000

export function DiscoverPage() {
  const { user } = useCurrentUser()
  const location = useSearchLocation()

  const [values, setValues] = useState<FilterValues>(DEFAULT_FILTER_VALUES)
  const [demo, setDemo] = useState<DemoSettings>({ slowLoading: false, failFavorites: false })
  const [notice, setNotice] = useState<string | null>(null)

  const { favoriteIds, toggleFavorite } = useFavorites({
    userId: user.id,
    simulateFailure: demo.failFavorites,
    onError: setNotice,
  })

  useEffect(() => {
    if (notice === null) return
    const timer = setTimeout(() => setNotice(null), NOTICE_DURATION_MS)
    return () => clearTimeout(timer)
  }, [notice])

  // The restaurants themselves: filtered by the API.
  const { cuisine, price, rating, radius } = values
  const { coordinates } = location
  const apiFilters = useMemo(
    () => toApiFilters({ search: '', cuisine, price, rating, radius }, coordinates),
    [cuisine, price, rating, radius, coordinates],
  )
  const { slowLoading } = demo
  const loadResults = useCallback(
    async (signal: AbortSignal) => {
      if (slowLoading) await wait(SLOW_LOADING_MS, signal)
      return fetchRestaurants(apiFilters, signal)
    },
    [apiFilters, slowLoading],
  )
  const results = useAsyncData(loadResults)

  // The full list, loaded once, so the cuisine choices stay the same whatever is filtered.
  const loadCatalog = useCallback((signal: AbortSignal) => fetchRestaurants({}, signal), [])
  const catalog = useAsyncData(loadCatalog)
  const cuisines = useMemo(() => uniqueCuisines(catalog.data ?? []), [catalog.data])

  // Name search is local: it needs no request, so it reacts on every keystroke.
  const visibleRestaurants = useMemo(
    () => (results.data ?? []).filter((restaurant) => matchesSearch(restaurant, values.search)),
    [results.data, values.search],
  )

  const isSlow = useDelayedFlag(results.isLoading, SKELETON_DELAY_MS)
  const showSkeleton = results.isLoading && (results.data === null || isSlow)

  const hasActiveFilters =
    values.search.trim() !== '' ||
    cuisine !== '' ||
    price !== '' ||
    rating !== '' ||
    location.source !== 'anywhere'

  const updateValues = useCallback(
    (patch: Partial<FilterValues>) => setValues((current) => ({ ...current, ...patch })),
    [],
  )
  const { choose: chooseLocation } = location
  const clearFilters = useCallback(() => {
    setValues(DEFAULT_FILTER_VALUES)
    void chooseLocation('anywhere')
  }, [chooseLocation])
  const dismissNotice = useCallback(() => setNotice(null), [])

  const renderResults = () => {
    if (results.error) {
      return <ErrorPanel message={results.error} onRetry={results.reload} />
    }
    if (showSkeleton) {
      return <RestaurantGridSkeleton />
    }
    if (results.data === null) {
      return null
    }
    if (visibleRestaurants.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <h2 className="font-display text-xl font-bold">No bukas match your search</h2>
          <p className="mt-2 text-muted">
            {hasActiveFilters
              ? 'Try a different name, or loosen the filters.'
              : 'There are no restaurants to show yet.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-lg bg-palm-700 px-4 py-2 text-sm font-semibold text-white hover:bg-palm-800"
            >
              Clear all filters
            </button>
          )}
        </div>
      )
    }
    return (
      <div aria-busy={results.isLoading} className={results.isLoading ? 'opacity-60 transition-opacity' : undefined}>
        <p aria-live="polite" className="mb-4 text-sm font-semibold text-muted">
          {pluralize(visibleRestaurants.length, 'buka')} found
          {location.coordinates ? ', nearest first' : ''}
        </p>
        <RestaurantGrid
          restaurants={visibleRestaurants}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="discover-heading"
        className="rounded-3xl border-b-8 border-danfo-400 bg-palm-700 px-6 py-8 text-white sm:px-10 sm:py-12"
      >
        <h1 id="discover-heading" className="max-w-xl text-3xl font-extrabold sm:text-5xl">
          Find a buka near you
        </h1>
        <p className="mt-3 max-w-xl text-palm-100 sm:text-lg">
          Search by name, then narrow it down by cuisine, price, rating or distance.
        </p>

        <form role="search" onSubmit={(event) => event.preventDefault()} className="mt-6 max-w-2xl">
          <label htmlFor="restaurant-search" className="sr-only">
            Search restaurants
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
            <input
              id="restaurant-search"
              type="search"
              value={values.search}
              onChange={(event) => updateValues({ search: event.target.value })}
              placeholder="Search by name, cuisine or dish"
              className="w-full rounded-xl bg-white py-3.5 pl-12 pr-4 text-base text-ink placeholder:text-muted"
            />
          </div>
        </form>
      </section>

      <FilterBar
        values={values}
        cuisines={cuisines}
        onChange={updateValues}
        locationSource={location.source}
        onLocationChange={(source) => void chooseLocation(source)}
        isLocating={location.isLocating}
        locationError={location.error}
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
      />

      <section aria-label="Results">{renderResults()}</section>

      <DemoControls settings={demo} onChange={(patch) => setDemo((current) => ({ ...current, ...patch }))} />

      {notice && <Notice message={notice} onDismiss={dismissNotice} />}
    </div>
  )
}
