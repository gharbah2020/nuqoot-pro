import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import db from './Database';
import * as XLSX from 'xlsx';

export const parseExcelDate = (val) => {
  if (!val) return new Date().toISOString().split('T')[0];
  if (typeof val === 'number') {
    const dateObj = XLSX.SSF.parse_date_code(val);
    if (dateObj) {
      const y = dateObj.y;
      const m = String(dateObj.m).padStart(2, '0');
      const d = String(dateObj.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  return String(val).trim();
};

export const StorageHelpers = {
  exportToExcel: async (data, fileName) => {
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Records");
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const uri = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error("Excel Export Error:", error);
      alert("حدث خطأ أثناء تصدير ملف الإكسل");
    }
  },

  exportToPDF: async (htmlContent) => {
    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("حدث خطأ أثناء إنشاء ملف PDF");
    }
  },

  exportBackup: async () => {
    try {
      const allEvents = await db.getAllAsync('SELECT * FROM events');
      const allRecords = await db.getAllAsync('SELECT * FROM records');
      const backupData = JSON.stringify({ events: allEvents, records: allRecords }, null, 2);
      const uri = FileSystem.cacheDirectory + `nuqoot_backup_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(uri, backupData);
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error("Backup Export Error:", error);
      alert("فشل إنشاء النسخة الاحتياطية");
    }
  },

  importBackup: async (onSuccess) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
        const data = JSON.parse(content);
        
        await db.withTransactionAsync(async () => {
          if (data.events && Array.isArray(data.events)) {
            for (const event of data.events) {
              await db.runAsync(
                'INSERT OR REPLACE INTO events (id, name, date, location) VALUES (?, ?, ?, ?)', 
                [event.id, event.name, event.date, event.location || '']
              );
            }
          }
          if (data.records && Array.isArray(data.records)) {
            for (const record of data.records) {
              await db.runAsync(
                'INSERT OR REPLACE INTO records (id, eventId, personName, amount, type, note, date) VALUES (?, ?, ?, ?, ?, ?, ?)', 
                [record.id, record.eventId, record.personName, record.amount, record.type, record.note || '', record.date]
              );
            }
          }
        });
        if (onSuccess) onSuccess();
        alert("تمت استعادة البيانات بنجاح");
      }
    } catch (error) {
      console.error("Backup Import Error:", error);
      alert("فشل استعادة البيانات. تأكد من اختيار ملف صحيح.");
    }
  }
};
