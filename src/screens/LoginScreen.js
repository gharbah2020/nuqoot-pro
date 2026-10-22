import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import db from '../Database';

export default function LoginScreen({ navigation, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLoginSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('تنبيه', 'الرجاء إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    try {
      const user = await db.getFirstAsync(
        'SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND password = ?',
        [email.trim(), password]
      );

      if (user) {
        onLogin(user);
      } else {
        Alert.alert('خطأ', 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ أثناء تسجيل الدخول: ' + error.message);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('تنبيه', 'البصمة غير متوفرة أو غير مفعلة في جهازك');
        return;
      }

      const userSetting = await db.getFirstAsync("SELECT value FROM settings WHERE key = 'currentUser'");
      if (!userSetting || !userSetting.value) {
        Alert.alert('تنبيه', 'يجب تسجيل الدخول بكلمة المرور لمرة واحدة أولاً لربط البصمة');
        return;
      }

      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'تأكيد البصمة للدخول',
        fallbackLabel: 'كلمة المرور',
        cancelLabel: 'إلغاء',
      });

      if (authResult.success) {
        const user = JSON.parse(userSetting.value);
        onLogin(user);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشلت المصادقة بالبصمة: ' + error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.logoContainer}>
          <Ionicons name="wallet-outline" size={80} color="#1B5E20" />
          <Text style={styles.title}>دفتر النقوط Pro</Text>
          <Text style={styles.subtitle}>إدارة المناسبات والنقوط الذكية</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>البريد الإلكتروني</Text>
          <TextInput
            style={styles.input}
            placeholder="example@domain.com"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>كلمة المرور</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.submitBtn} onPress={handleLoginSubmit}>
            <Text style={styles.submitBtnText}>تسجيل الدخول</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometricLogin}>
            <Ionicons name="finger-print-outline" size={24} color="#1B5E20" />
            <Text style={styles.biometricBtnText}>الدخول ببصمة الاصبع</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerText}>
              ليس لديك حساب؟ <Text style={styles.registerTextBold}>إنشاء حساب جديد</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F5F5F5',
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  form: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    textAlign: 'right',
  },
  submitBtn: {
    backgroundColor: '#1B5E20',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1B5E20',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    backgroundColor: '#E8F5E9',
  },
  biometricBtnText: {
    color: '#1B5E20',
    fontSize: 15,
    fontWeight: 'bold',
    marginRight: 8,
  },
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: '#666',
  },
  registerTextBold: {
    color: '#1B5E20',
    fontWeight: 'bold',
  },
});
