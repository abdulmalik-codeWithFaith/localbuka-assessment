import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, spacing } from '../theme'
import type { DemoUser } from '../types'

interface AppHeaderProps {
  users: readonly DemoUser[]
  currentUserId: string
  onSelectUser: (userId: string) => void
  /** When given, a Back button is shown. */
  onBack?: () => void
}

export function AppHeader({ users, currentUserId, onSelectUser, onBack }: AppHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        {onBack && (
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to restaurants" hitSlop={12}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
        )}
        <Text style={styles.title} accessibilityRole="header">
          LocalBuka
        </Text>
      </View>

      <View style={styles.usersRow} accessibilityRole="radiogroup">
        <Text style={styles.usersLabel}>Signed in as</Text>
        {users.map((user) => {
          const selected = user.id === currentUserId
          return (
            <Pressable
              key={user.id}
              onPress={() => onSelectUser(user.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{user.name}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.palm700,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: 6,
    borderBottomColor: colors.danfo400,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  back: { color: colors.palm100, fontSize: 17, fontWeight: '700' },
  title: { color: colors.white, fontSize: 24, fontWeight: '800' },
  usersRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  usersLabel: { color: colors.palm100, fontSize: 13, marginRight: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.palm100,
  },
  chipSelected: { backgroundColor: colors.danfo400, borderColor: colors.danfo400 },
  chipText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  chipTextSelected: { color: colors.ink },
})
