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

  if (!event) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>جاري التحميل...</Text>
      </View>
    );
  }

  const type = getEventType(event.type);
  const dir = getDirectionInfo(event.direction);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: type.color }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.hT} numberOfLines={1}>{event.name}</Text>
        <TouchableOpacity onPress={() => {
          Alert.alert('حذف المناسبة', 'هل أنت متأكد من حذف هذه المناسبة وجميع سجلاتها؟', [
            { text: 'إلغاء', style: 'cancel' },
            { 
              text: 'حذف نهائي', 
              style: 'destructive', 
              onPress: async () => { 
                await softDeleteEvent(eventId); 
                navigation.goBack(); 
              } 
            }
          ]);
        }}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <NuqootItem 
            item={item} 
            direction={event.direction} 
            onDelete={async (id) => { 
              await softDeleteNuqoot(id); 
              load(); 
            }} 
          />
        )}
        ListHeaderComponent={
          <View>
            <View style={styles.infoCard}>
              <Text style={{ fontSize: 36 }}>{type.icon}</Text>
              <Text style={styles.evName}>{event.name}</Text>
              <Text style={styles.evMeta}>{type.label} • {formatDate(event.date)}</Text>
              {event.location ? <Text style={styles.evMeta}>📍 {event.location}</Text> : null}
              <View style={[styles.badge, { backgroundColor: dir.bg }]}>
                <Text style={[styles.badgeT, { color: dir.color }]}>{dir.label}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statV}>{list.length}</Text>
                <Text style={styles.statL}>عدد الأشخاص</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: dir.bg }]}>
                <Text style={[styles.statV, { color: dir.color }]}>{formatCurrency(event.total_amount)}</Text>
                <Text style={styles.statL}>الإجمالي (ج.م)</Text>
              </View>
            </View>

            <Text style={styles.secT}>قائمة النقوط المسجلة ({list.length})</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ fontSize: 48 }}>💰</Text>
            <Text style={{ color: '#888', marginTop: 8 }}>لا توجد نقوط مسجلة بعد في هذه المناسبة</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: type.color }]} 
        onPress={() => navigation.navigate('AddNuqoot', { eventId: event.id, direction: event.direction })}
      >
        <Ionicons name="person-add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', 
    paddingTop: 45, paddingBottom: 15, paddingHorizontal: 20 
  },
  hT: { fontSize: 17, fontWeight: 'bold', color: '#fff', maxWidth: '70%', textAlign: 'center' },
  infoCard: { backgroundColor: '#fff', margin: 16, padding: 18, borderRadius: 16, alignItems: 'center', elevation: 2 },
  evName: { fontSize: 19, fontWeight: 'bold', marginTop: 6, color: COLORS.text },
  evMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  badgeT: { fontSize: 12, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row-reverse', marginHorizontal: 16, marginBottom: 8 },
  statBox: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 12, alignItems: 'center', marginHorizontal: 4, elevation: 1 },
  statV: { fontSize: 17, fontWeight: 'bold', color: COLORS.text },
  statL: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  secT: { fontSize: 15, fontWeight: 'bold', textAlign: 'right', paddingHorizontal: 20, paddingVertical: 6, color: COLORS.text },
  fab: { 
    position: 'absolute', bottom: 20, left: 20, width: 58, height: 58, 
    borderRadius: 29, justifyContent: 'center', alignItems: 'center', elevation: 6 
  },
});

export default EventDetailScreen;