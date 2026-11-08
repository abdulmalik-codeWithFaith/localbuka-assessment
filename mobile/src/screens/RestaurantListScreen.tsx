import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { fetchRestaurants } from '../api/restaurants'
import { ErrorNotice } from '../components/ErrorNotice'
import { PriceLevel, StarRating } from '../components/RatingAndPrice'
import { useAsyncData } from '../hooks/useAsyncData'
import { colors, spacing } from '../theme'
import type { Restaurant } from '../types'

interface RestaurantListScreenProps {
  onSelect: (restaurantId: string) => void
}

export function RestaurantListScreen({ onSelect }: RestaurantListScreenProps) {
  const { data, error, isLoading, reload } = useAsyncData(fetchRestaurants)

  if (data === null && isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.palm700} />
        <Text style={styles.muted}>Loading restaurants…</Text>
      </View>
    )
  }

  if (data === null) {
    return (
      <View style={styles.padded}>
        <ErrorNotice message={error ?? 'Could not load restaurants.'} onRetry={reload} />
      </View>
    )
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(restaurant) => restaurant.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={reload} tintColor={colors.palm700} />}
      ListHeaderComponent={
        <Text style={styles.heading}>Pick a restaurant to check in</Text>
      }
      ListEmptyComponent={<Text style={styles.muted}>There are no restaurants to show yet.</Text>}
      renderItem={({ item }) => <RestaurantRow restaurant={item} onPress={() => onSelect(item.id)} />}
    />
  )
}

function RestaurantRow({ restaurant, onPress }: { restaurant: Restaurant; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${restaurant.name}, ${restaurant.cuisine}. Open details`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowTop}>
        <Text style={styles.name}>{restaurant.name}</Text>
        <Text style={[styles.status, restaurant.isOpen ? styles.open : styles.closed]}>
          {restaurant.isOpen ? 'Open now' : 'Closed'}
        </Text>
      </View>
      <Text style={styles.muted}>{restaurant.cuisine}</Text>
      <View style={styles.rowBottom}>
        <StarRating rating={restaurant.avgRating} />
        <PriceLevel level={restaurant.priceRange} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  padded: { padding: spacing.lg },
  list: { padding: spacing.lg, gap: spacing.md },
  heading: { fontSize: 20, fontWeight: '800', color: colors.palm800, marginBottom: spacing.sm },
  muted: { color: colors.muted, fontSize: 14 },
  row: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  rowPressed: { borderColor: colors.palm600, backgroundColor: colors.palm50 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.ink },
  status: { fontSize: 12, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  open: { backgroundColor: colors.palm50, color: colors.palm800 },
  closed: { backgroundColor: colors.ink, color: colors.white },
})
