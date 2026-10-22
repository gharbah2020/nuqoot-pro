import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import db from '../Database';
import BackupService from '../services/BackupService';

export default function ReportsScreen() {
  const [stats, setStats] = useState({
    totalGiven: 0,
    totalReceived: 0,
    eventsCount: 0,
    recordsCount: 0,
  });

  const loadStats = async () => {
    try {
      const eventsCountRow = await db.getFirstAsync('SELECT COUNT(*) as cnt FROM events');
      const recordsCountRow = await db.getFirstAsync('SELECT COUNT(*) as cnt FROM records');
      const totalsRow = await db.getFirstAsync(`
        SELECT 
          SUM(CASE WHEN type = 'give' THEN amount ELSE 0 END) as total_given,
          SUM(CASE WHEN type = 'receive' THEN amount ELSE 0 END) as total_received
        FROM records
      `);

      setStats({
        eventsCount: eventsCountRow?.cnt || 0,
        recordsCount: recordsCountRow?.cnt || 0,
        totalGiven: totalsRow?.total_given || 0,
        totalReceived: totalsRow?.total_received || 0,
      });
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const exportAllExcel = async () => {
    try {
      const records = await db.getAllAsync(`
        SELECT r.person_name, r.amount, r.type, r.date, r.note, e.name as event_name
        FROM records r
        JOIN events e ON r.event_id = e.id
        ORDER BY r.date DESC
      `);
      const data = records.map((r) => ({
        'المناسبة': r.event_name,
        'اسم الشخص': r.person_name,
        'المبلغ': r.amount,
        'النوع': r.type === 'give' ? 'له' : 'عليه',
        'التاريخ': r.date,
        'ملاحظات': r.note || '',
      }));
      await BackupService.exportToExcel(data, 'تقرير_النقوط_الشامل.xlsx');
    } catch (error) {
      Alert.alert('خطأ', 'فشل تصدير التقرير: ' + error.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>الإحصائيات العامة</Text>

        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Ionicons name="calendar-outline" size={28} color="#1B5E20" />
            <Text style={styles.gridValue}>{stats.eventsCount}</Text>
            <Text style={styles.gridLabel}>المناسبات</Text>
          </View>

          <View style={styles.gridItem}>
            <Ionicons name="list-outline" size={28} color="#1B5E20" />
            <Text style={styles.gridValue}>{stats.recordsCount}</Text>
            <Text style={styles.gridLabel}>الحركات</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>الملخص المالي</Text>

        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>إجمالي له (مدفوع):</Text>
          <Text style={[styles.financialValue, { color: '#D32F2F' }]}>
            {stats.totalGiven.toLocaleString()} د.أ
          </Text>
        </View>

        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>إجمالي عليه (مقبوض):</Text>
          <Text style={[styles.financialValue, { color: '#2E7D32' }]}>
            {stats.totalReceived.toLocaleString()} د.أ
          </Text>
        </View>

        <View style={[styles.financialRow, { borderTopWidth: 1, borderColor: '#EEE', paddingTop: 8 }]}>
          <Text style={styles.financialLabel}>الصافي الإجمالي:</Text>
          <Text style={[styles.financialValue, { color: '#1976D2' }]}>
            {(stats.totalReceived - stats.totalGiven).toLocaleString()} د.أ
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.exportBtn} onPress={exportAllExcel}>
        <Ionicons name="download-outline" size={20} color="#FFFFFF" />
        <Text style={styles.exportBtnText}>تصدير التقرير الشامل (Excel)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 16,
    textAlign: 'right',
  },
  grid: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
  },
  gridItem: {
    alignItems: 'center',
  },
  gridValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  gridLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  financialRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  financialLabel: {
    fontSize: 15,
    color: '#444',
  },
  financialValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B5E20',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
