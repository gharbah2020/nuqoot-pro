import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthService } from '../services/AuthService';
import { COLORS } from '../utils/theme';

const AuthScreen = ({ onAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      return Alert.alert('تنبيه', 'يرجى إدخال البريد الإلكتروني وكلمة المرور');
    }
    setLoading(true);
    const r = isLogin 
      ? await AuthService.login(email.trim(), password) 
      : await AuthService.register(email.trim(), password);
    setLoading(false);

    if (r.success) {
      onAuth(r.user);
    } else {
      Alert.alert('خطأ', r.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.logo}>
        <Text style={{ fontSize: 68 }}>📒</Text>
        <Text style={styles.title}>دفتر النقوط</Text>
        <Text style={styles.subtitle}>سجّل كل مناسباتك بدقة.. بدون نسيان</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.formTitle}>{isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}</Text>
        
        <View style={styles.inputBox}>
          <Ionicons name="mail-outline" size={20} color="#999" />
          <TextInput 
            style={styles.input} 
            value={email} 
            onChangeText={setEmail} 
            placeholder="البريد الإلكتروني" 
            keyboardType="email-address" 
            autoCapitalize="none" 
            textAlign="right" 
          />
        </View>

        <View style={styles.inputBox}>
          <Ionicons name="lock-closed-outline" size={20} color="#999" />
          <TextInput 
            style={styles.input} 
            value={password} 
            onChangeText={setPassword} 
            placeholder="كلمة المرور (6 أحرف على الأقل)" 
            secureTextEntry 
            textAlign="right" 
          />
        </View>

        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'جاري التحميل...' : isLogin ? 'دخول' : 'إنشاء الحساب'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switch}>
          <Text style={styles.switchText}>
            {isLogin ? 'ليس لديك حساب؟ أنشئ حساب جديد مجاناً' : 'لديك حساب بالفعل؟ سجّل دخولك'}
          </Text>
        </TouchableOpacity>

        <View style={styles.note}>
          <Text style={styles.noteText}>
            🔒 مجاني ومدى الحياة بدون قيود{'\n'}
            📱 يمكنك استرجاع بياناتك على أي هاتف في ثوانٍ
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: COLORS.primary },
  logo: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 30, fontWeight: 'bold', color: '#fff', marginTop: 8 },
  subtitle: { fontSize: 13, color: '#ffffffcc', marginTop: 4 },
  form: { backgroundColor: '#fff', borderRadius: 24, padding: 24, elevation: 8 },
  formTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: COLORS.text },
  inputBox: { 
    flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#f9f9f9', 
    borderRadius: 12, marginBottom: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#eee' 
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, marginRight: 10 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  switch: { alignItems: 'center', marginTop: 16 },
  switchText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  note: { backgroundColor: COLORS.incomingLight, borderRadius: 12, padding: 12, marginTop: 16 },
  noteText: { fontSize: 12, color: COLORS.incoming, textAlign: 'center', lineHeight: 18 },
});

export default AuthScreen;