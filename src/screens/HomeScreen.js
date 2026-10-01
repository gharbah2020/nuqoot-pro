import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, RefreshControl, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAllEvents, getGeneralStats } from '../database/LocalDB';
import EventCard from '../components/EventCard';
import SummaryCard from '../components/SummaryCard';
import { COLORS } from '../utils/theme';
import { formatDateShort } from '../utils/helpers';

const HomeScreen = ({ navigation }) => {
  const [events, setEvents] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [stats, setStats] = useState({ totalIncoming: 0, totalOutgoing: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    const all = await getAllEvents();
    const today = new Date().toISOString().slice(0, 10);
    
    // فصل المناسبات القادمة عن المناسبات السابقة
    const upc = all.filter(e => e.date > today).reverse();
    const past = all.filter(e => e.date <= today);
    
    setUpcoming(upc);
    setEvents(past);
    setStats(await getGeneralStats());
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const filtered = events.filter(e => filter === 'all' || e.direction === filter);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}><Ionicons name="settings-outline" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>📒 دفتر النقوط</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <EventCard event={item} onPress={() => navigation.navigate('EventDetail', { eventId: item.id })} />}
        ListHeaderComponent={
          <View>
            <SummaryCard totalIncoming={stats.totalIncoming} totalOutgoing={stats.totalOutgoing} />
            
            {/* قسم المناسبات القادمة */}
            {upcoming.length > 0 && (
              <View style={styles.upcomingSection}>
                <Text style={styles.secTitle}>⏰ مناسبات قادمة قريباً</Text>
                <ScrollView horizontal inverted showsHorizontalScrollIndicator={false}>
                  {upcoming.map(u => (
                    <TouchableOpacity key={u.id} style={styles.upcomingCard} onPress={() => navigation.navigate('EventDetail', { eventId: u.id })}>
                      <Text style={styles.upName}>{u.name}</Text>
                      <Text style={styles.upDate}>📅 {formatDateShort(u.date)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.filters}>
              {[{ k: 'all', l: 'السجل الكامل' }, { k: 'incoming', l: '📥 واردة (ليّا)' }, { k: 'outgoing', l: '📤 صادرة (عليّا)' }].map(f => (
                <TouchableOpacity key={f.k} style={[styles.fBtn, filter === f.k && styles.fActive]} onPress={() => setFilter(f.k)}>
                  <Text style={[styles.fText, filter === f.k && styles.fTextA]}>{f.l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddEvent')}>
        <Ionicons name="add" size={34} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingTop: 45, paddingBottom: 15, paddingHorizontal: 20, elevation: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  upcomingSection: { marginBottom: 15 },
  upcomingCard: { backgroundColor: '#FFEBEE', padding: 15, borderRadius: 12, marginLeft: 15, width: 160, borderWidth: 1, borderColor: '#ffcdd2', elevation: 2 },
  upName: { fontSize: 14, fontWeight: 'bold', color: COLORS.outgoing, textAlign: 'right' },
  upDate: { fontSize: 12, color: '#d32f2f', textAlign: 'right', marginTop: 5 },
  filters: { flexDirection: 'row-reverse', justifyContent: 'center', paddingHorizontal: 16, marginBottom: 8 },
  fBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginHorizontal: 4, elevation: 1 },
  fActive: { backgroundColor: COLORS.primary },
  fText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  fTextA: { color: '#fff' },
  secTitle: { fontSize: 15, fontWeight: 'bold', textAlign: 'right', paddingHorizontal: 20, paddingVertical: 8, color: COLORS.text },
  fab: { position: 'absolute', bottom: 20, left: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 6 },
});

export default HomeScreen;
