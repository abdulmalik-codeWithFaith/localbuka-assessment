import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { readFavorites, setFavorite } from '../api/favorites'
import { createDeferred } from '../test/fixtures'
import { useFavorites } from './useFavorites'

vi.mock('../api/favorites')

const restaurant = { id: 'buka_001', name: 'Mama Cass Kitchen' }

describe('useFavorites', () => {
  const onError = vi.fn()

  beforeEach(() => {
    vi.mocked(readFavorites).mockReturnValue(new Set())
  })

  const render = (userId = 'user_101') =>
    renderHook(() => useFavorites({ userId, simulateFailure: false, onError }))

  it('marks a favorite immediately, before the request has finished', async () => {
    const request = createDeferred<void>()
    vi.mocked(setFavorite).mockReturnValue(request.promise)
    const { result } = render()

    let toggling!: Promise<void>
    act(() => {
      toggling = result.current.toggleFavorite(restaurant)
    })

    // The request is still pending, yet the heart is already filled in.
    expect(result.current.favoriteIds.has('buka_001')).toBe(true)

    await act(async () => {
      request.resolve()
      await toggling
    })
    expect(result.current.favoriteIds.has('buka_001')).toBe(true)
    expect(setFavorite).toHaveBeenCalledWith('user_101', 'buka_001', true, { simulateFailure: false })
    expect(onError).not.toHaveBeenCalled()
  })

  it('rolls back and explains when the request fails', async () => {
    const request = createDeferred<void>()
    vi.mocked(setFavorite).mockReturnValue(request.promise)
    const { result } = render()

    let toggling!: Promise<void>
    act(() => {
      toggling = result.current.toggleFavorite(restaurant)
    })
    expect(result.current.favoriteIds.has('buka_001')).toBe(true)

    await act(async () => {
      request.reject(new ApiError('The favorites service is unavailable.', 503))
      await toggling
    })

    expect(result.current.favoriteIds.has('buka_001')).toBe(false)
    expect(onError).toHaveBeenCalledOnce()
    expect(onError.mock.calls[0]?.[0]).toContain("Couldn't save Mama Cass Kitchen to your favorites")
    expect(onError.mock.calls[0]?.[0]).toContain('The favorites service is unavailable.')
  })

  it('puts a removed favorite back when removing it fails', async () => {
    vi.mocked(readFavorites).mockReturnValue(new Set(['buka_001']))
    vi.mocked(setFavorite).mockRejectedValue(new ApiError('Down.', 503))
    const { result } = render()
    expect(result.current.favoriteIds.has('buka_001')).toBe(true)

    await act(async () => {
      await result.current.toggleFavorite(restaurant)
    })

    expect(result.current.favoriteIds.has('buka_001')).toBe(true)
    expect(onError.mock.calls[0]?.[0]).toContain("Couldn't remove Mama Cass Kitchen from your favorites")
  })

  it('ignores a second click on the same restaurant while its request is pending', async () => {
    const request = createDeferred<void>()
    vi.mocked(setFavorite).mockReturnValue(request.promise)
    const { result } = render()

    let first!: Promise<void>
    act(() => {
      first = result.current.toggleFavorite(restaurant)
    })
    await act(async () => {
      await result.current.toggleFavorite(restaurant)
    })

    expect(setFavorite).toHaveBeenCalledTimes(1)
    expect(result.current.favoriteIds.has('buka_001')).toBe(true)

    await act(async () => {
      request.resolve()
      await first
    })
  })

  it('keeps each user\'s favorites separate', () => {
    vi.mocked(readFavorites).mockImplementation((userId) =>
      userId === 'user_101' ? new Set(['buka_001']) : new Set(),
    )
    const { result, rerender } = renderHook(
      ({ userId }) => useFavorites({ userId, simulateFailure: false, onError }),
      { initialProps: { userId: 'user_101' } },
    )
    expect(result.current.favoriteIds.has('buka_001')).toBe(true)

    rerender({ userId: 'user_102' })
    expect(result.current.favoriteIds.has('buka_001')).toBe(false)
  })
})
