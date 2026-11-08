import { StyleSheet, Text, View } from 'react-native'
import { colors, spacing } from '../theme'

const MAX_STARS = 5
const MAX_PRICE_LEVEL = 4

export function StarRating({ rating }: { rating: number }) {
  const filled = Math.round(rating)

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`Rated ${rating.toFixed(1)} out of ${MAX_STARS}`}
    >
      <Text style={styles.stars}>
        {'★'.repeat(filled)}
        <Text style={styles.emptyStars}>{'★'.repeat(Math.max(MAX_STARS - filled, 0))}</Text>
      </Text>
      <Text style={styles.number}>{rating.toFixed(1)}</Text>
    </View>
  )
}

export function PriceLevel({ level }: { level: number }) {
  return (
    <Text accessible accessibilityLabel={`Price level ${level} of ${MAX_PRICE_LEVEL}`} style={styles.price}>
      {'₦'.repeat(level)}
      <Text style={styles.emptyPrice}>{'₦'.repeat(Math.max(MAX_PRICE_LEVEL - level, 0))}</Text>
    </Text>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stars: { color: colors.danfo500, fontSize: 18, letterSpacing: 1 },
  emptyStars: { color: colors.line },
  number: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  price: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  emptyPrice: { color: colors.line },
})
