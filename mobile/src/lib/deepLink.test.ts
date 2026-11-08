import { describe, expect, it } from 'vitest'
import { parseRestaurantLink } from './deepLink'

describe('parseRestaurantLink', () => {
  it.each([
    ['localbuka://restaurant/buka_001', 'buka_001'],
    ['localbuka://restaurant/buka_001?ref=share', 'buka_001'],
    ['localbuka://restaurant/buka-002#top', 'buka-002'],
    ['https://localbuka.app/restaurant/buka_003', 'buka_003'],
    ['exp://192.168.1.5:8081/--/restaurant/buka_004', 'buka_004'],
  ])('reads the restaurant id from %s', (url, expected) => {
    expect(parseRestaurantLink(url)).toBe(expected)
  })

  it.each([
    [null],
    [undefined],
    [''],
    ['localbuka://'],
    ['localbuka://rewards'],
    ['localbuka://restaurant'],
    ['localbuka://restaurant/'],
    ['localbuka://restaurant/bad id'],
    ['localbuka://restaurant/<script>'],
    ['https://example.com/other/path'],
  ])('ignores %s', (url) => {
    expect(parseRestaurantLink(url)).toBeNull()
  })
})
