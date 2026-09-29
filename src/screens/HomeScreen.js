import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAllEvents, getGeneralStats } from '../database/LocalDB';
import EventCard from '../components/EventCard';
import SummaryCard from '../components/SummaryCard';
import { COLORS } from '../utils/theme';

const HomeScreen = ({ navigation }) => {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({ totalIncoming: 0, totalOutgoing: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setEvents(await getAllEvents());
    setStats(await getGeneralStats());
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => { 
    setRefreshing(true); 
    await load(); 
    setRefreshing(false); 
  };

  const filtered = events.filter(e => filter === 'all' || e.direction === filter);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📒 دفتر النقوط</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <EventCard event={item} onPress={() => navigation.navigate('EventDetail', { eventId: item.id })} />
        )}
        ListHeaderComponent={
          <View>
            <SummaryCard totalIncoming={stats.totalIncoming} totalOutgoing={stats.totalOutgoing} />
            
            <View style={styles.filters}>
              {[
                { k: 'all', l: 'الكل' }, 
                { k: 'incoming', l: '📥 نقوط ليّا' }, 
                { k: 'outgoing', l: '📤 نقوط عليّا' }
              ].map(f => (
                <TouchableOpacity 
                  key={f.k} 
                  style={[styles.fBtn, filter === f.k && styles.fActive]} 
                  onPress={() => setFilter(f.k)}
                >
                  <Text style={[styles.fText, filter === f.k && styles.fTextA]}>{f.l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.secTitle}>المناسبات ({filtered.length})</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 60 }}>📋</Text>
            <Text style={styles.emptyT}>لا توجد مناسبات مسجلة</Text>
            <Text style={styles.emptyS}>اضغط على زر (+) في الأسفل لإضافة مناسبة جديدة</Text>
          </View>
        }
        contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddEvent')} activeOpacity={0.8}>
        <Ionicons name="add" size={34} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    backgroundColor: COLORS.primary, flexDirection: 'row-reverse', 
    justifyContent: 'space-between', alignItems: 'center', 
    paddingTop: 45, paddingBottom: 15, paddingHorizontal: 20, elevation: 4 
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  filters: { flexDirection: 'row-reverse', justifyContent: 'center', paddingHorizontal: 16, marginBottom: 8 },
  fBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginHorizontal: 4, elevation: 1 },
  fActive: { backgroundColor: COLORS.primary },
  fText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  fTextA: { color: '#fff' },
  secTitle: { fontSize: 15, fontWeight: 'bold', textAlign: 'right', paddingHorizontal: 20, paddingVertical: 8, color: COLORS.text },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyT: { fontSize: 17, fontWeight: 'bold', color: COLORS.textSecondary, marginTop: 12 },
  emptyS: { fontSize: 13, color: COLORS.textHint, marginTop: 4 },
  fab: { 
    position: 'absolute', bottom: 20, left: 20, width: 60, height: 60, 
    borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 6 
  },
});

export default HomeScreen;