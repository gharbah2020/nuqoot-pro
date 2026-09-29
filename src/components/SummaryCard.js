import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency } from '../utils/helpers';
import { COLORS } from '../utils/theme';

const SummaryCard = ({ totalIncoming, totalOutgoing }) => {
  const bal = totalIncoming - totalOutgoing;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.box, { backgroundColor: COLORS.outgoingLight }]}>
          <Text style={styles.label}>📤 عليّا (صادرة)</Text>
          <Text style={[styles.val, { color: COLORS.outgoing }]}>{formatCurrency(totalOutgoing)}</Text>
        </View>
        <View style={[styles.box, { backgroundColor: COLORS.incomingLight }]}>
          <Text style={styles.label}>📥 ليّا (واردة)</Text>
          <Text style={[styles.val, { color: COLORS.incoming }]}>{formatCurrency(totalIncoming)}</Text>
        </View>
      </View>
      <View style={[styles.bal, { backgroundColor: bal >= 0 ? COLORS.incomingLight : COLORS.outgoingLight }]}>
        <Text style={styles.balL}>⚖️ صافي الرصيد العام</Text>
        <Text style={[styles.balV, { color: bal >= 0 ? COLORS.incoming : COLORS.outgoing }]}>
          {bal >= 0 ? '+' : ''}{formatCurrency(bal)} ج.م
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { margin: 16, padding: 16, backgroundColor: '#fff', borderRadius: 20, elevation: 3 },
  row: { flexDirection: 'row-reverse', marginBottom: 12 },
  box: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', marginHorizontal: 4 },
  label: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  val: { fontSize: 19, fontWeight: 'bold', marginTop: 4 },
  bal: { padding: 12, borderRadius: 14, alignItems: 'center' },
  balL: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  balV: { fontSize: 22, fontWeight: 'bold', marginTop: 4 },
});

export default SummaryCard;