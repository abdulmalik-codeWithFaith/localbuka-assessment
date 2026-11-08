import { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { fetchPointsBalance } from '../api/points'
import { fetchRestaurant } from '../api/restaurants'
import { CheckInPanel } from '../components/CheckInPanel'
import { ErrorNotice } from '../components/ErrorNotice'
import { PriceLevel, StarRating } from '../components/RatingAndPrice'
import { RestaurantImage } from '../components/RestaurantImage'
import { useAsyncData } from '../hooks/useAsyncData'
import { useCheckIn } from '../hooks/useCheckIn'
import { colors, spacing } from '../theme'
import type { DemoUser, Restaurant } from '../types'

interface RestaurantDetailScreenProps {
  restaurantId: string
  user: DemoUser
}

export function RestaurantDetailScreen({ restaurantId, user }: RestaurantDetailScreenProps) {
  const loadRestaurant = useCallback((signal: AbortSignal) => fetchRestaurant(restaurantId, signal), [restaurantId])
  const restaurant = useAsyncData(loadRestaurant)

  if (restaurant.data === null && restaurant.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.palm700} />
        <Text style={styles.muted}>Loading restaurant…</Text>
      </View>
    )
  }

  if (restaurant.data === null) {
    return (
      <View style={styles.padded}>
        <ErrorNotice message={restaurant.error ?? 'Could not load this restaurant.'} onRetry={restaurant.reload} />
      </View>
    )
  }

  return <RestaurantDetails restaurant={restaurant.data} user={user} />
}

function RestaurantDetails({ restaurant, user }: { restaurant: Restaurant; user: DemoUser }) {
  const [pretendAtRestaurant, setPretendAtRestaurant] = useState(false)
  const locationOverride = pretendAtRestaurant ? restaurant.location : null

  const { state: checkIn, start: startCheckIn } = useCheckIn({
    userId: user.id,
    restaurant,
    locationOverride,
  })

  const loadBalance = useCallback((signal: AbortSignal) => fetchPointsBalance(user.id, signal), [user.id])
  const balance = useAsyncData(loadBalance)

  // After a successful check-in, the API's new balance replaces the loaded one straight away.
  const displayedBalance = useMemo(() => {
    if (checkIn.status === 'success') return checkIn.newBalance
    return balance.data?.balance ?? null
  }, [checkIn, balance.data])

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.photo}>
        <RestaurantImage uri={restaurant.images[0]} name={restaurant.name} height={220} />
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} accessibilityRole="header">
            {restaurant.name}
          </Text>
          <Text style={[styles.status, restaurant.isOpen ? styles.open : styles.closed]}>
            {restaurant.isOpen ? 'Open now' : 'Closed'}
          </Text>
        </View>

        <Text style={styles.cuisine}>{restaurant.cuisine}</Text>
        <View style={styles.metaRow}>
          <StarRating rating={restaurant.avgRating} />
          <PriceLevel level={restaurant.priceRange} />
        </View>
        <Text style={styles.address}>{restaurant.address}</Text>

        {restaurant.tags.length > 0 && (
          <View style={styles.tags}>
            {restaurant.tags.map((tag) => (
              <Text key={tag} style={styles.tag}>
                {tag}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.balanceCard} accessible accessibilityLabel={`Your points: ${displayedBalance ?? 'loading'}`}>
          <Text style={styles.balanceLabel}>Your points</Text>
          <Text style={styles.balanceValue}>{displayedBalance ?? '…'}</Text>
          {balance.error && displayedBalance === null && (
            <Text style={styles.balanceError}>Could not load your balance.</Text>
          )}
        </View>

        <CheckInPanel state={checkIn} onCheckIn={() => void startCheckIn()} />

        {__DEV__ && (
          <View style={styles.devBox}>
            <View style={styles.devRow}>
              <Text style={styles.devTitle}>Pretend I am at this restaurant</Text>
              <Switch
                value={pretendAtRestaurant}
                onValueChange={setPretendAtRestaurant}
                trackColor={{ true: colors.palm600, false: colors.line }}
                accessibilityLabel="Pretend I am at this restaurant (testing only)"
              />
            </View>
            <Text style={styles.devText}>
              Testing only, and only in development builds. It skips your real GPS position so you can try a
              successful check-in from anywhere. The distance rule still applies.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  padded: { padding: spacing.lg },
  content: { paddingBottom: spacing.xxl },
  photo: { backgroundColor: colors.palm100 },
  body: { padding: spacing.lg, gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  title: { flex: 1, fontSize: 28, fontWeight: '800', color: colors.palm800 },
  status: { fontSize: 12, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  open: { backgroundColor: colors.palm50, color: colors.palm800 },
  closed: { backgroundColor: colors.ink, color: colors.white },
  cuisine: { fontSize: 16, color: colors.muted },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  address: { fontSize: 15, color: colors.muted },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    backgroundColor: colors.palm50,
    color: colors.palm800,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  balanceCard: {
    backgroundColor: colors.palm700,
    borderRadius: 16,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  balanceLabel: { color: colors.palm100, fontSize: 15, fontWeight: '700' },
  balanceValue: { color: colors.white, fontSize: 38, fontWeight: '800' },
  balanceError: { color: colors.danfo400, fontSize: 13 },
  muted: { color: colors.muted, fontSize: 14 },
  devBox: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.muted,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.sm,
  },
  devRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  devTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
  devText: { fontSize: 13, color: colors.muted, lineHeight: 18 },
})
