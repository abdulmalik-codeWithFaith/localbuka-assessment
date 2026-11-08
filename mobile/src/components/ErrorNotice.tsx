import { StyleSheet, Text, View } from 'react-native'
import { colors, spacing } from '../theme'
import { Button } from './Button'

interface ErrorNoticeProps {
  message: string
  onRetry?: () => void
}

export function ErrorNotice({ message, onRetry }: ErrorNoticeProps) {
  return (
    <View style={styles.box} accessibilityRole="alert">
      <Text style={styles.message}>{message}</Text>
      {onRetry && <Button label="Try again" onPress={onRetry} variant="secondary" />}
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.pepper50,
    borderColor: colors.pepper500,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.lg,
    gap: spacing.md,
  },
  message: { color: colors.pepper600, fontSize: 15, fontWeight: '600', lineHeight: 21 },
})
