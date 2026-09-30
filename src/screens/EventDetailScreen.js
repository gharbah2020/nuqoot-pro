import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getEventById, getNuqootByEvent, softDeleteNuqoot, softDeleteEvent } from '../database/LocalDB';
import { getEventType, formatDate, formatCurrency, getDirectionInfo } from '../utils/helpers';
import NuqootItem from '../components/NuqootItem';
import { COLORS } from '../utils/theme';

const EventDetailScreen = ({ route, navigation }) => {
  const { eventId } = route.params;
  const [event, setEvent] = useState(null);
  const [list, setList] = useState([]);

  const load = async () => {
    setEvent(await getEventById(eventId));
    setList(await getNuqootByEvent(eventId));
  };

  useFocusEffect(useCallback(() => { load(); }, [eventId]));

  if (!event) return null;

  const type = getEventType(event.type);
  const dir = getDirectionInfo(event.direction);

  const handleAction = (item) => {
    Alert.alert('خيارات', `ماذا تريد أن تفعل ببيانات ${item.person_name}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تعديل البيانات', onPress: () => Alert.alert('قريباً', 'سيتم فتح شاشة التعديل في التحديث القادم') },
      { text: 'حذف', style: 'destructive', onPress: async () => { await softDeleteNuqoot(item.id); load(); } }
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: type.color }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-forward" size={26} color="#fff" /></TouchableOpacity>
        <Text style={styles.hT}>{event.name}</Text>
        <TouchableOpacity onPress={() => {
          Alert.alert('حذف', 'هل أنت متأكد من حذف المناسبة بالكامل؟', [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'حذف نهائي', style: 'destructive', onPress: async () => { await softDeleteEvent(eventId); navigation.goBack(); } }
          ]);
        }}><Ionicons name="trash" size={24} color="#fff" /></TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleAction(item)}>
            <NuqootItem item={item} direction={event.direction} onDelete={async (id) => { await softDeleteNuqoot(id); load(); }} />
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          <View>
            <View style={styles.infoCard}>
              <Text style={{ fontSize: 40 }}>{type.icon}</Text>
              <Text style={styles.evName}>{event.name}</Text>
              <Text style={styles.evMeta}>📅 {formatDate(event.date)} {event.location ? ` | 📍 ${event.location}` : ''}</Text>
              <View style={[styles.badge, { backgroundColor: dir.bg }]}><Text style={[styles.badgeT, { color: dir.color }]}>{dir.label}</Text></View>
            </View>
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: '#fff' }]}><Text style={styles.statV}>{list.length}</Text><Text style={styles.statL}>عدد الأشخاص</Text></View>
              <View style={[styles.statBox, { backgroundColor: dir.bg }]}><Text style={[styles.statV, { color: dir.color }]}>{formatCurrency(event.total_amount)}</Text><Text style={styles.statL}>الإجمالي (ج.م)</Text></View>
            </View>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />
      <TouchableOpacity style={[styles.fab, { backgroundColor: type.color }]} onPress={() => navigation.navigate('AddNuqoot', { eventId: event.id, direction: event.direction })}>
        <Ionicons name="person-add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingTop: 45, paddingBottom: 15, paddingHorizontal: 20, elevation: 4 },
  hT: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  infoCard: { backgroundColor: '#fff', margin: 16, padding: 20, borderRadius: 20, alignItems: 'center', elevation: 5 },
  evName: { fontSize: 22, fontWeight: 'bold', marginTop: 10, color: '#333' },
  evMeta: { fontSize: 13, color: '#666', marginTop: 6 },
  badge: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, marginTop: 10 },
  badgeT: { fontSize: 13, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row-reverse', marginHorizontal: 16, marginBottom: 10 },
  statBox: { flex: 1, padding: 15, borderRadius: 16, alignItems: 'center', marginHorizontal: 5, elevation: 2 },
  statV: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statL: { fontSize: 11, color: '#888', marginTop: 4 },
  fab: { position: 'absolute', bottom: 20, left: 20, width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 8 },
});

export default EventDetailScreen;