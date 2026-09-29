import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackupService } from '../services/BackupService';
import { AuthService } from '../services/AuthService';
import { COLORS } from '../utils/theme';

const SettingsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);

  const handleExcelExport = async () => {
    setLoading(true);
    const res = await BackupService.exportToExcel();
    setLoading(false);
    if (!res.success) Alert.alert('خطأ', res.message);
  };

  const handleExcelImport = async () => {
    Alert.alert('تنبيه استيراد Excel', 'سيتم دمج البيانات الموجودة بملف Excel مع دفتر النقوط الحالي، هل تريد المتابعة؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'متابعة واستيراد',
        onPress: async () => {
          setLoading(true);
          const res = await BackupService.importFromExcel();
          setLoading(false);
          Alert.alert(res.success ? 'نجاح ✅' : 'خطأ', res.message);
        }
      }
    ]);
  };

  const handlePDFExport = async () => {
    setLoading(true);
    const res = await BackupService.exportToPDF();
    setLoading(false);
    if (!res.success) Alert.alert('خطأ', res.message);
  };

  const handleJSONExport = async () => {
    setLoading(true);
    const res = await BackupService.exportToFile();
    setLoading(false);
  };

  const handleJSONImport = async () => {
    setLoading(true);
    const res = await BackupService.importFromFile();
    setLoading(false);
    if (res.success) Alert.alert('نجاح ✅', res.message);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>النسخ الاحتياطي والتقارير الاحترافية</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 10, color: COLORS.text, fontWeight: 'bold' }}>جاري التجهيز والمعالجة...</Text>
        </View>
      )}

      <ScrollView style={{ padding: 16 }}>
        <Text style={styles.secT}>📊 تصدير واستيراد Excel</Text>
        
        <TouchableOpacity style={styles.btn} onPress={handleExcelExport}>
          <Ionicons name="stats-chart" size={22} color="#1D6F42" />
          <Text style={styles.btnText}>تصدير جدول النقوط كملف Excel (.xlsx)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={handleExcelImport}>
          <Ionicons name="cloud-upload-outline" size={22} color="#1D6F42" />
          <Text style={styles.btnText}>استيراد نقوط جديدة من ملف Excel</Text>
        </TouchableOpacity>

        <Text style={styles.secT}>📄 تقارير PDF والواتساب</Text>

        <TouchableOpacity style={styles.btn} onPress={handlePDFExport}>
          <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
          <Text style={styles.btnText}>إنشاء تقرير PDF ومشاركته عبر الواتساب</Text>
        </TouchableOpacity>

        <Text style={styles.secT}>💾 النسخ الاحتياطي الشامل (النظام)</Text>

        <TouchableOpacity style={styles.btn} onPress={handleJSONExport}>
          <Ionicons name="share-social" size={22} color={COLORS.primary} />
          <Text style={styles.btnText}>تصدير ملف النسخة الاحتياطية (JSON)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={handleJSONImport}>
          <Ionicons name="document-attach" size={22} color={COLORS.warning} />
          <Text style={styles.btnText}>استعادة نسخة احتياطية سابقة</Text>
        </TouchableOpacity>

        <Text style={styles.secT}>🔒 الحساب والأمان</Text>
        <TouchableOpacity 
          style={[styles.btn, { borderColor: COLORS.error, borderWidth: 1 }]} 
          onPress={() => AuthService.logout()}
        >
          <Ionicons name="log-out" size={22} color={COLORS.error} />
          <Text style={[styles.btnText, { color: COLORS.error }]}>تسجيل الخروج من الحساب</Text>
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
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
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secT: { fontSize: 13, fontWeight: 'bold', color: COLORS.textSecondary, marginVertical: 10, textAlign: 'right' },
  btn: { 
    backgroundColor: '#fff', flexDirection: 'row-reverse', alignItems: 'center', 
    padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 
  },
  btnText: { marginRight: 12, fontSize: 14, fontWeight: '600', color: COLORS.text },
  loader: { 
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, 
    backgroundColor: 'rgba(255,255,255,0.9)', zIndex: 99, justifyContent: 'center', alignItems: 'center' 
  }
});

export default SettingsScreen;