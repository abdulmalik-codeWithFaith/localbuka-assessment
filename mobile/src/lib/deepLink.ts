const RESTAURANT_ID_PATTERN = /^[A-Za-z0-9_-]+$/

/**
 * Reads a restaurant id out of a link such as:
 *   localbuka://restaurant/buka_001                  (the app's own scheme)
 *   https://localbuka.app/restaurant/buka_001        (a web link)
 *   exp://192.168.1.5:8081/--/restaurant/buka_001    (Expo Go while developing)
 * Returns null for anything else.
 */
export function parseRestaurantLink(url: string | null | undefined): string | null {
  if (!url) return null

  const parts = url.split(/[/?#]/)
  const index = parts.indexOf('restaurant')
  if (index === -1) return null

  const id = parts[index + 1]
  return id !== undefined && RESTAURANT_ID_PATTERN.test(id) ? id : null
}
