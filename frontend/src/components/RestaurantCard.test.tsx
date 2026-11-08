import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeRestaurant } from '../test/fixtures'
import { RestaurantCard } from './RestaurantCard'

function renderCard(overrides = {}, props: { isFavorite?: boolean; onToggleFavorite?: () => void } = {}) {
  const restaurant = makeRestaurant(overrides)
  const onToggleFavorite = props.onToggleFavorite ?? vi.fn()
  render(
    <RestaurantCard restaurant={restaurant} isFavorite={props.isFavorite ?? false} onToggleFavorite={onToggleFavorite} />,
  )
  return { restaurant, onToggleFavorite }
}

describe('RestaurantCard', () => {
  it('shows the name, cuisine, price, rating, address and tags', () => {
    renderCard()

    expect(screen.getByRole('heading', { name: 'Mama Cass Kitchen' })).toBeTruthy()
    expect(screen.getByText('Nigerian')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Price level 2 of 4' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Rated 4.5 out of 5' })).toBeTruthy()
    expect(screen.getByText('Herbert Macaulay Way, Yaba, Lagos')).toBeTruthy()
    expect(screen.getByText('jollof')).toBeTruthy()
    expect(screen.getByText('swallow')).toBeTruthy()
    expect(screen.getByText('Open now')).toBeTruthy()
  })

  it('says when a restaurant is closed', () => {
    renderCard({ isOpen: false })
    expect(screen.getByText('Closed')).toBeTruthy()
  })

  it('shows the distance only when the search had a position', () => {
    renderCard({ distance: 1.22 })
    expect(screen.getByText('1.2 km away')).toBeTruthy()
  })

  it('shows short distances in metres', () => {
    renderCard({ distance: 0.35 })
    expect(screen.getByText('350 m away')).toBeTruthy()
  })

  it('shows no distance when none was provided', () => {
    renderCard()
    expect(screen.queryByText(/away/)).toBeNull()
  })

  it('shows the photo, then a placeholder if the photo fails to load', () => {
    renderCard()
    const photo = screen.getByRole('img', { name: 'Mama Cass Kitchen' })
    expect(photo.tagName).toBe('IMG')

    fireEvent.error(photo)

    expect(screen.queryByRole('img', { name: 'Mama Cass Kitchen' })).toBeNull()
    expect(screen.getByRole('img', { name: 'No photo available for Mama Cass Kitchen' })).toBeTruthy()
  })

  it('shows the placeholder straight away when there is no photo', () => {
    renderCard({ images: [] })
    expect(screen.getByRole('img', { name: 'No photo available for Mama Cass Kitchen' })).toBeTruthy()
  })

  it('reflects the favorite state and reports clicks', async () => {
    const onToggleFavorite = vi.fn()
    const { restaurant } = renderCard({}, { isFavorite: true, onToggleFavorite })

    const heart = screen.getByRole('button', { name: 'Favorite Mama Cass Kitchen' })
    expect(heart.getAttribute('aria-pressed')).toBe('true')

    await userEvent.click(heart)
    expect(onToggleFavorite).toHaveBeenCalledWith(restaurant)
  })
})
