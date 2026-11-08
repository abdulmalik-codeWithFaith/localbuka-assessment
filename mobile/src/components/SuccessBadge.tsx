import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text } from 'react-native'
import { colors } from '../theme'

/** A green tick that pops in when a check-in succeeds. */
export function SuccessBadge() {
  const scale = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start()
  }, [scale, opacity])

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.badge, { opacity, transform: [{ scale }] }]}
    >
      <Text style={styles.tick}>✓</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  badge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.palm700,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: colors.danfo400,
  },
  tick: { color: colors.white, fontSize: 44, fontWeight: '800', marginTop: -2 },
})
