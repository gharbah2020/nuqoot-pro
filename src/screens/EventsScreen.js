import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import db from '../Database';
import BackupService from '../services/BackupService';

export default function EventsScreen({ navigation, currentUser }) {
  const [events, setEvents] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventBudget, setEventBudget] = useState('');
  const [editingEventId, setEditingEventId] = useState(null);

  const loadEvents = async () => {
    try {
      const list = await db.getAllAsync(`
        SELECT e.*, 
          COALESCE(SUM(CASE WHEN r.type = 'give' THEN r.amount ELSE 0 END), 0) as total_given,
          COALESCE(SUM(CASE WHEN r.type = 'receive' THEN r.amount ELSE 0 END), 0) as total_received
        FROM events e
        LEFT JOIN records r ON e.id = r.event_id
        GROUP BY e.id
        ORDER BY e.date DESC
      `);
      setEvents(list);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [])
  );

  const handleSaveEvent = async () => {
    if (!eventName.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم المناسبة');
      return;
    }

    try {
      if (editingEventId) {
        await db.runAsync(
          'UPDATE events SET name = ?, date = ?, budget = ? WHERE id = ?',
          [eventName.trim(), eventDate.trim(), parseFloat(eventBudget) || 0, editingEventId]
        );
      } else {
        await db.runAsync(
          'INSERT INTO events (name, date, budget, icon) VALUES (?, ?, ?, ?)',
          [eventName.trim(), eventDate.trim(), parseFloat(eventBudget) || 0, 'gift']
        );
      }

      setModalVisible(false);
      resetForm();
      loadEvents();
    } catch (error) {
      Alert.alert('خطأ', 'فشل حفظ المناسبة: ' + error.message);
    }
  };

  const handleDeleteEvent = (id, name) => {
    Alert.alert('حذف مناسبة', `هل أنت تأكد من حذف "${name}" وجميع سجلاتها؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          await db.runAsync('DELETE FROM events WHERE id = ?', [id]);
          loadEvents();
        },
      },
    ]);
  };

  const openEditModal = (event) => {
    setEditingEventId(event.id);
    setEventName(event.name);
    setEventDate(event.date);
    setEventBudget(String(event.budget || ''));
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingEventId(null);
    setEventName('');
    setEventDate(new Date().toISOString().split('T')[0]);
    setEventBudget('');
  };

  const renderEventItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('EventDetail', { event: item })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Ionicons name="gift-outline" size={24} color="#1B5E20" />
          <Text style={styles.cardTitle}>{item.name}</Text>
        </View>
        <Text style={styles.cardDate}>{item.date}</Text>
      </View>

      <View style={styles.cardStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>له (مدفوع):</Text>
          <Text style={[styles.statValue, { color: '#D32F2F' }]}>
            {item.total_given.toLocaleString()} د.أ
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>عليه (مقبوض):</Text>
          <Text style={[styles.statValue, { color: '#2E7D32' }]}>
            {item.total_received.toLocaleString()} د.أ
          </Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={18} color="#FFFFFF" />
          <Text style={styles.btnText}>تعديل</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => handleDeleteEvent(item.id, item.name)}
        >
          <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
          <Text style={styles.btnText}>حذف</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.backupToolbar}>
        <TouchableOpacity
          style={styles.backupBtn}
          onPress={() => BackupService.exportFullBackup()}
        >
          <Ionicons name="cloud-upload-outline" size={18} color="#1B5E20" />
          <Text style={styles.backupBtnText}>تصدير نسبي</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backupBtn}
          onPress={() => BackupService.importFullBackup(loadEvents)}
        >
          <Ionicons name="cloud-download-outline" size={18} color="#1B5E20" />
          <Text style={styles.backupBtnText}>استعادة نسخة</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderEventItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>لا توجد مناسبات مسجلة بعد</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingEventId ? 'تعديل المناسبة' : 'إضافة مناسبة جديدة'}
            </Text>

            <Text style={styles.label}>اسم المناسبة</Text>
            <TextInput
              style={styles.input}
              value={eventName}
              onChangeText={setEventName}
              placeholder="مثال: حفل زفاف أخي"
              placeholderTextColor="#888"
            />

            <Text style={styles.label}>التاريخ (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={eventDate}
              onChangeText={setEventDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#888"
            />

            <Text style={styles.label}>الميزانية المتوقعة (اختياري)</Text>
            <TextInput
              style={styles.input}
              value={eventBudget}
              onChangeText={setEventBudget}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="#888"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#1B5E20' }]}
                onPress={handleSaveEvent}
              >
                <Text style={styles.modalBtnText}>حفظ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#757575' }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  backupToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
  },
  backupBtnText: {
    color: '#1B5E20',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  cardDate: {
    fontSize: 13,
    color: '#777',
  },
  cardStats: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    marginVertical: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editBtn: {
    backgroundColor: '#1976D2',
  },
  deleteBtn: {
    backgroundColor: '#D32F2F',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginRight: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    backgroundColor: '#1B5E20',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#888',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
    textAlign: 'right',
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
    marginBottom: 12,
    textAlign: 'right',
  },
  modalButtons: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
