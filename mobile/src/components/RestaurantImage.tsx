import { useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { colors } from '../theme'

interface RestaurantImageProps {
  uri: string | undefined
  name: string
  height: number
}

/** The photo, or a plain placeholder when there is none or it cannot be loaded. */
export function RestaurantImage({ uri, name, height }: RestaurantImageProps) {
  // Remember which address failed, so a different photo gets a fresh attempt.
  const [failedUri, setFailedUri] = useState<string | null>(null)

  if (!uri || failedUri === uri) {
    return (
      <View
        style={[styles.placeholder, { height }]}
        accessible
        accessibilityLabel={`No photo available for ${name}`}
      >
        <Text style={styles.placeholderText}>No photo yet</Text>
      </View>
    )
  }

  return (
    <Image
      source={{ uri }}
      accessibilityLabel={name}
      onError={() => setFailedUri(uri)}
      style={{ height, width: '100%' }}
      resizeMode="cover"
    />
  )
}

const styles = StyleSheet.create({
  placeholder: { width: '100%', backgroundColor: colors.palm100, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: colors.palm700, fontWeight: '700' },
})
