import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { readFavorites, setFavorite } from '../api/favorites'
import { fetchRestaurants } from '../api/restaurants'
import { CurrentUserProvider } from '../context/CurrentUserProvider'
import { createDeferred, SAMPLE_RESTAURANTS } from '../test/fixtures'
import type { Restaurant } from '../types'
import { DiscoverPage } from './DiscoverPage'

vi.mock('../api/restaurants')
vi.mock('../api/favorites')

function renderPage() {
  return render(
    <CurrentUserProvider>
      <DiscoverPage />
    </CurrentUserProvider>,
  )
}

/** Cards currently on screen, by restaurant name. */
const cardNames = () => screen.queryAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)

describe('DiscoverPage', () => {
  beforeEach(() => {
    vi.mocked(fetchRestaurants).mockResolvedValue(SAMPLE_RESTAURANTS)
    vi.mocked(readFavorites).mockReturnValue(new Set())
  })

  it('shows skeleton cards while loading, then the restaurants', async () => {
    const request = createDeferred<Restaurant[]>()
    vi.mocked(fetchRestaurants).mockReturnValue(request.promise)
    renderPage()

    expect(screen.getByRole('status', { name: 'Loading restaurants' })).toBeTruthy()
    expect(cardNames()).toEqual([])

    request.resolve(SAMPLE_RESTAURANTS)

    expect(await screen.findByRole('heading', { name: 'Mama Cass Kitchen' })).toBeTruthy()
    expect(screen.queryByRole('status', { name: 'Loading restaurants' })).toBeNull()
    expect(cardNames()).toEqual(['Mama Cass Kitchen', 'White House Buka', 'Calabar Kitchen'])
    expect(screen.getByText('3 bukas found')).toBeTruthy()
  })

  it('offers every cuisine as a filter and asks the API when one is chosen', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('heading', { name: 'Mama Cass Kitchen' })

    const cuisine = screen.getByLabelText('Cuisine')
    const options = within(cuisine).getAllByRole('option').map((option) => option.textContent)
    expect(options).toEqual(['Any cuisine', 'Nigerian', 'South-South Nigerian', 'Traditional Nigerian'])

    await user.selectOptions(cuisine, 'Nigerian')

    await waitFor(() =>
      expect(fetchRestaurants).toHaveBeenLastCalledWith(
        expect.objectContaining({ cuisine: 'Nigerian' }),
        expect.any(AbortSignal),
      ),
    )
  })

  it('sends price and rating filters to the API', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('heading', { name: 'Mama Cass Kitchen' })

    await user.selectOptions(screen.getByLabelText('Price'), '2')
    await user.selectOptions(screen.getByLabelText('Rating'), '4.5')

    await waitFor(() =>
      expect(fetchRestaurants).toHaveBeenLastCalledWith(
        expect.objectContaining({ priceRange: 2, minRating: 4.5 }),
        expect.any(AbortSignal),
      ),
    )
  })

  it('searches by name locally, without asking the API again', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('heading', { name: 'Mama Cass Kitchen' })
    const callsBefore = vi.mocked(fetchRestaurants).mock.calls.length

    await user.type(screen.getByRole('searchbox', { name: 'Search restaurants' }), 'white')

    expect(cardNames()).toEqual(['White House Buka'])
    expect(screen.getByText('1 buka found')).toBeTruthy()
    expect(vi.mocked(fetchRestaurants).mock.calls.length).toBe(callsBefore)
  })

  it('explains an empty result and lets the user clear the filters', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('heading', { name: 'Mama Cass Kitchen' })

    await user.type(screen.getByRole('searchbox', { name: 'Search restaurants' }), 'sushi')
    expect(screen.getByRole('heading', { name: 'No bukas match your search' })).toBeTruthy()

    await user.click(screen.getAllByRole('button', { name: 'Clear all filters' })[0]!)

    expect(cardNames()).toHaveLength(3)
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('')
  })

  it('shows the error and recovers when Try again is pressed', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchRestaurants).mockRejectedValue(new ApiError('The server is having a problem.', 500))
    renderPage()

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('The server is having a problem.')

    vi.mocked(fetchRestaurants).mockResolvedValue(SAMPLE_RESTAURANTS)
    await user.click(within(alert).getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'Mama Cass Kitchen' })).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  describe('distance search', () => {
    it('searches from the demo location with the chosen radius', async () => {
      const user = userEvent.setup()
      renderPage()
      await screen.findByRole('heading', { name: 'Mama Cass Kitchen' })
      expect((screen.getByLabelText('Distance') as HTMLSelectElement).disabled).toBe(true)

      await user.selectOptions(screen.getByLabelText('Near'), 'demo')
      expect((screen.getByLabelText('Distance') as HTMLSelectElement).disabled).toBe(false)
      await user.selectOptions(screen.getByLabelText('Distance'), '10')

      await waitFor(() =>
        expect(fetchRestaurants).toHaveBeenLastCalledWith(
          expect.objectContaining({ latitude: 6.5244, longitude: 3.3792, radius: 10 }),
          expect.any(AbortSignal),
        ),
      )
      expect(await screen.findByText('3 bukas found, nearest first')).toBeTruthy()
    })

    it('uses the device position when it is shared', async () => {
      const user = userEvent.setup()
      const getCurrentPosition = vi.fn((success: PositionCallback) =>
        success({ coords: { latitude: 7.3775, longitude: 3.947 } } as GeolocationPosition),
      )
      vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } })
      renderPage()
      await screen.findByRole('heading', { name: 'Mama Cass Kitchen' })

      await user.selectOptions(screen.getByLabelText('Near'), 'device')

      await waitFor(() =>
        expect(fetchRestaurants).toHaveBeenLastCalledWith(
          expect.objectContaining({ latitude: 7.3775, longitude: 3.947 }),
          expect.any(AbortSignal),
        ),
      )
      vi.unstubAllGlobals()
    })

    it('explains a refused location request and goes back to searching anywhere', async () => {
      const user = userEvent.setup()
      const denied = {
        code: 1,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: 'denied',
      } as GeolocationPositionError
      const getCurrentPosition = vi.fn((_success: PositionCallback, failure: PositionErrorCallback) =>
        failure(denied),
      )
      vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } })
      renderPage()
      await screen.findByRole('heading', { name: 'Mama Cass Kitchen' })

      await user.selectOptions(screen.getByLabelText('Near'), 'device')

      expect(await screen.findByText(/Location access was blocked/)).toBeTruthy()
      expect((screen.getByLabelText('Near') as HTMLSelectElement).value).toBe('anywhere')
      vi.unstubAllGlobals()
    })
  })

  describe('favorites', () => {
    const heart = () => screen.getByRole('button', { name: 'Favorite Mama Cass Kitchen' })

    it('fills the heart immediately and keeps it when saving works', async () => {
      const user = userEvent.setup()
      const request = createDeferred<void>()
      vi.mocked(setFavorite).mockReturnValue(request.promise)
      renderPage()
      await screen.findByRole('heading', { name: 'Mama Cass Kitchen' })

      await user.click(heart())
      expect(heart().getAttribute('aria-pressed')).toBe('true')

      request.resolve()
      await waitFor(() => expect(setFavorite).toHaveBeenCalledTimes(1))
      expect(heart().getAttribute('aria-pressed')).toBe('true')
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it('undoes the heart and alerts the user when saving fails', async () => {
      const user = userEvent.setup()
      const request = createDeferred<void>()
      vi.mocked(setFavorite).mockReturnValue(request.promise)
      renderPage()
      await screen.findByRole('heading', { name: 'Mama Cass Kitchen' })

      await user.click(heart())
      expect(heart().getAttribute('aria-pressed')).toBe('true')

      request.reject(new ApiError('The favorites service is unavailable.', 503))

      const alert = await screen.findByRole('alert')
      expect(alert.textContent).toContain("Couldn't save Mama Cass Kitchen to your favorites")
      expect(heart().getAttribute('aria-pressed')).toBe('false')
    })

    it('passes the demo failure switch to the favorites service', async () => {
      const user = userEvent.setup()
      vi.mocked(setFavorite).mockResolvedValue()
      renderPage()
      await screen.findByRole('heading', { name: 'Mama Cass Kitchen' })

      await user.click(screen.getByText('Demo controls'))
      await user.click(screen.getByLabelText(/Make saving a favorite fail/))
      await user.click(heart())

      expect(setFavorite).toHaveBeenCalledWith('user_101', 'buka_001', true, { simulateFailure: true })
    })
  })
})
