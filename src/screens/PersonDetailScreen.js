import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import db from '../Database';
import BackupService from '../services/BackupService';

export default function PersonDetailScreen({ route, navigation }) {
  const { personName } = route.params;
  const [history, setHistory] = useState([]);
  const [totals, setTotals] = useState({ given: 0, received: 0, balance: 0 });

  const loadPersonData = async () => {
    try {
      const records = await db.getAllAsync(
        `SELECT r.*, e.name as event_name 
         FROM records r 
         JOIN events e ON r.event_id = e.id 
         WHERE LOWER(r.person_name) = LOWER(?)
         ORDER BY r.date DESC`,
        [personName]
      );

      let given = 0;
      let received = 0;
      records.forEach((r) => {
        if (r.type === 'give') given += r.amount;
        else received += r.amount;
      });

      setHistory(records);
      setTotals({ given, received, balance: received - given });
    } catch (error) {
      console.error('Error loading person detail:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPersonData();
    }, [personName])
  );

  const generatePDFReport = async () => {
    try {
      const html = `
        <html dir="rtl">
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; direction: rtl; }
              h2 { color: #1B5E20; text-align: center; }
              .summary { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #ddd; padding: 10px; text-align: right; }
              th { background-color: #1B5E20; color: white; }
            </style>
          </head>
          <body>
            <h2>كشف حساب: ${personName}</h2>
            <div class="summary">
              <p><strong>مجموع له (مدفوع):</strong> ${totals.given} د.أ</p>
              <p><strong>مجموع عليه (مقبوض):</strong> ${totals.received} د.أ</p>
              <p><strong>الصافي:</strong> ${totals.balance} د.أ</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>المناسبة</th>
                  <th>المبلغ</th>
                  <th>النوع</th>
                  <th>التاريخ</th>
                  <th>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                ${history
                  .map(
                    (r) => `
                  <tr>
                    <td>${r.event_name}</td>
                    <td>${r.amount} د.أ</td>
                    <td>${r.type === 'give' ? 'له' : 'عليه'}</td>
                    <td>${r.date}</td>
                    <td>${r.note || ''}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;
      await BackupService.exportToPDF(html);
    } catch (error) {
      Alert.alert('خطأ', 'فشل إنشاء تقرير PDF: ' + error.message);
    }
  };

  const renderHistoryItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.eventName}>{item.event_name}</Text>
        <Text
          style={[
            styles.amountText,
            { color: item.type === 'give' ? '#D32F2F' : '#2E7D32' },
          ]}
        >
          {item.type === 'give' ? 'له: ' : 'عليه: '}
          {item.amount.toLocaleString()} د.أ
        </Text>
      </View>
      {item.note ? <Text style={styles.noteText}>{item.note}</Text> : null}
      <Text style={styles.dateText}>{item.date}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>ملخص الحساب</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>له (دفعت)</Text>
            <Text style={[styles.statValue, { color: '#D32F2F' }]}>
              {totals.given.toLocaleString()} د.أ
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>عليه (قبضت)</Text>
            <Text style={[styles.statValue, { color: '#2E7D32' }]}>
              {totals.received.toLocaleString()} د.أ
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.pdfBtn} onPress={generatePDFReport}>
          <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
          <Text style={styles.pdfBtnText}>مشاركة كشف حساب (PDF)</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderHistoryItem}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
    textAlign: 'center',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B5E20',
    paddingVertical: 10,
    borderRadius: 8,
  },
  pdfBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  amountText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  noteText: {
    marginTop: 4,
    fontSize: 13,
    color: '#666',
    textAlign: 'right',
  },
  dateText: {
    marginTop: 6,
    fontSize: 11,
    color: '#888',
    textAlign: 'left',
  },
});
