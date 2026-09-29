import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { insertEvent } from '../database/LocalDB';
import { generateId, getCurrentDate } from '../utils/helpers';
import { EVENT_TYPES } from '../config/constants';
import { COLORS } from '../utils/theme';

const AddEventScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('wedding');
  const [date, setDate] = useState(getCurrentDate());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [direction, setDirection] = useState('incoming');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate.toISOString().slice(0, 10));
    }
  };

  const save = async () => {
    if (!name.trim()) return Alert.alert('تنبيه', 'يرجى إدخال اسم المناسبة');
    await insertEvent({
      id: generateId(), name: name.trim(), type, date, direction, location: location.trim(), notes: notes.trim()
    });
    Alert.alert('نجاح ✅', 'تم حفظ المناسبة بنجاح', [{ text: 'حسناً', onPress: () => navigation.goBack() }]);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : null}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={26} color="#fff" /></TouchableOpacity>
        <Text style={styles.hTitle}>إضافة مناسبة جديدة</Text>
        <TouchableOpacity onPress={save}><Ionicons name="checkmark" size={26} color="#fff" /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>نوع دفتر النقوط</Text>
        <View style={styles.dirRow}>
          <TouchableOpacity style={[styles.dirBtn, direction === 'outgoing' && styles.dirOut]} onPress={() => setDirection('outgoing')}>
            <Text style={styles.dirT}>📤 نقوط عليّا (صادرة)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dirBtn, direction === 'incoming' && styles.dirIn]} onPress={() => setDirection('incoming')}>
            <Text style={styles.dirT}>📥 نقوط ليّا (واردة)</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>اسم المناسبة *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="مثال: فرح أحمد ومي" textAlign="right" />

        <Text style={styles.label}>تاريخ المناسبة</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={{ textAlign: 'right', fontSize: 16, color: COLORS.text }}>📅 {date}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker value={new Date(date)} mode="date" display="default" onChange={handleDateChange} />
        )}

        <Text style={styles.label}>تصنيف المناسبة</Text>
        <View style={styles.typeGrid}>
          {EVENT_TYPES.map(t => (
            <TouchableOpacity key={t.id} style={[styles.typeBtn, type === t.id && { borderColor: t.color, backgroundColor: t.color + '15' }]} onPress={() => setType(t.id)}>
              <Text style={{ fontSize: 20 }}>{t.icon}</Text>
              <Text style={[styles.typeT, type === t.id && { color: t.color, fontWeight: 'bold' }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>المكان / البلد (اختياري)</Text>
        <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="مثال: قاعة الماسة" textAlign="right" />

        <Text style={styles.label}>ملاحظات (اختياري)</Text>
        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} placeholder="أي تفاصيل إضافية..." textAlign="right" multiline />

        <TouchableOpacity style={styles.saveBtn} onPress={save}>
          <Text style={styles.saveT}>💾 حفظ المناسبة الآن</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingTop: 45, paddingBottom: 15, paddingHorizontal: 20 },
  hTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  form: { padding: 16, paddingBottom: 100 },
  label: { fontSize: 14, fontWeight: 'bold', color: COLORS.text, textAlign: 'right', marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#e0e0e0' },
  dirRow: { flexDirection: 'row-reverse' },
  dirBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#fff', marginHorizontal: 4, alignItems: 'center', borderWidth: 2, borderColor: '#e0e0e0' },
  dirIn: { borderColor: COLORS.incoming, backgroundColor: COLORS.incomingLight },
  dirOut: { borderColor: COLORS.outgoing, backgroundColor: COLORS.outgoingLight },
  dirT: { fontSize: 13, fontWeight: 'bold' },
  typeGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap' },
  typeBtn: { width: '31%', alignItems: 'center', padding: 10, margin: '1%', borderRadius: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e0e0e0' },
  typeT: { fontSize: 11, color: '#666', marginTop: 4, textAlign: 'center' },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 20 },
  saveT: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default AddEventScreen;