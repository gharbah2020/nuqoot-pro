import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import db from '../Database';

export const parseExcelDate = (val) => {
  if (!val) return new Date().toISOString().split('T')[0];
  if (typeof val === 'number') {
    try {
      const dateObj = XLSX.SSF.parse_date_code(val);
      if (dateObj) {
        const y = dateObj.y;
        const m = String(dateObj.m).padStart(2, '0');
        const d = String(dateObj.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch (e) { return String(val); }
  }
  return String(val).trim();
};

const BackupService = {
  exportToExcel: async (data, fileName = `nuqoot_${Date.now()}.xlsx`) => {
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data");
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const uri = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error("Excel Export Error:", error);
      throw error;
    }
  },

  exportFullBackup: async () => {
    try {
      const events = await db.getAllAsync('SELECT * FROM events');
      const records = await db.getAllAsync('SELECT * FROM records');
      const backupData = JSON.stringify({ events, records });
      const uri = FileSystem.documentDirectory + 'nuqoot_backup.json';
      await FileSystem.writeAsStringAsync(uri, backupData);
      await Sharing.shareAsync(uri);
    } catch (error) {
      alert("فشل التصدير: " + error.message);
    }
  },

  importFullBackup: async (onSuccess) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (!result.canceled) {
        const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
        const data = JSON.parse(content);
        await db.withTransactionAsync(async () => {
          for (const event of data.events) {
            await db.runAsync('INSERT OR REPLACE INTO events (id, name, date, budget, icon) VALUES (?, ?, ?, ?, ?)', 
              [event.id, event.name, event.date, event.budget, event.icon]);
          }
          for (const record of data.records) {
            await db.runAsync('INSERT OR REPLACE INTO records (id, event_id, person_name, amount, type, date, note) VALUES (?, ?, ?, ?, ?, ?, ?)', 
              [record.id, record.event_id, record.person_name, record.amount, record.type, record.date, record.note]);
          }
        });
        if (onSuccess) onSuccess();
        alert("تم استعادة البيانات بنجاح");
      }
    } catch (error) {
      alert("فشل الاستيراد: " + error.message);
    }
  }
};

export default BackupService;
