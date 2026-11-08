import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { colors, spacing } from '../theme'

interface ButtonProps {
  label: string
  onPress: () => void
  /** 'primary' is the main action on a screen; 'secondary' is an alternative. */
  variant?: 'primary' | 'secondary'
  /** Shows a spinner and ignores taps (for example while a request runs). */
  busy?: boolean
}

export function Button({ label, onPress, variant = 'primary', busy = false }: ButtonProps) {
  const isPrimary = variant === 'primary'

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, busy }}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        busy && styles.busy,
      ]}
    >
      {busy && <ActivityIndicator color={isPrimary ? colors.white : colors.palm700} />}
      <Text style={[styles.label, isPrimary ? styles.primaryLabel : styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primary: { backgroundColor: colors.palm700 },
  secondary: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.palm700 },
  pressed: { opacity: 0.85 },
  busy: { opacity: 0.75 },
  label: { fontSize: 16, fontWeight: '700' },
  primaryLabel: { color: colors.white },
  secondaryLabel: { color: colors.palm800 },
})
