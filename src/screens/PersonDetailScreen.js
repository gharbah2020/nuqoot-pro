import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, SafeAreaView, StatusBar, Linking, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import LocalDB from '../database/LocalDB';

export default function PersonDetailScreen({ route, navigation }) {
  const { personName } = route.params;
  const [records, setRecords] = useState([]);
  const [currency, setCurrency] = useState('ج.م');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalGiven: 0, totalReceived: 0, balance: 0 });

  const loadPersonRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await LocalDB.getRecordsByPerson(personName);
      const curr = await LocalDB.getSetting('currency', 'ج.م');
      
      let given = 0, received = 0;
      data.forEach(r => {
        if (r.type === 'given') given += r.amount;
        else received += r.amount;
      });

      setRecords(data);
      setCurrency(curr);
      setStats({ totalGiven: given, totalReceived: received, balance: received - given });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [personName]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadPersonRecords();
    });
    return unsubscribe;
  }, [navigation, loadPersonRecords]);

  const renderRecordCard = ({ item }) => (
    <View style={styles.recordCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.eventName}><MaterialCommunityIcons name="party-popper" size={16} color="#555"/> {item.event_name}</Text>
        <Text style={[styles.amountText, { color: item.type === 'given' ? '#C62828' : '#2E7D32' }]}>
          {item.type === 'given' ? '- ' : '+ '}{Number(item.amount).toLocaleString('ar-EG')} {currency}
        </Text>
      </View>
      <View style={styles.typeBadgeRow}>
        <View style={[styles.typeBadge, { backgroundColor: item.type === 'given' ? '#FFEBEE' : '#E8F5E9' }]}>
          <Text style={[styles.typeBadgeText, { color: item.type === 'given' ? '#C62828' : '#2E7D32' }]}>
            {item.type === 'given' ? 'له (نقوط مقتطع)' : 'عليه (نقوط واصل)'}
          </Text>
        </View>
        <Text style={styles.recordDate}>{item.date}</Text>
      </View>
      {item.notes ? <Text style={styles.recordNotes}>ملاحظات: {item.notes}</Text> : null}
      
      <TouchableOpacity 
        style={styles.editBtn} 
        onPress={() => navigation.navigate('EventDetailScreen', { eventId: item.event_id, eventName: item.event_name })}
      >
        <Text style={styles.editBtnText}>الذهاب للمناسبة للتعديل</Text>
        <Ionicons name="arrow-forward" size={14} color="#0288D1" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{top:10, bottom:10, left:10, right:10}}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>كشف حساب: {personName}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>له (مقتطع)</Text>
          <Text style={[styles.statValue, { color: '#C62828' }]}>{stats.totalGiven.toLocaleString('ar-EG')} {currency}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>عليه (واصل)</Text>
          <Text style={[styles.statValue, { color: '#2E7D32' }]}>{stats.totalReceived.toLocaleString('ar-EG')} {currency}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>الرصيد الصافي</Text>
          <Text style={[styles.statValue, { color: stats.balance >= 0 ? '#1B5E20' : '#C62828' }]}>{stats.balance.toLocaleString('ar-EG')} {currency}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1B5E20" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRecordCard}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  header: { backgroundColor: '#1B5E20', paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 8 : 14, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  backBtn: { padding: 4 },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: 'bold', flex: 1, textAlign: 'center', marginRight: 24 },
  
  statsContainer: { flexDirection: 'row', backgroundColor: '#FFF', margin: 12, borderRadius: 12, paddingVertical: 15, elevation: 3 },
  statBox: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#666', marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: 'bold' },
  statDivider: { width: 1, backgroundColor: '#EEE' },

  listContainer: { paddingHorizontal: 12, paddingBottom: 20 },
  recordCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventName: { fontSize: 15, fontWeight: 'bold', color: '#222' },
  amountText: { fontSize: 16, fontWeight: 'bold' },
  typeBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: 'bold' },
  recordDate: { fontSize: 12, color: '#888' },
  recordNotes: { fontSize: 12, color: '#777', marginTop: 6, fontStyle: 'italic' },
  editBtn: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 10, gap: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEE' },
  editBtnText: { fontSize: 12, color: '#0288D1', fontWeight: 'bold' }
});
