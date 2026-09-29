import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackupService } from '../services/BackupService';
import { AuthService } from '../services/AuthService';
import { COLORS } from '../utils/theme';

const SettingsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);

  const handleExportJSON = async () => {
    setLoading(true);
    const res = await BackupService.exportToFile();
    setLoading(false);
    if (!res.success) Alert.alert('خطأ', res.message);
  };

  const handleImportJSON = async () => {
    Alert.alert('استعادة نسخة احتياطية', 'هل ترغب في استبدال البيانات الحالية بالبيانات الموجودة داخل الملف المحدد؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'متابعة واستعادة',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          const res = await BackupService.importFromFile();
          setLoading(false);
          Alert.alert(res.success ? 'نجاح ✅' : 'خطأ', res.message);
        }
      }
    ]);
  };

  const handleExportText = async () => {
    setLoading(true);
    await BackupService.exportAsText();
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>النسخ الاحتياطي والإعدادات</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 10, color: COLORS.text }}>جاري معالجة البيانات...</Text>
        </View>
      )}

      <ScrollView style={{ padding: 16 }}>
        <Text style={styles.secT}>💾 حفظ واسترجاع البيانات محلياً</Text>
        
        <TouchableOpacity style={styles.btn} onPress={handleExportJSON}>
          <Ionicons name="share-social" size={22} color={COLORS.success} />
          <Text style={styles.btnText}>تصدير نسخة احتياطية شاملة (ملف JSON)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={handleImportJSON}>
          <Ionicons name="document-attach" size={22} color={COLORS.warning} />
          <Text style={styles.btnText}>استيراد نسخة احتياطية من ملف سابق</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={handleExportText}>
          <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
          <Text style={styles.btnText}>تصدير تقرير نصي ومشاركته على واتساب</Text>
        </TouchableOpacity>

        <Text style={styles.secT}>🔒 الحساب والأمان</Text>
        <TouchableOpacity 
          style={[styles.btn, { borderColor: COLORS.error, borderWidth: 1 }]} 
          onPress={() => AuthService.logout()}
        >
          <Ionicons name="log-out" size={22} color={COLORS.error} />
          <Text style={[styles.btnText, { color: COLORS.error }]}>تسجيل الخروج من الحساب</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    backgroundColor: COLORS.primary, flexDirection: 'row-reverse', 
    justifyContent: 'space-between', alignItems: 'center', 
    paddingTop: 45, paddingBottom: 15, paddingHorizontal: 16 
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  secT: { fontSize: 13, fontWeight: 'bold', color: COLORS.textSecondary, marginVertical: 10, textAlign: 'right' },
  btn: { 
    backgroundColor: '#fff', flexDirection: 'row-reverse', alignItems: 'center', 
    padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 
  },
  btnText: { marginRight: 12, fontSize: 14, fontWeight: '600', color: COLORS.text },
  loader: { 
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, 
    backgroundColor: 'rgba(255,255,255,0.85)', zIndex: 99, justifyContent: 'center', alignItems: 'center' 
  }
});

export default SettingsScreen;