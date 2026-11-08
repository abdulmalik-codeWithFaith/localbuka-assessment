import { describe, expect, it } from 'vitest'
import { makeRestaurant, SAMPLE_RESTAURANTS } from '../test/fixtures'
import { DEFAULT_FILTER_VALUES, matchesSearch, toApiFilters, uniqueCuisines } from './filters'

describe('matchesSearch', () => {
  const restaurant = makeRestaurant({ name: 'Mama Cass Kitchen', cuisine: 'Nigerian', tags: ['jollof', 'spicy'] })

  it('matches everything when the search is empty or only spaces', () => {
    expect(matchesSearch(restaurant, '')).toBe(true)
    expect(matchesSearch(restaurant, '   ')).toBe(true)
  })

  it('matches the name, cuisine and tags, ignoring case and surrounding spaces', () => {
    expect(matchesSearch(restaurant, 'mama')).toBe(true)
    expect(matchesSearch(restaurant, '  NIGERIAN ')).toBe(true)
    expect(matchesSearch(restaurant, 'Jollof')).toBe(true)
  })

  it('does not match unrelated text', () => {
    expect(matchesSearch(restaurant, 'sushi')).toBe(false)
  })
})

describe('toApiFilters', () => {
  it('sends nothing for filters left on "any"', () => {
    const filters = toApiFilters(DEFAULT_FILTER_VALUES, null)
    expect(filters).toEqual({ cuisine: undefined, priceRange: undefined, minRating: undefined })
  })

  it('converts the select values to the types the API expects', () => {
    const filters = toApiFilters({ ...DEFAULT_FILTER_VALUES, cuisine: 'Nigerian', price: '2', rating: '4.5' }, null)
    expect(filters).toMatchObject({ cuisine: 'Nigerian', priceRange: 2, minRating: 4.5 })
  })

  it('adds the position and radius only when there are coordinates', () => {
    const filters = toApiFilters({ ...DEFAULT_FILTER_VALUES, radius: '10' }, { lat: 6.5, lng: 3.3 })
    expect(filters).toMatchObject({ latitude: 6.5, longitude: 3.3, radius: 10 })
    expect(toApiFilters(DEFAULT_FILTER_VALUES, null)).not.toHaveProperty('radius')
  })

  it('never sends the local text search to the API', () => {
    expect(toApiFilters({ ...DEFAULT_FILTER_VALUES, search: 'mama' }, null)).not.toHaveProperty('search')
  })
})

describe('uniqueCuisines', () => {
  it('lists each cuisine once, alphabetically', () => {
    const list = [...SAMPLE_RESTAURANTS, makeRestaurant({ id: 'x', cuisine: 'Nigerian' })]
    expect(uniqueCuisines(list)).toEqual(['Nigerian', 'South-South Nigerian', 'Traditional Nigerian'])
  })
})
