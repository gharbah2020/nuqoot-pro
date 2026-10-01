import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { insertNuqoot, updateNuqoot, getAllPeople } from '../database/LocalDB';
import { generateId, getDirectionInfo } from '../utils/helpers';
import { RELATIONS, QUICK_AMOUNTS } from '../config/constants';
import { COLORS } from '../utils/theme';

const AddNuqootScreen = ({ route, navigation }) => {
  // استقبال البيانات سواء إضافة جديدة أو تعديل
  const { eventId, direction, editItem } = route.params;
  const dir = getDirectionInfo(direction);
  
  const [name, setName] = useState(editItem ? editItem.person_name : '');
  const [amount, setAmount] = useState(editItem ? editItem.amount.toString() : '');
  const [phone, setPhone] = useState(editItem ? editItem.phone : '');
  const [address, setAddress] = useState(editItem ? editItem.address : '');
  const [relation, setRelation] = useState(editItem ? editItem.relation : '');
  const [notes, setNotes] = useState(editItem ? editItem.notes : '');
  
  const [allPeople, setAllPeople] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addMore, setAddMore] = useState(true);

  useEffect(() => {
    const fetchPeople = async () => { setAllPeople(await getAllPeople()); };
    fetchPeople();
  }, []);

  const handleNameChange = (text) => {
    setName(text);
    if (text.trim().length > 0 && !editItem) {
      const matches = allPeople.filter(p => p.person_name.includes(text) || (p.phone && p.phone.includes(text)));
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
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

    if (editItem) {
      // تعديل بيانات سابقة
      await updateNuqoot(editItem.id, name.trim(), parseFloat(amount), phone.trim(), relation, address.trim(), notes.trim());
      Alert.alert('تم التعديل ✅', 'تم تحديث البيانات بنجاح', [{ text: 'حسناً', onPress: () => navigation.goBack() }]);
    } else {
      // إضافة جديدة
      await insertNuqoot({
        id: generateId(), event_id: eventId, person_name: name.trim(), amount: parseFloat(amount),
        phone: phone.trim(), address: address.trim(), relation, notes: notes.trim()
      });
      if (addMore) {
        Alert.alert('نجاح ✅', `تم تسجيل ${amount} ج.م لـ (${name})`);
        setName(''); setAmount(''); setPhone(''); setAddress(''); setRelation(''); setNotes('');
      } else {
        navigation.goBack();
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: dir.color }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={26} color="#fff" /></TouchableOpacity>
        <Text style={styles.hT}>{editItem ? 'تعديل بيانات النقوط' : (direction === 'incoming' ? 'تسجيل نقوط واردة' : 'تسجيل نقوط صادرة')}</Text>
        <TouchableOpacity onPress={save}><Ionicons name="checkmark" size={26} color="#fff" /></TouchableOpacity>
      </View>

      {/* حماية الكيبورد بزيادة الـ paddingBottom */}
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        
        <View style={{ zIndex: 1000, elevation: 10 }}>
          <Text style={styles.label}>اسم الشخص *</Text>
          <TextInput style={styles.input} value={name} onChangeText={handleNameChange} placeholder="ابحث أو اكتب اسم جديد..." textAlign="right" />
          
          {showSuggestions && (
            <View style={styles.floatingDropdown}>
              {suggestions.slice(0, 5).map((p, idx) => (
                <TouchableOpacity key={idx} style={styles.dropItem} onPress={() => selectPerson(p)}>
                  <Text style={styles.dropName}>{p.person_name}</Text>
                  <Text style={styles.dropSub}>{p.address ? `📍 ${p.address} ` : ''}{p.phone ? `📱 ${p.phone}` : ''}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.label}>المبلغ بالجنيه *</Text>
        <TextInput style={[styles.input, { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: dir.color }]} value={amount} onChangeText={setAmount} placeholder="0" keyboardType="numeric" />

        {!editItem && (
          <View style={styles.quickRow}>
            {QUICK_AMOUNTS.map(q => (
              <TouchableOpacity key={q} style={[styles.qBtn, amount === q.toString() && { backgroundColor: dir.color, borderColor: dir.color }]} onPress={() => setAmount(q.toString())}>
                <Text style={[styles.qT, amount === q.toString() && { color: '#fff', fontWeight: 'bold' }]}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>البلد / العنوان (اختياري)</Text>
        <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="مثال: القاهرة" textAlign="right" />

        <Text style={styles.label}>رقم الهاتف (اختياري)</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="01xxxxxxxxx" keyboardType="phone-pad" textAlign="right" />

        <Text style={styles.label}>ملاحظات (اختياري)</Text>
        <TextInput style={[styles.input, { height: 90, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} placeholder="اكتب ملاحظاتك هنا براحتك..." textAlign="right" multiline />

        {!editItem && (
          <TouchableOpacity style={styles.toggle} onPress={() => setAddMore(!addMore)}>
            <Ionicons name={addMore ? 'checkbox' : 'square-outline'} size={22} color={dir.color} />
            <Text style={styles.toggleT}>تسجيل شخص آخر فور الحفظ</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: dir.color }]} onPress={save}>
          <Text style={styles.saveT}>💾 {editItem ? 'تحديث البيانات' : 'حفظ النقوط'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingTop: 45, paddingBottom: 15, paddingHorizontal: 20, elevation: 5 },
  hT: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  form: { padding: 20, paddingBottom: 250 }, // البادينج ده هو سر حماية الكيبورد
  label: { fontSize: 14, fontWeight: 'bold', color: COLORS.text, textAlign: 'right', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#e0e0e0', elevation: 1 },
  floatingDropdown: { position: 'absolute', top: 85, left: 0, right: 0, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#1B5E20', maxHeight: 250, elevation: 15 },
  dropItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'flex-end' },
  dropName: { fontSize: 16, fontWeight: 'bold', color: '#1B5E20' },
  dropSub: { fontSize: 12, color: '#666', marginTop: 4 },
  quickRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', marginTop: 10 },
  qBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', margin: 4, borderWidth: 1, borderColor: '#ccc', elevation: 1 },
  qT: { fontSize: 14, color: '#444' },
  toggle: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 20 },
  toggleT: { marginRight: 8, fontSize: 14, color: COLORS.text, fontWeight: 'bold' },
  saveBtn: { borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 30, elevation: 4 },
  saveT: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default AddNuqootScreen;
