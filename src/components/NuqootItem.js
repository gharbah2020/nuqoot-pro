import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, getDirectionInfo } from '../utils/helpers';
import { COLORS } from '../utils/theme';

const NuqootItem = ({ item, direction, onDelete }) => {
  const dir = getDirectionInfo(direction);

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => {
        Alert.alert('حذف النقوط', `هل تريد حذف نقوط ${item.person_name}؟`, [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'حذف', style: 'destructive', onPress: () => onDelete(item.id) }
        ]);
      }} style={styles.del}>
        <Ionicons name="trash-outline" size={18} color={COLORS.error} />
      </TouchableOpacity>

      <View style={styles.amtBox}>
        <Text style={[styles.amount, { color: dir.color }]}>{formatCurrency(item.amount)}</Text>
        <Text style={styles.cur}>ج.م</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{item.person_name}</Text>
        <Text style={styles.sub}>{[item.relation, item.phone].filter(Boolean).join(' • ')}</Text>
        {item.notes ? <Text style={styles.notes}>📝 {item.notes}</Text> : null}
      </View>

      <View style={[styles.av, { backgroundColor: dir.color + '15' }]}>
        <Text style={[styles.avT, { color: dir.color }]}>{item.person_name.charAt(0)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 4,
    padding: 12, borderRadius: 14, elevation: 1
  },
  av: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avT: { fontSize: 17, fontWeight: 'bold' },
  info: { flex: 1, marginRight: 10, alignItems: 'flex-end' },
  name: { fontSize: 15, fontWeight: 'bold', color: COLORS.text },
  sub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  notes: { fontSize: 11, color: COLORS.textHint, marginTop: 2 },
  amtBox: { alignItems: 'center', marginLeft: 8 },
  amount: { fontSize: 16, fontWeight: 'bold' },
  cur: { fontSize: 10, color: COLORS.textHint },
  del: { padding: 6, marginLeft: 2 },
});

export default NuqootItem;