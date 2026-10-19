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
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import LocalDB from '../database/LocalDB';

export default function HomeScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({ eventsCount: 0, recordsCount: 0, totalGiven: 0, totalReceived: 0, netBalance: 0 });
  const [currency, setCurrency] = useState('ج.م');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit Event Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventNotes, setEventNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Currency Selector Modal
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const availableCurrencies = ['ج.م', 'ر.س', 'د.إ', 'د.ك', 'ر.ع', 'ر.ق', '$', '€'];

  const loadData = useCallback(async () => {
    try {
      const fetchedEvents = await LocalDB.getAllEvents();
      const fetchedStats = await LocalDB.getDashboardStats();
      const fetchedCurrency = await LocalDB.getSetting('currency', 'ج.م');

      setEvents(fetchedEvents);
      setStats(fetchedStats);
      setCurrency(fetchedCurrency);
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSaveCurrency = async (selected) => {
    await LocalDB.saveSetting('currency', selected);
    setCurrency(selected);
    setCurrencyModalVisible(false);
  };

  const handleOpenAddModal = () => {
    setEditingEvent(null);
    setEventName('');
    setEventDate(new Date().toISOString().split('T')[0]);
    setEventNotes('');
    setModalVisible(true);
  };

  const handleOpenEditModal = (event) => {
    setEditingEvent(event);
    setEventName(event.name);
    setEventDate(event.date || new Date().toISOString().split('T')[0]);
    setEventNotes(event.notes || '');
    setModalVisible(true);
  };

  const handleSaveEvent = async () => {
    if (!eventName.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم المناسبة');
      return;
    }

    try {
      if (editingEvent) {
        await LocalDB.updateEvent(editingEvent.id, {
          name: eventName,
          date: eventDate,
          notes: eventNotes
        });
      } else {
        await LocalDB.addEvent({
          name: eventName,
          date: eventDate,
          notes: eventNotes
        });
      }
      setModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert('خطأ', 'تعذر حفظ المناسبة');
    }
  };

  const handleDeleteEvent = (event) => {
    Alert.alert(
      'تأكيد الحذف',
      `هل أنت تأكد من حذف مناسبة "${event.name}"؟ سيتم حذف جميع سجلات النقوط المرتبطة بها نهائياً.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            await LocalDB.deleteEvent(event.id);
            loadData();
          }
        }
      ]
    );
  };

  const filteredEvents = events.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderEventCard = ({ item }) => {
    const totalGiven = Number(item.total_given || 0);
    const totalReceived = Number(item.total_received || 0);
    const balance = totalReceived - totalGiven;

    return (
      <TouchableOpacity
        style={styles.eventCard}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('EventDetailScreen', { eventId: item.id, eventName: item.name })}
      >
        <View style={styles.eventHeader}>
          <View style={styles.eventTitleRow}>
            <MaterialCommunityIcons name="party-popper" size={24} color="#1B5E20" />
            <Text style={styles.eventName}>{item.name}</Text>
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={() => handleOpenEditModal(item)} style={styles.actionBtn}>
              <Ionicons name="create-outline" size={20} color="#0288D1" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteEvent(item)} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={20} color="#D32F2F" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.eventMetaRow}>
          <Ionicons name="calendar-outline" size={15} color="#666" />
          <Text style={styles.eventDate}>{item.date}</Text>
          <Text style={styles.dotSeparator}>•</Text>
          <Text style={styles.recordsBadge}>{item.records_count || 0} سجلات</Text>
        </View>

        {item.notes ? <Text style={styles.eventNotes} numberOfLines={1}>{item.notes}</Text> : null}

        <View style={styles.cardStatsRow}>
          <View style={styles.miniStatBox}>
            <Text style={styles.miniStatTitle}>له (مقتطع)</Text>
            <Text style={[styles.miniStatValue, { color: '#C62828' }]}>
              {totalGiven.toLocaleString('ar-EG')} {currency}
            </Text>
          </View>
          <View style={styles.miniStatDivider} />
          <View style={styles.miniStatBox}>
            <Text style={styles.miniStatTitle}>عليه (واصل)</Text>
            <Text style={[styles.miniStatValue, { color: '#2E7D32' }]}>
              {totalReceived.toLocaleString('ar-EG')} {currency}
            </Text>
          </View>
          <View style={styles.miniStatDivider} />
          <View style={styles.miniStatBox}>
            <Text style={styles.miniStatTitle}>الرصيد</Text>
            <Text style={[styles.miniStatValue, { color: balance >= 0 ? '#1B5E20' : '#C62828' }]}>
              {balance.toLocaleString('ar-EG')} {currency}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />
      
      {/* App Bar Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <MaterialCommunityIcons name="notebook-outline" size={28} color="#FFF" />
          <Text style={styles.headerTitle}>دفتر النقوط Pro</Text>
        </View>
        <View style={styles.headerButtonsContainer}>
          <TouchableOpacity onPress={() => setCurrencyModalVisible(true)} style={styles.currencyBadgeBtn}>
            <Text style={styles.currencyBadgeText}>{currency}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('BackupScreen')} style={styles.iconHeaderBtn}>
            <Ionicons name="settings-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Financial Executive Dashboard */}
      <View style={styles.dashboardContainer}>
        <Text style={styles.dashboardTitle}>الملخص المالي العام</Text>
        <View style={styles.dashboardCardsRow}>
          <View style={[styles.dashCard, { backgroundColor: '#FFEBEE' }]}>
            <Text style={styles.dashCardLabel}>له (مقتطع)</Text>
            <Text style={[styles.dashCardValue, { color: '#C62828' }]}>
              {stats.totalGiven.toLocaleString('ar-EG')} {currency}
            </Text>
          </View>
          <View style={[styles.dashCard, { backgroundColor: '#E8F5E9' }]}>
            <Text style={styles.dashCardLabel}>عليه (واصل)</Text>
            <Text style={[styles.dashCardValue, { color: '#2E7D32' }]}>
              {stats.totalReceived.toLocaleString('ar-EG')} {currency}
            </Text>
          </View>
          <View style={[styles.dashCard, { backgroundColor: '#E1F5FE' }]}>
            <Text style={styles.dashCardLabel}>صافي الرصيد</Text>
            <Text style={[styles.dashCardValue, { color: stats.netBalance >= 0 ? '#0288D1' : '#C62828' }]}>
              {stats.netBalance.toLocaleString('ar-EG')} {currency}
            </Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#777" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن مناسبة..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#777" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Content List */}
      {loading ? (
        <ActivityIndicator size="large" color="#1B5E20" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderEventCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1B5E20']} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={60} color="#CCC" />
              <Text style={styles.emptyText}>لا توجد مناسبات مسجلة حتى الآن</Text>
              <Text style={styles.emptySubtext}>اضغط على زر (+) بالأسفل لإضافة أول مناسبة</Text>
            </View>
          }
        />
      )}

      {/* FAB Add Button */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={handleOpenAddModal}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      {/* Add / Edit Event Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingEvent ? 'تعديل المناسبة' : 'إضافة مناسبة جديدة'}</Text>
            
            <Text style={styles.inputLabel}>اسم المناسبة *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="مثال: زفاف محمد، عقيقة علي..."
              value={eventName}
              onChangeText={setEventName}
            />

            <Text style={styles.inputLabel}>تاريخ المناسبة</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerBtn}>
              <Ionicons name="calendar-outline" size={20} color="#1B5E20" />
              <Text style={styles.datePickerBtnText}>{eventDate}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={new Date(eventDate)}
                mode="date"
                display="default"
                onChange={(evt, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setEventDate(selectedDate.toISOString().split('T')[0]);
                  }
                }}
              />
            )}

            <Text style={styles.inputLabel}>ملاحظات (اختياري)</Text>
            <TextInput
              style={[styles.modalInput, { height: 70, textAlignVertical: 'top' }]}
              placeholder="أي ملاحظات إضافية..."
              multiline
              value={eventNotes}
              onChangeText={setEventNotes}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalBtn, styles.cancelBtn]}>
                <Text style={styles.cancelBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveEvent} style={[styles.modalBtn, styles.saveBtn]}>
                <Text style={styles.saveBtnText}>حفظ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Currency Selector Modal */}
      <Modal visible={currencyModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>اختر عملة التطبيق</Text>
            <View style={styles.currencyGrid}>
              {availableCurrencies.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.currencyItem, currency === item && styles.currencyItemActive]}
                  onPress={() => handleSaveCurrency(item)}
                >
                  <Text style={[styles.currencyItemText, currency === item && styles.currencyItemTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => setCurrencyModalVisible(false)} style={[styles.modalBtn, styles.cancelBtn, { marginTop: 15 }]}>
              <Text style={styles.cancelBtnText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  header: {
    backgroundColor: '#1B5E20',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4
  },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  headerButtonsContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  currencyBadgeBtn: {
    backgroundColor: '#388E3C',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  currencyBadgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  iconHeaderBtn: { padding: 4 },

  dashboardContainer: {
    backgroundColor: '#FFF',
    margin: 12,
    padding: 14,
    borderRadius: 14,
    elevation: 2
  },
  dashboardTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'right' },
  dashboardCardsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  dashCard: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  dashCardLabel: { fontSize: 11, color: '#555', marginBottom: 4 },
  dashCardValue: { fontSize: 13, fontWeight: 'bold' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 44,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 14, textAlign: 'right' },

  listContainer: { paddingHorizontal: 12, paddingBottom: 80 },
  eventCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 2
  },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventName: { fontSize: 17, fontWeight: 'bold', color: '#222' },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { padding: 4 },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  eventDate: { fontSize: 12, color: '#666' },
  dotSeparator: { color: '#AAA' },
  recordsBadge: { fontSize: 12, color: '#1B5E20', fontWeight: 'bold' },
  eventNotes: { fontSize: 12, color: '#777', marginTop: 4, fontStyle: 'italic' },

  cardStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FBF9',
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8F5E9'
  },
  miniStatBox: { flex: 1, alignItems: 'center' },
  miniStatTitle: { fontSize: 10, color: '#666', marginBottom: 2 },
  miniStatValue: { fontSize: 12, fontWeight: 'bold' },
  miniStatDivider: { width: 1, backgroundColor: '#E0E0E0' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20', textAlign: 'center', marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: 'bold', color: '#444', marginBottom: 4, textAlign: 'right' },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 12
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12
  },
  datePickerBtnText: { fontSize: 14, color: '#333' },
  modalButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveBtn: { backgroundColor: '#1B5E20' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  cancelBtn: { backgroundColor: '#EEEEEE' },
  cancelBtnText: { color: '#555', fontWeight: 'bold', fontSize: 14 },

  currencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginVertical: 10 },
  currencyItem: { width: '22%', paddingVertical: 12, backgroundColor: '#F0F0F0', borderRadius: 8, alignItems: 'center' },
  currencyItemActive: { backgroundColor: '#1B5E20' },
  currencyItemText: { fontSize: 14, color: '#333', fontWeight: 'bold' },
  currencyItemTextActive: { color: '#FFF' }
});
