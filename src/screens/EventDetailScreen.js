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

export default function EventDetailScreen({ route, navigation }) {
  const { event } = route.params;
  const [records, setRecords] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('give');
  const [note, setNote] = useState('');
  const [editingRecordId, setEditingRecordId] = useState(null);

  const loadRecords = async () => {
    try {
      const list = await db.getAllAsync(
        'SELECT * FROM records WHERE event_id = ? ORDER BY id DESC',
        [event.id]
      );
      setRecords(list);
    } catch (error) {
      console.error('Error loading records:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [event.id])
  );

  const handleSaveRecord = async () => {
    if (!personName.trim() || !amount.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم الشخص والمبلغ');
      return;
    }

    try {
      const currentDate = new Date().toISOString().split('T')[0];
      if (editingRecordId) {
        await db.runAsync(
          'UPDATE records SET person_name = ?, amount = ?, type = ?, note = ? WHERE id = ?',
          [personName.trim(), parseFloat(amount), type, note.trim(), editingRecordId]
        );
      } else {
        await db.runAsync(
          'INSERT INTO records (event_id, person_name, amount, type, date, note) VALUES (?, ?, ?, ?, ?, ?)',
          [event.id, personName.trim(), parseFloat(amount), type, currentDate, note.trim()]
        );
      }

      setModalVisible(false);
      resetForm();
      loadRecords();
    } catch (error) {
      Alert.alert('خطأ', 'فشل حفظ السجل: ' + error.message);
    }
  };

  const handleDeleteRecord = (id) => {
    Alert.alert('حذف سجل', 'هل أنت تأكد من حذف هذا السجل؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          await db.runAsync('DELETE FROM records WHERE id = ?', [id]);
          loadRecords();
        },
      },
    ]);
  };

  const openEditModal = (rec) => {
    setEditingRecordId(rec.id);
    setPersonName(rec.person_name);
    setAmount(String(rec.amount));
    setType(rec.type);
    setNote(rec.note || '');
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingRecordId(null);
    setPersonName('');
    setAmount('');
    setType('give');
    setNote('');
  };

  const exportEventExcel = async () => {
    try {
      const exportData = records.map((r) => ({
        'اسم الشخص': r.person_name,
        'المبلغ': r.amount,
        'النوع': r.type === 'give' ? 'له (دفعت له)' : 'عليه (قبضت منه)',
        'التاريخ': r.date,
        'ملاحظات': r.note || '',
      }));
      await BackupService.exportToExcel(exportData, `${event.name}_نقوط.xlsx`);
    } catch (error) {
      Alert.alert('خطأ', 'فشل تصدير Excel: ' + error.message);
    }
  };

  const renderRecordItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <TouchableOpacity
          onPress={() => navigation.navigate('PersonDetail', { personName: item.person_name })}
        >
          <Text style={styles.personName}>{item.person_name}</Text>
        </TouchableOpacity>
        <Text
          style={[
            styles.amountText,
            { color: item.type === 'give' ? '#D32F2F' : '#2E7D32' },
          ]}
        >
          {item.type === 'give' ? 'له: ' : 'عليه: '}
          {item.amount.toLocaleString()} د.أ
        </Text>
      </View>

      {item.note ? <Text style={styles.noteText}>{item.note}</Text> : null}

      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>{item.date}</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => openEditModal(item)} style={styles.iconBtn}>
            <Ionicons name="create-outline" size={20} color="#1976D2" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteRecord(item.id)} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={20} color="#D32F2F" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.excelBtn} onPress={exportEventExcel}>
          <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
          <Text style={styles.excelBtnText}>تصدير Excel للمناسبة</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderRecordItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>لا توجد سجلات في هذه المناسبة بعد</Text>
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
              {editingRecordId ? 'تعديل السجل' : 'إضافة سجل جديد'}
            </Text>

            <Text style={styles.label}>اسم الشخص</Text>
            <TextInput
              style={styles.input}
              value={personName}
              onChangeText={setPersonName}
              placeholder="أحمد علي"
              placeholderTextColor="#888"
            />

            <Text style={styles.label}>المبلغ</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="#888"
            />

            <Text style={styles.label}>نوع الحركة</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  type === 'give' && { backgroundColor: '#D32F2F' },
                ]}
                onPress={() => setType('give')}
              >
                <Text style={styles.typeOptionText}>له (دفعت له)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  type === 'receive' && { backgroundColor: '#2E7D32' },
                ]}
                onPress={() => setType('receive')}
              >
                <Text style={styles.typeOptionText}>عليه (قبضت منه)</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>ملاحظات (اختياري)</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="تفاصيل إضافية..."
              placeholderTextColor="#888"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#1B5E20' }]}
                onPress={handleSaveRecord}
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
  toolbar: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  excelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  excelBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  personName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1976D2',
    textDecorationLine: 'underline',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  noteText: {
    marginTop: 6,
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  cardFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  dateText: {
    fontSize: 12,
    color: '#888',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBtn: {
    padding: 4,
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
  typeSelector: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
  },
  typeOptionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
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
