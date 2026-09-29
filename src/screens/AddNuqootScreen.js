import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { insertNuqoot } from '../database/LocalDB';
import { generateId, getDirectionInfo } from '../utils/helpers';
import { RELATIONS, QUICK_AMOUNTS } from '../config/constants';
import { COLORS } from '../utils/theme';

const AddNuqootScreen = ({ route, navigation }) => {
  const { eventId, direction } = route.params;
  const dir = getDirectionInfo(direction);
  
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState(''); // حقل العنوان الجديد
  const [relation, setRelation] = useState('');
  const [notes, setNotes] = useState('');
  const [showRel, setShowRel] = useState(false);
  const [addMore, setAddMore] = useState(true);

  const save = async () => {
    if (!name.trim()) return Alert.alert('تنبيه', 'يرجى إدخال اسم الشخص');
    if (!amount || parseFloat(amount) <= 0) return Alert.alert('تنبيه', 'يرجى إدخال المبلغ');

    await insertNuqoot({
      id: generateId(),
      event_id: eventId,
      person_name: name.trim(),
      amount: parseFloat(amount),
      phone: phone.trim(),
      address: address.trim(), // إرسال العنوان لقاعدة البيانات
      relation,
      notes: notes.trim()
    });

    if (addMore) {
      Alert.alert('نجاح ✅', `تم تسجيل مبلغ ${amount} ج.م لـ (${name})`);
      setName('');
      setAmount('');
      setPhone('');
      setAddress('');
      setRelation('');
      setNotes('');
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: dir.color }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.hT}>
          {direction === 'incoming' ? 'تسجيل نقوط واردة (ليّا)' : 'تسجيل نقوط صادرة (عليّا)'}
        </Text>
        <TouchableOpacity onPress={save}>
          <Ionicons name="checkmark" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>اسم الشخص *</Text>
        <TextInput 
          style={styles.input} 
          value={name} 
          onChangeText={setName} 
          placeholder="مثال: الحاج إبراهيم الشرقاوي" 
          textAlign="right" 
          autoFocus 
        />

        <Text style={styles.label}>المبلغ بالجنيه *</Text>
        <TextInput 
          style={[styles.input, { fontSize: 26, fontWeight: 'bold', textAlign: 'center' }]} 
          value={amount} 
          onChangeText={setAmount} 
          placeholder="0" 
          keyboardType="numeric" 
        />

        <View style={styles.quickRow}>
          {QUICK_AMOUNTS.map(q => (
            <TouchableOpacity 
              key={q} 
              style={[styles.qBtn, amount === q.toString() && { backgroundColor: dir.color + '20', borderColor: dir.color }]} 
              onPress={() => setAmount(q.toString())}
            >
              <Text style={[styles.qT, amount === q.toString() && { color: dir.color, fontWeight: 'bold' }]}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>صلة القرابة / المعرفة</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowRel(!showRel)}>
          <Text style={{ color: relation ? COLORS.text : '#aaa', textAlign: 'right' }}>
            {relation || 'اضغط لاختيار صلة القرابة'}
          </Text>
        </TouchableOpacity>

        {showRel && (
          <View style={styles.relGrid}>
            {RELATIONS.map(r => (
              <TouchableOpacity 
                key={r} 
                style={[styles.relBtn, relation === r && { backgroundColor: dir.color + '20', borderColor: dir.color }]} 
                onPress={() => { setRelation(r); setShowRel(false); }}
              >
                <Text style={{ fontSize: 12, color: relation === r ? dir.color : '#555' }}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* حقل البلد / العنوان الجديد */}
        <Text style={styles.label}>البلد / العنوان (اختياري)</Text>
        <TextInput 
          style={styles.input} 
          value={address} 
          onChangeText={setAddress} 
          placeholder="مثال: القاهرة / قرية كذا" 
          textAlign="right" 
        />

        <Text style={styles.label}>رقم الهاتف (اختياري)</Text>
        <TextInput 
          style={styles.input} 
          value={phone} 
          onChangeText={setPhone} 
          placeholder="01xxxxxxxxx" 
          keyboardType="phone-pad" 
          textAlign="right" 
        />

        <Text style={styles.label}>ملاحظات (اختياري)</Text>
        <TextInput 
          style={[styles.input, { height: 60 }]} 
          value={notes} 
          onChangeText={setNotes} 
          placeholder="أي تفاصيل خاصة..." 
          textAlign="right" 
          multiline 
        />

        <TouchableOpacity style={styles.toggle} onPress={() => setAddMore(!addMore)}>
          <Ionicons name={addMore ? 'checkbox' : 'square-outline'} size={22} color={dir.color} />
          <Text style={styles.toggleT}>تسجيل شخص آخر فور الحفظ</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: dir.color }]} onPress={save}>
          <Text style={styles.saveT}>💾 حفظ النقوط</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', 
    paddingTop: 45, paddingBottom: 15, paddingHorizontal: 20 
  },
  hT: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  form: { padding: 16 },
  label: { fontSize: 13, fontWeight: 'bold', color: COLORS.text, textAlign: 'right', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#e0e0e0' },
  quickRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', marginTop: 8 },
  qBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#fff', margin: 3, borderWidth: 1, borderColor: '#ddd' },
  qT: { fontSize: 12, color: '#666' },
  relGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', marginTop: 8 },
  relBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: '#fff', margin: 3, borderWidth: 1, borderColor: '#ddd' },
  toggle: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 14 },
  toggleT: { marginRight: 8, fontSize: 13, color: COLORS.text },
  saveBtn: { borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 18 },
  saveT: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default AddNuqootScreen;