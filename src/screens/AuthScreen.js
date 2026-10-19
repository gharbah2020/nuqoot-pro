import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, SafeAreaView, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LocalDB from '../database/LocalDB';

export default function AuthScreen({ navigation }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    try {
      if (isLogin) {
        // Login Logic
        const user = await LocalDB.loginUser(email.trim().toLowerCase(), password);
        if (user) {
          navigation.replace('Home');
        } else {
          Alert.alert('خطأ', 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
        }
      } else {
        // Register Logic
        const result = await LocalDB.registerUser(email.trim().toLowerCase(), password);
        if (result.success) {
          Alert.alert('نجاح', 'تم إنشاء الحساب بنجاح!');
          navigation.replace('Home');
        } else {
          Alert.alert('خطأ', result.message);
        }
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ في النظام');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />
      <View style={styles.headerBox}>
        <MaterialCommunityIcons name="shield-lock-outline" size={80} color="#FFF" />
        <Text style={styles.appTitle}>دفتر النقوط Pro</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>{isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}</Text>

        <TextInput
          style={styles.input}
          placeholder="البريد الإلكتروني"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="كلمة المرور"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.authBtn} onPress={handleAuth}>
          <Text style={styles.authBtnText}>{isLogin ? 'دخول' : 'تسجيل'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchBtn}>
          <Text style={styles.switchBtnText}>
            {isLogin ? 'ليس لديك حساب؟ أنشئ حساباً جديداً' : 'لديك حساب بالفعل؟ سجل دخولك'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1B5E20' },
  headerBox: { alignItems: 'center', marginTop: 60, marginBottom: 40 },
  appTitle: { fontSize: 26, fontWeight: 'bold', color: '#FFF', marginTop: 10 },
  formContainer: { flex: 1, backgroundColor: '#F4F6F8', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, elevation: 10 },
  formTitle: { fontSize: 22, fontWeight: 'bold', color: '#1B5E20', textAlign: 'center', marginBottom: 30 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDD', borderRadius: 10, padding: 15, fontSize: 16, marginBottom: 15, textAlign: 'right' },
  authBtn: { backgroundColor: '#1B5E20', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10, elevation: 2 },
  authBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  switchBtn: { marginTop: 20, alignItems: 'center' },
  switchBtnText: { color: '#0288D1', fontSize: 15, fontWeight: 'bold' }
});
