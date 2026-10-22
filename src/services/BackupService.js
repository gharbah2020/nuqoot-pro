import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';

// غيّر المسار حسب مكان ملف قاعدة البيانات عندك
// جرب واحد من التاليين حسب هيكل مشروعك:
import db from '../Database';
// import db from '../../Database';
// import db from '../database/Database';

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

const BackupService = {
  exportToExcel: async (data, fileName = `nuqoot_${Date.now()}.xlsx`) => {
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Records');
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const uri = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(uri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
      return uri;
    } catch (e) {
      console.error(e);
      alert('فشل تصدير الإكسل');
    }
  },

  exportToPDF: async (html) => {
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
      return uri;
    } catch (e) {
      console.error(e);
      alert('فشل إنشاء PDF');
    }
  },

  exportFullBackup: async () => {
    try {
      const events = await db.getAllAsync('SELECT * FROM events');
      const records = await db.getAllAsync('SELECT * FROM records');
      const backup = JSON.stringify({ events, records, version: '1.3.0' }, null, 2);
      const uri = FileSystem.cacheDirectory + `nuqoot_backup_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(uri, backup);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (e) {
      console.error(e);
      alert('فشل النسخ الاحتياطي');
    }
  },

  importFullBackup: async (onSuccess) => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (res.canceled || !res.assets?.[0]) return;

      const content = await FileSystem.readAsStringAsync(res.assets[0].uri);
      const data = JSON.parse(content);

      await db.withTransactionAsync(async () => {
        if (data.events) {
          for (const e of data.events) {
            await db.runAsync(
              'INSERT OR REPLACE INTO events (id, name, date, location) VALUES (?, ?, ?, ?)',
              [e.id, e.name, e.date, e.location || '']
            );
          }
        }
        if (data.records) {
          for (const r of data.records) {
            await db.runAsync(
              'INSERT OR REPLACE INTO records (id, eventId, personName, amount, type, note, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [r.id, r.eventId, r.personName, r.amount, r.type, r.note || '', r.date]
            );
          }
        }
      });

      if (onSuccess) onSuccess();
      alert('تمت الاستعادة بنجاح');
    } catch (e) {
      console.error(e);
      alert('فشل استعادة النسخة');
    }
  },
};

export default BackupService;
export { BackupService };
