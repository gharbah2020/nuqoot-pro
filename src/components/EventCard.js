import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getEventType, formatDateShort, formatCurrency, getDirectionInfo } from '../utils/helpers';
import { COLORS } from '../utils/theme';

const EventCard = ({ event, onPress }) => {
  const type = getEventType(event.type);
  const dir = getDirectionInfo(event.direction);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconBox, { backgroundColor: type.color + '18' }]}>
        <Text style={{ fontSize: 24 }}>{type.icon}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{event.name}</Text>
        <Text style={styles.meta}>{type.label} • {formatDateShort(event.date)}</Text>
        <View style={[styles.badge, { backgroundColor: dir.bg }]}>
          <Text style={[styles.badgeText, { color: dir.color }]}>{dir.label}</Text>
        </View>
      </View>
      <View style={styles.amounts}>
        <Text style={[styles.total, { color: dir.color }]}>{formatCurrency(event.total_amount)}</Text>
        <Text style={styles.currency}>جنيه</Text>
        <Text style={styles.count}>{event.nuqoot_count} شخص</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', backgroundColor: '#fff',
    marginHorizontal: 16, marginVertical: 6, padding: 14,
    borderRadius: 16, elevation: 2, alignItems: 'center'
  },
  iconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginHorizontal: 12, alignItems: 'flex-end' },
  name: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, textAlign: 'right' },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3, textAlign: 'right' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 5 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  amounts: { alignItems: 'center', minWidth: 70 },
  total: { fontSize: 16, fontWeight: 'bold' },
  currency: { fontSize: 10, color: COLORS.textHint },
  count: { fontSize: 11, color: COLORS.textSecondary, marginTop: 3 },
});

export default EventCard;