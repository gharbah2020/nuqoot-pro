import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  SafeAreaView,
  StatusBar,
  Linking,
  ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import LocalDB from '../database/LocalDB';
import BackupService from '../services/BackupService';

export default function EventDetailScreen({ route, navigation }) {
  const { eventId, eventName } = route.params;

  const [records, setRecords] = useState([]);
  const [currency, setCurrency] = useState('ج.م');
  const [loading, setLoading] = useState(true);

  // Filters & Sorting
  const [filterType, setFilterType] = useState('all'); // all, given, received
  const [sortBy, setSortBy] = useState('date_desc'); // date_desc, date_asc, amount_desc, amount_asc, name

  // Modal Record State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('given'); // given (له), received (عليه)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [relationship, setRelationship] = useState('');
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Autocomplete State
  const [suggestions, setSuggestions] = useState([]);

  const loadEventRecords = useCallback(async () => {
    try {
      const data = await LocalDB.getRecordsByEvent(eventId, filterType, sortBy);
      const curr = await LocalDB.getSetting('currency', 'ج.م');
      setRecords(data);
      setCurrency(curr);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId, filterType, sortBy]);

  useEffect(() => {
    loadEventRecords();
  }, [loadEventRecords]);

  // Handle Autocomplete
  const handleNameChange = async (text) => {
    setPersonName(text);
    if (text.trim().length > 1) {
      const results = await LocalDB.searchPeople(text);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (item) => {
    setPersonName(item.person_name);
    if (item.phone) setPhone(item.phone);
    if (item.address) setAddress(item.address);
    if (item.relationship) setRelationship(item.relationship);
    setSuggestions([]);
  };

  const handleOpenAddModal = () => {
    setEditingRecord(null);
    setPersonName('');
    setAmount('');
    setType('given');
    setDate(new Date().toISOString().split('T')[0]);
    setPhone('');
    setAddress('');
    setRelationship('');
    setNotes('');
    setSuggestions([]);
    setModalVisible(true);
  };

  const handleOpenEditModal = (rec) => {
    setEditingRecord(rec);
    setPersonName(rec.person_name);
    setAmount(rec.amount.toString());
    setType(rec.type);
    setDate(rec.date || new Date().toISOString().split('T')[0]);
    setPhone(rec.phone || '');
    setAddress(rec.address || '');
    setRelationship(rec.relationship || '');
    setNotes(rec.notes || '');
    setSuggestions([]);
    setModalVisible(true);
  };

  const handleSaveRecord = async () => {
    if (!personName.trim() || !amount.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم الشخص والمبلغ');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('تنبيه', 'يرجى إدخال مبلغ صحيح أكبر من صفر');
      return;
    }

    try {
      const recordData = {
        event_id: eventId,
        person_name: personName,
        amount: numAmount,
        type,
        date,
        phone,
        address,
        relationship,
        notes
      };

      if (editingRecord) {
        await LocalDB.updateRecord(editingRecord.id, recordData);
      } else {
        await LocalDB.addRecord(recordData);
      }

      setModalVisible(false);
      loadEventRecords();
    } catch (error) {
      Alert.alert('خطأ', 'تعذر حفظ السجل');
    }
  };

  const handleDeleteRecord = (rec) => {
    Alert.alert(
      'تأكيد الحذف',
      `هل أنت تأكد من حذف سجل "${rec.person_name}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            await LocalDB.deleteRecord(rec.id);
            loadEventRecords();
          }
        }
      ]
    );
  };

  // Direct Call Action
  const handleMakeCall = (phoneNumber) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('خطأ', 'تعذر إجراء المكالمة');
    });
  };

  // Smart WhatsApp Card Generator
  const handleSendWhatsApp = (item) => {
    if (!item.phone) {
      Alert.alert('تنبيه', 'لا يوجد رقم هاتف متاح لهذا الشخص');
      return;
    }

    const cleanPhone = item.phone.replace(/[^0-9]/g, '');
    const formattedType = item.type === 'given' ? 'له (نقوط مقتطع)' : 'عليه (نقوط واصل)';
    
    const message = `السلام عليكم ورحمة الله 🌹\nتحية طيبة عزيزي/عزيزتي *${item.person_name}*\n\nتم تسجيل النقوط الخاص بمناسبة: *${eventName}*\nالمبلغ: *${item.amount.toLocaleString('ar-EG')} ${currency}*\nالحالة: *${formattedType}*\nالتاريخ: ${item.date}\n\nدمتم دائماً في أفراح ومسرات 🎉`;
    
    const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('خطأ', 'تطبيق الواتساب غير مثبت أو لا يمكن فتحه');
    });
  };

  // Generate PDF for this specific event
  const handleExportEventPdf = async () => {
    try {
      if (records.length === 0) {
        Alert.alert('تنبيه', 'لا توجد سجلات في هذه المناسبة لإنشاء تقرير');
        return;
      }
      await BackupService.generatePdfReport(`مناسبة: ${eventName}`, records);
    } catch (e) {
      Alert.alert('خطأ', 'تعذر تصدير تقرير PDF للمناسبة');
    }
  };

  const renderRecordCard = ({ item }) => (
    <View style={styles.recordCard}>
      <View style={styles.cardHeader}>
        <View style={styles.personInfoRow}>
          <Text style={styles.personName}>{item.person_name}</Text>
          {item.relationship ? <Text style={styles.relationTag}>{item.relationship}</Text> : null}
        </View>
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

      {item.phone || item.address ? (
        <View style={styles.contactDetailsRow}>
          {item.phone ? <Text style={styles.detailText}>📱 {item.phone}</Text> : null}
          {item.address ? <Text style={styles.detailText}>📍 {item.address}</Text> : null}
        </View>
      ) : null}

      {item.notes ? <Text style={styles.recordNotes}>ملاحظات: {item.notes}</Text> : null}

      {/* Action Shortcuts Footer */}
      <View style={styles.cardActionsFooter}>
        <View style={styles.quickShortcuts}>
          {item.phone ? (
            <>
              <TouchableOpacity onPress={() => handleMakeCall(item.phone)} style={styles.shortcutIconBtn}>
                <Ionicons name="call" size={18} color="#0288D1" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleSendWhatsApp(item)} style={styles.shortcutIconBtn}>
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        <View style={styles.editDeleteGroup}>
          <TouchableOpacity onPress={() => handleOpenEditModal(item)} style={styles.miniActionBtn}>
            <Ionicons name="pencil" size={16} color="#555" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteRecord(item)} style={styles.miniActionBtn}>
            <Ionicons name="trash-outline" size={16} color="#C62828" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />

      {/* App Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{eventName}</Text>
        <TouchableOpacity onPress={handleExportEventPdf} style={styles.pdfHeaderBtn}>
          <Ionicons name="document-text-outline" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Filters Bar */}
      <View style={styles.filtersBar}>
        <ScrollViewHorizontalFilter
          filterType={filterType}
          setFilterType={setFilterType}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />
      </View>

      {/* Records List */}
      {loading ? (
        <ActivityIndicator size="large" color="#1B5E20" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRecordCard}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-search-outline" size={60} color="#CCC" />
              <Text style={styles.emptyText}>لا توجد سجلات في هذه المناسبة</Text>
              <Text style={styles.emptySubtext}>اضغط على (+) بالأسفل لإضافة أول نقوط</Text>
            </View>
          }
        />
      )}

      {/* FAB Add Record Button */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={handleOpenAddModal}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      {/* Add / Edit Record Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingRecord ? 'تعديل سجل النقوط' : 'إضافة نقوط جديد'}</Text>

            {/* Type Switcher (Given / Received) */}
            <View style={styles.typeSwitchRow}>
              <TouchableOpacity
                style={[styles.typeSwitchBtn, type === 'given' && styles.typeSwitchGivenActive]}
                onPress={() => setType('given')}
              >
                <Text style={[styles.typeSwitchText, type === 'given' && styles.typeSwitchTextActive]}>
                  له (نقوط مقتطع)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeSwitchBtn, type === 'received' && styles.typeSwitchReceivedActive]}
                onPress={() => setType('received')}
              >
                <Text style={[styles.typeSwitchText, type === 'received' && styles.typeSwitchTextActive]}>
                  عليه (نقوط واصل)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Person Name Input with Autocomplete */}
            <Text style={styles.inputLabel}>اسم الشخص *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="اسم صاحب النقوط..."
              value={personName}
              onChangeText={handleNameChange}
            />

            {/* Floating Suggestions List */}
            {suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {suggestions.map((item, idx) => (
                  <TouchableOpacity key={idx} style={styles.suggestionItem} onPress={() => selectSuggestion(item)}>
                    <Text style={styles.suggestionName}>{item.person_name}</Text>
                    {item.phone ? <Text style={styles.suggestionPhone}>{item.phone}</Text> : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.inputLabel}>المبلغ ({currency}) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="0.00"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <View style={styles.twoInputsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>رقم الهاتف</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="01xxxxxxxxx"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>صلة القرابة</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="صديق، جار، عم..."
                  value={relationship}
                  onChangeText={setRelationship}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>التاريخ</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerBtn}>
              <Ionicons name="calendar-outline" size={18} color="#1B5E20" />
              <Text style={styles.datePickerBtnText}>{date}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={new Date(date)}
                mode="date"
                display="default"
                onChange={(evt, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setDate(selectedDate.toISOString().split('T')[0]);
                  }
                }}
              />
            )}

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalBtn, styles.cancelBtn]}>
                <Text style={styles.cancelBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveRecord} style={[styles.modalBtn, styles.saveBtn]}>
                <Text style={styles.saveBtnText}>حفظ السجل</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// Subcomponent for filter bar
function ScrollViewHorizontalFilter({ filterType, setFilterType, sortBy, setSortBy }) {
  return (
    <View style={styles.filterRowContainer}>
      <TouchableOpacity
        style={[styles.chip, filterType === 'all' && styles.chipActive]}
        onPress={() => setFilterType('all')}
      >
        <Text style={[styles.chipText, filterType === 'all' && styles.chipTextActive]}>الكل</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.chip, filterType === 'given' && styles.chipActiveGiven]}
        onPress={() => setFilterType('given')}
      >
        <Text style={[styles.chipText, filterType === 'given' && styles.chipTextActive]}>له (مقتطع)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.chip, filterType === 'received' && styles.chipActiveReceived]}
        onPress={() => setFilterType('received')}
      >
        <Text style={[styles.chipText, filterType === 'received' && styles.chipTextActive]}>عليه (واصل)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.chipSort}
        onPress={() => setSortBy(sortBy === 'amount_desc' ? 'date_desc' : 'amount_desc')}
      >
        <Ionicons name="swap-vertical" size={16} color="#1B5E20" />
        <Text style={styles.chipSortText}>{sortBy === 'amount_desc' ? 'الأعلى مبلغاً' : 'الأحدث'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  header: {
    backgroundColor: '#1B5E20',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center', marginHorizontal: 10 },
  pdfHeaderBtn: { padding: 4 },

  filtersBar: { backgroundColor: '#FFF', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderColor: '#E0E0E0' },
  filterRowContainer: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F0F0F0' },
  chipActive: { backgroundColor: '#1B5E20' },
  chipActiveGiven: { backgroundColor: '#C62828' },
  chipActiveReceived: { backgroundColor: '#2E7D32' },
  chipText: { fontSize: 12, color: '#555', fontWeight: 'bold' },
  chipTextActive: { color: '#FFF' },
  chipSort: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#E8F5E9', marginLeft: 'auto' },
  chipSortText: { fontSize: 12, color: '#1B5E20', fontWeight: 'bold' },

  listContainer: { padding: 12, paddingBottom: 80 },
  recordCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  personInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  personName: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  relationTag: { fontSize: 11, color: '#1B5E20', backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  amountText: { fontSize: 16, fontWeight: 'bold' },

  typeBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: 'bold' },
  recordDate: { fontSize: 12, color: '#888' },

  contactDetailsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  detailText: { fontSize: 12, color: '#555' },
  recordNotes: { fontSize: 12, color: '#777', marginTop: 6, fontStyle: 'italic' },

  cardActionsFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderColor: '#F0F0F0' },
  quickShortcuts: { flexDirection: 'row', gap: 10 },
  shortcutIconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F0F4F8', justifyContent: 'center', alignItems: 'center' },
  editDeleteGroup: { flexDirection: 'row', gap: 12 },
  miniActionBtn: { padding: 4 },

  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: '#666', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#999', marginTop: 4 },

  fab: {
    position: 'absolute',
    left: 20,
    bottom: 25,
    backgroundColor: '#1B5E20',
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 18 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20', textAlign: 'center', marginBottom: 14 },

  typeSwitchRow: { flexDirection: 'row', borderRadius: 8, backgroundColor: '#F0F0F0', padding: 4, marginBottom: 14 },
  typeSwitchBtn: { flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  typeSwitchGivenActive: { backgroundColor: '#C62828' },
  typeSwitchReceivedActive: { backgroundColor: '#2E7D32' },
  typeSwitchText: { fontSize: 13, fontWeight: 'bold', color: '#666' },
  typeSwitchTextActive: { color: '#FFF' },

  inputLabel: { fontSize: 12, fontWeight: 'bold', color: '#444', marginBottom: 4, textAlign: 'right' },
  modalInput: { backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, fontSize: 14, textAlign: 'right', marginBottom: 10 },
  twoInputsRow: { flexDirection: 'row', gap: 10 },

  suggestionsContainer: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#1B5E20', borderRadius: 8, marginTop: -8, marginBottom: 10, maxHeight: 120, elevation: 4 },
  suggestionItem: { padding: 10, borderBottomWidth: 1, borderColor: '#EEE', flexDirection: 'row', justifyContent: 'space-between' },
  suggestionName: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  suggestionPhone: { fontSize: 12, color: '#777' },

  datePickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, marginBottom: 12 },
  datePickerBtnText: { fontSize: 14, color: '#333' },

  modalButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveBtn: { backgroundColor: '#1B5E20' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  cancelBtn: { backgroundColor: '#EEEEEE' },
  cancelBtnText: { color: '#555', fontWeight: 'bold', fontSize: 14 }
});
