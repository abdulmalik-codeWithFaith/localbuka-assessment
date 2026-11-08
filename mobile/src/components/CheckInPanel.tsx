import { Linking, StyleSheet, Text, View } from 'react-native'
import type { CheckInState } from '../hooks/useCheckIn'
import { CHECK_IN_RADIUS_METERS, formatDistance } from '../lib/geo'
import { colors, spacing } from '../theme'
import { Button } from './Button'
import { SuccessBadge } from './SuccessBadge'

interface CheckInPanelProps {
  state: CheckInState
  onCheckIn: () => void
}

const BUSY_LABELS = {
  'requesting-permission': 'Asking for permission…',
  locating: 'Finding your location…',
  submitting: 'Checking you in…',
} as const

/** Everything the user sees about checking in, for each stage of the flow. */
export function CheckInPanel({ state, onCheckIn }: CheckInPanelProps) {
  switch (state.status) {
    case 'idle':
      return (
        <View style={styles.panel}>
          <Button label="Check in to earn points" onPress={onCheckIn} />
          <Text style={styles.hint}>
            Earn 50 points when you are within {CHECK_IN_RADIUS_METERS} m of the restaurant. Once per day.
          </Text>
        </View>
      )

    case 'requesting-permission':
    case 'locating':
    case 'submitting':
      return (
        <View style={styles.panel} accessibilityLiveRegion="polite">
          <Button label={BUSY_LABELS[state.status]} onPress={onCheckIn} busy />
        </View>
      )

    case 'success':
      return (
        <View style={[styles.panel, styles.centered]} accessibilityLiveRegion="polite">
          <SuccessBadge />
          <Text style={styles.successTitle}>You are checked in!</Text>
          <Text style={styles.successPoints}>+{state.pointsAdded} points</Text>
          <Text style={styles.hint}>Your balance is now {state.newBalance} points.</Text>
        </View>
      )

    case 'too-far':
      return (
        <Problem
          title="You must be at the restaurant to check in."
          detail={`You are ${formatDistance(state.distanceMeters)} away. Check-in works within ${CHECK_IN_RADIUS_METERS} m.`}
        >
          <Button label="Try again" onPress={onCheckIn} variant="secondary" />
        </Problem>
      )

    case 'permission-denied':
      return (
        <Problem
          title="Location permission is needed to check in."
          detail="LocalBuka only uses your location to confirm you are at the restaurant. It is not stored."
        >
          {state.canAskAgain ? (
            <Button label="Allow location" onPress={onCheckIn} />
          ) : (
            <>
              <Text style={styles.detail}>
                Location is blocked for LocalBuka. Open Settings, allow location, then come back and try again.
              </Text>
              <Button label="Open Settings" onPress={() => void Linking.openSettings()} />
              <Button label="Try again" onPress={onCheckIn} variant="secondary" />
            </>
          )}
        </Problem>
      )

    case 'location-unavailable':
      return (
        <Problem title="We could not find you." detail={state.message}>
          <Button label="Try again" onPress={onCheckIn} variant="secondary" />
        </Problem>
      )

    case 'error':
      return (
        <Problem title="Check-in did not go through." detail={state.message}>
          <Button label="Try again" onPress={onCheckIn} variant="secondary" />
        </Problem>
      )
  }
}

function Problem({
  title,
  detail,
  children,
}: {
  title: string
  detail: string
  children: React.ReactNode
}) {
  return (
    <View style={[styles.panel, styles.problem]} accessibilityRole="alert">
      <Text style={styles.problemTitle}>{title}</Text>
      <Text style={styles.detail}>{detail}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: { gap: spacing.md },
  centered: { alignItems: 'center', paddingVertical: spacing.lg },
  hint: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  successTitle: { color: colors.palm800, fontSize: 22, fontWeight: '800', marginTop: spacing.sm },
  successPoints: { color: colors.palm700, fontSize: 30, fontWeight: '800' },
  problem: {
    backgroundColor: colors.pepper50,
    borderColor: colors.pepper500,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.lg,
  },
  problemTitle: { color: colors.pepper600, fontSize: 17, fontWeight: '800', lineHeight: 23 },
  detail: { color: colors.ink, fontSize: 15, lineHeight: 21 },
})
