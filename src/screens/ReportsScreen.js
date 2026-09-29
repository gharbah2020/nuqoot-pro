import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getGeneralStats, getTopPeople } from '../database/LocalDB';
import { formatCurrency } from '../utils/helpers';
import { COLORS } from '../utils/theme';

const ReportsScreen = () => {
  const [stats, setStats] = useState(null);
  const [topIn, setTopIn] = useState([]);
  const [topOut, setTopOut] = useState([]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setStats(await getGeneralStats());
        setTopIn(await getTopPeople('incoming', 5));
        setTopOut(await getTopPeople('outgoing', 5));
      };
      load();
    }, [])
  );

  if (!stats) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 التقارير والإحصائيات</Text>
      </View>

      <ScrollView style={{ padding: 16 }}>
        <Text style={styles.secT}>📌 ملخص الحسابات العام</Text>
        <View style={styles.grid}>
          <View style={[styles.card, { backgroundColor: COLORS.incomingLight }]}>
            <Text style={styles.cardL}>إجمالي ما لك (وارد)</Text>
            <Text style={[styles.cardV, { color: COLORS.incoming }]}>{formatCurrency(stats.totalIncoming)} ج.م</Text>
          </View>
          <View style={[styles.card, { backgroundColor: COLORS.outgoingLight }]}>
            <Text style={styles.cardL}>إجمالي ما عليك (صادر)</Text>
            <Text style={[styles.cardV, { color: COLORS.outgoing }]}>{formatCurrency(stats.totalOutgoing)} ج.م</Text>
          </View>
        </View>

        <Text style={styles.secT}>🏆 أكثر من قاموا بالنقوط معك (وارد)</Text>
        {topIn.map((p, i) => (
          <View key={i} style={styles.row}>
            <Text style={[styles.rowAmt, { color: COLORS.incoming }]}>{formatCurrency(p.total_amount)} ج.م</Text>
            <Text style={styles.rowName}>{i + 1}. {p.person_name} ({p.times} مناسبات)</Text>
          </View>
        ))}

        <Text style={styles.secT}>📤 أكثر من قمت بالنقوط لهم (صادر)</Text>
        {topOut.map((p, i) => (
          <View key={i} style={styles.row}>
            <Text style={[styles.rowAmt, { color: COLORS.outgoing }]}>{formatCurrency(p.total_amount)} ج.م</Text>
            <Text style={styles.rowName}>{i + 1}. {p.person_name} ({p.times} مناسبات)</Text>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, paddingVertical: 16, paddingTop: 45, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  secT: { fontSize: 14, fontWeight: 'bold', color: COLORS.text, marginVertical: 10, textAlign: 'right' },
  grid: { flexDirection: 'row-reverse', marginBottom: 10 },
  card: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', marginHorizontal: 4 },
  cardL: { fontSize: 11, color: COLORS.textSecondary },
  cardV: { fontSize: 16, fontWeight: 'bold', marginTop: 4 },
  row: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginVertical: 3, alignItems: 'center', elevation: 1 },
  rowName: { flex: 1, textAlign: 'right', fontSize: 13, fontWeight: '600', color: COLORS.text },
  rowAmt: { fontSize: 13, fontWeight: 'bold' },
});

export default ReportsScreen;