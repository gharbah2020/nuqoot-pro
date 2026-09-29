import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { insertNuqoot, getAllPeople } from '../database/LocalDB';
import { generateId, getDirectionInfo } from '../utils/helpers';
import { RELATIONS, QUICK_AMOUNTS } from '../config/constants';
import { COLORS } from '../utils/theme';

const AddNuqootScreen = ({ route, navigation }) => {
  const { eventId, direction } = route.params;
  const dir = getDirectionInfo(direction);
  
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [relation, setRelation] = useState('');
  const [notes, setNotes] = useState('');
  
  const [allPeople, setAllPeople] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const fetchPeople = async () => {
      const data = await getAllPeople();
      setAllPeople(data);
    };
    fetchPeople();
  }, []);

  const handleNameChange = (text) => {
    setName(text);
    if (text.length > 0) {
      const matches = allPeople.filter(p => p.person_name.includes(text) || (p.phone && p.phone.includes(text)));
      setSuggestions(matches);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectPerson = (person) => {
    setName(person.person_name);
    if (person.phone) setPhone(person.phone);
    if (person.address) setAddress(person.address);
    if (person.relation) setRelation(person.relation);
    setShowSuggestions(false);
  };

  const save = async () => {
    if (!name.trim()) return Alert.alert('تنبيه', 'يرجى إدخال اسم الشخص');
    if (!amount || parseFloat(amount) <= 0) return Alert.alert('تنبيه', 'يرجى إدخال المبلغ');

    await insertNuqoot({
      id: generateId(), event_id: eventId, person_name: name.trim(), amount: parseFloat(amount),
      phone: phone.trim(), address: address.trim(), relation, notes: notes.trim()
    });

    Alert.alert('نجاح ✅', `تم تسجيل مبلغ ${amount} ج.م لـ (${name})`, [
      { text: 'تسجيل شخص آخر', onPress: () => { setName(''); setAmount(''); setShowSuggestions(false); } },
      { text: 'رجوع للمناسبة', onPress: () => navigation.goBack() }
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : null}>
      <View style={[styles.header, { backgroundColor: dir.color }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={26} color="#fff" /></TouchableOpacity>
        <Text style={styles.hT}>{direction === 'incoming' ? 'تسجيل نقوط واردة' : 'تسجيل نقوط صادرة'}</Text>
        <TouchableOpacity onPress={save}><Ionicons name="checkmark" size={26} color="#fff" /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>اسم الشخص أو الموبايل (اكتب للبحث) *</Text>
        <View style={{ zIndex: 10 }}>
          <TextInput style={styles.input} value={name} onChangeText={handleNameChange} placeholder="مثال: الحاج إبراهيم" textAlign="right" />
          
          {/* القائمة المنسدلة الذكية */}
          {showSuggestions && suggestions.length > 0 && (
            <View style={styles.dropdown}>
              {suggestions.map((p, idx) => (
                <TouchableOpacity key={idx} style={styles.dropItem} onPress={() => selectPerson(p)}>
                  <Text style={styles.dropName}>{p.person_name}</Text>
                  <Text style={styles.dropSub}>{p.address ? `📍 ${p.address}` : ''} {p.phone ? `📱 ${p.phone}` : ''}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.label}>المبلغ بالجنيه *</Text>
        <TextInput style={[styles.input, { fontSize: 26, fontWeight: 'bold', textAlign: 'center' }]} value={amount} onChangeText={setAmount} placeholder="0" keyboardType="numeric" />

        <View style={styles.quickRow}>
          {QUICK_AMOUNTS.map(q => (
            <TouchableOpacity key={q} style={[styles.qBtn, amount === q.toString() && { backgroundColor: dir.color + '20', borderColor: dir.color }]} onPress={() => setAmount(q.toString())}>
              <Text style={[styles.qT, amount === q.toString() && { color: dir.color, fontWeight: 'bold' }]}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>البلد / العنوان (اختياري)</Text>
        <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="مثال: القاهرة" textAlign="right" />

        <Text style={styles.label}>رقم الهاتف (اختياري)</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="01xxxxxxxxx" keyboardType="phone-pad" textAlign="right" />

        <Text style={styles.label}>ملاحظات (اختياري)</Text>
        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} placeholder="أي تفاصيل خاصة..." textAlign="right" multiline />

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: dir.color }]} onPress={save}>
          <Text style={styles.saveT}>💾 حفظ النقوط</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingTop: 45, paddingBottom: 15, paddingHorizontal: 20 },
  hT: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  form: { padding: 16, paddingBottom: 100 },
  label: { fontSize: 13, fontWeight: 'bold', color: COLORS.text, textAlign: 'right', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#e0e0e0' },
  dropdown: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ddd', marginTop: 4, maxHeight: 180, elevation: 4 },
  dropItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'flex-end' },
  dropName: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary },
  dropSub: { fontSize: 11, color: '#666', marginTop: 2 },
  quickRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', marginTop: 8 },
  qBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#fff', margin: 3, borderWidth: 1, borderColor: '#ddd' },
  qT: { fontSize: 13, color: '#666' },
  saveBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  saveT: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default AddNuqootScreen;