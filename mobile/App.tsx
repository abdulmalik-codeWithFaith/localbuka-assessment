import * as Linking from 'expo-linking'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useState } from 'react'
import { BackHandler, StyleSheet, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { AppHeader } from './src/components/AppHeader'
import { DEFAULT_USER, DEMO_USERS } from './src/config'
import { parseRestaurantLink } from './src/lib/deepLink'
import { RestaurantDetailScreen } from './src/screens/RestaurantDetailScreen'
import { RestaurantListScreen } from './src/screens/RestaurantListScreen'
import { colors } from './src/theme'
import type { DemoUser } from './src/types'

function Root() {
  const [user, setUser] = useState<DemoUser>(DEFAULT_USER)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)

  const goBack = useCallback(() => setRestaurantId(null), [])

  const selectUser = useCallback((userId: string) => {
    const next = DEMO_USERS.find((candidate) => candidate.id === userId)
    if (next) setUser(next)
  }, [])

  // Deep links: localbuka://restaurant/<id> opens that restaurant, whether the app was
  // closed (initial URL) or already running (url event).
  useEffect(() => {
    const open = (url: string | null) => {
      const id = parseRestaurantLink(url)
      if (id) setRestaurantId(id)
    }

    let cancelled = false
    void Linking.getInitialURL().then((url) => {
      if (!cancelled) open(url)
    })
    const subscription = Linking.addEventListener('url', ({ url }) => open(url))

    return () => {
      cancelled = true
      subscription.remove()
    }
  }, [])

  // On Android, the phone's Back button returns to the list instead of closing the app.
  useEffect(() => {
    if (restaurantId === null) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack()
      return true
    })
    return () => subscription.remove()
  }, [restaurantId, goBack])

  return (
    <View style={styles.root}>
      <AppHeader
        users={DEMO_USERS}
        currentUserId={user.id}
        onSelectUser={selectUser}
        onBack={restaurantId === null ? undefined : goBack}
      />
      {restaurantId === null ? (
        <RestaurantListScreen onSelect={setRestaurantId} />
      ) : (
        // Keyed by user and restaurant: switching either starts a fresh check-in.
        <RestaurantDetailScreen key={`${user.id}:${restaurantId}`} restaurantId={restaurantId} user={user} />
      )}
    </View>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <Root />
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.palm700 },
  root: { flex: 1, backgroundColor: colors.chalk },
})
