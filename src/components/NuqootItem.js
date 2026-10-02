import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, getDirectionInfo } from '../utils/helpers';
import { COLORS } from '../utils/theme';

const NuqootItem = ({ item, direction, onDelete }) => {
  const dir = getDirectionInfo(direction);

  const openWhatsApp = () => {
    if (!item.phone) return Alert.alert('تنبيه', 'لا يوجد رقم هاتف مسجل لهذا الشخص');
    Linking.openURL(`whatsapp://send?phone=+2${item.phone}`);
  };

  const makeCall = () => {
    if (!item.phone) return Alert.alert('تنبيه', 'لا يوجد رقم هاتف مسجل لهذا الشخص');
    Linking.openURL(`tel:${item.phone}`);
  };

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
        <Text style={styles.sub}>{[item.relation, item.address].filter(Boolean).join(' • ')}</Text>
        
        {item.phone ? (
          <View style={styles.contactRow}>
            <Text style={styles.phoneText}>{item.phone}</Text>
            <TouchableOpacity onPress={openWhatsApp} style={styles.iconBtn}>
              <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
            </TouchableOpacity>
            <TouchableOpacity onPress={makeCall} style={styles.iconBtn}>
              <Ionicons name="call" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        ) : null}

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
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', 
    marginHorizontal: 16, marginVertical: 6, padding: 12, borderRadius: 14, elevation: 1
  },
  av: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avT: { fontSize: 18, fontWeight: 'bold' },
  info: { flex: 1, marginRight: 12, alignItems: 'flex-end' },
  name: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  notes: { fontSize: 11, color: COLORS.textHint, marginTop: 4 },
  amtBox: { alignItems: 'center', marginLeft: 10 },
  amount: { fontSize: 17, fontWeight: 'bold' },
  cur: { fontSize: 11, color: COLORS.textHint },
  del: { padding: 8, marginLeft: 2 },
  contactRow: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 4 },
  phoneText: { fontSize: 13, color: COLORS.textSecondary, marginLeft: 8 },
  iconBtn: { backgroundColor: '#f0f0f0', padding: 4, borderRadius: 8, marginLeft: 6 }
});

export default NuqootItem;
