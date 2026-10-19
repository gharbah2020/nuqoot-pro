import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BackupService from '../services/BackupService';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0;

export default function BackupScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

  const executeTask = async (msg, taskFn) => {
    try {
      setLoading(true);
      setLoadingMsg(msg);
      await taskFn();
    } catch (error) {
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء العملية');
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  const handleExportExcel = () => {
    executeTask('جاري تصدير جدول النقوط إلى Excel...', async () => {
      const res = await BackupService.exportToExcel();
      if (res && res.success) {
        Alert.alert('نجاح 🎯', `تم تصدير ${res.count} سجل نقوط بنجاح إلى ملف Excel.`);
      }
    });
  };

  const handleImportExcel = () => {
    executeTask('جاري قراءة واستيراد ملف Excel...', async () => {
      const res = await BackupService.importFromExcel();
      if (res && res.success) {
        Alert.alert('نجاح 🎯', `تم استيراد ${res.count} سجل نقوط بنجاح.`);
      } else if (res && res.cancelled) {
        // user cancelled
      }
    });
  };

  const handleExportBackup = () => {
    executeTask('جاري إنتاج النسخة الاحتياطية...', async () => {
      const res = await BackupService.exportBackup();
      if (res && res.success) {
        Alert.alert('نجاح 🎯', 'تم إنشاء النسخة الاحتياطية وتجهيزها للمشاركة بنجاح.');
      }
    });
  };

  const handleImportBackup = () => {
    executeTask('جاري استرجاع النسخة الاحتياطية...', async () => {
      const res = await BackupService.importBackup();
      if (res && res.success) {
        Alert.alert('نجاح 🎯', `تم استرجاع النسخة الاحتياطية وإضافة ${res.count} سجل بنجاح.`);
      }
    });
  };

  const handleGeneratePdf = () => {
    executeTask('جاري إنشاء تقرير PDF الاحترافي...', async () => {
      const res = await BackupService.generatePdfReport('تقرير النقوط العام 📜');
      if (res && res.success) {
        Alert.alert('نجاح 🎯', 'تم إنشاء تقرير PDF وتجهيزه للمشاركة عبر واتساب.');
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />

      {/* Header with Safe Top Padding */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>النسخ الاحتياطي والتقارير الاحترافية</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#1B5E20" />
            <Text style={styles.loadingText}>{loadingMsg}</Text>
          </View>
        )}

        {/* Excel Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="file-excel-box" size={26} color="#1D6F42" />
            <Text style={styles.sectionTitle}>تصدير واستيراد Excel</Text>
          </View>
          <Text style={styles.sectionDesc}>
            يمكنك تصدير كافة بيانات وسجلات النقوط إلى ملف اكسيل (.xlsx) أو استيراد بيانات سابقة بسرعة فائقة.
          </Text>

          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#1D6F42' }]} onPress={handleExportExcel}>
            <MaterialCommunityIcons name="file-export" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>تصدير جدول النقوط كملف Excel (.xlsx)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.outlinedBtn, { borderColor: '#1D6F42' }]} onPress={handleImportExcel}>
            <MaterialCommunityIcons name="file-import" size={20} color="#1D6F42" />
            <Text style={[styles.actionBtnText, { color: '#1D6F42' }]}>استيراد سجلات نقوط من ملف Excel</Text>
          </TouchableOpacity>
        </View>

        {/* PDF Reports Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="file-pdf-box" size={26} color="#D32F2F" />
            <Text style={styles.sectionTitle}>التقارير الطباعية (PDF)</Text>
          </View>
          <Text style={styles.sectionDesc}>
            إنشاء تقارير طباعية أنيقة جاهزة للمشاركة والمناقلة عبر تطبيق الواتساب أو الطباعة المباشرة.
          </Text>

          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#D32F2F' }]} onPress={handleGeneratePdf}>
            <Ionicons name="share-social-outline" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>إنشاء ومشاركة تقرير PDF كشف كامل</Text>
          </TouchableOpacity>
        </View>

        {/* JSON Full System Backup Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="cloud-sync" size={26} color="#0288D1" />
            <Text style={styles.sectionTitle}>النسخة الاحتياطية الشاملة (JSON)</Text>
          </View>
          <Text style={styles.sectionDesc}>
            حفظ نسخة احتياطية كاملة من المناسبات والسجلات لاستعادتها في أي وقت أو نقلها لهاتف آخر.
          </Text>

          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0288D1' }]} onPress={handleExportBackup}>
            <Ionicons name="cloud-upload-outline" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>إنشاء ملف نسخة احتياطية (Backup)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.outlinedBtn, { borderColor: '#0288D1' }]} onPress={handleImportBackup}>
            <Ionicons name="cloud-download-outline" size={20} color="#0288D1" />
            <Text style={[styles.actionBtnText, { color: '#0288D1' }]}>استرجاع بيانات من نسخة احتياطية</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  header: {
    backgroundColor: '#1B5E20',
    paddingTop: STATUSBAR_HEIGHT + 8,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: 'bold', flex: 1, textAlign: 'center' },

  scrollContent: { padding: 16 },

  loadingBox: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2
  },
  loadingText: { fontSize: 13, color: '#1B5E20', fontWeight: 'bold', marginTop: 8 },

  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 2
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  sectionDesc: { fontSize: 12, color: '#666', marginBottom: 14, lineHeight: 18, textAlign: 'right' },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 10
  },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  outlinedBtn: { backgroundColor: 'transparent', borderWidth: 1 }
});
