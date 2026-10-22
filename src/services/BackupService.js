import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import db from '../Database';   // تأكد من المسار الصحيح لقاعدة البيانات لديك

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

export const BackupService = {
  exportToExcel: async (data, fileName = `nuqoot_export_${Date.now()}.xlsx`) => {
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
        await Sharing.shareAsync(uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'تصدير إكسل',
        });
      }
      return uri;
    } catch (error) {
      console.error('Excel Export Error:', error);
      throw error;
    }
  },

  exportToPDF: async (htmlContent, fileName = `nuqoot_report_${Date.now()}.pdf`) => {
    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'مشاركة تقرير PDF',
        });
      }
      return uri;
    } catch (error) {
      console.error('PDF Export Error:', error);
      throw error;
    }
  },

  exportFullBackup: async () => {
    try {
      const events = await db.getAllAsync('SELECT * FROM events');
      const records = await db.getAllAsync('SELECT * FROM records');
      const users = await db.getAllAsync('SELECT * FROM users').catch(() => []);
      const settings = await db.getAllAsync('SELECT * FROM settings').catch(() => []);

      const backupData = {
        version: '1.3.0',
        createdAt: new Date().toISOString(),
        events,
        records,
        users,
        settings,
      };

      const uri = FileSystem.cacheDirectory + `nuqoot_backup_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(backupData, null, 2));
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/json',
          dialogTitle: 'نسخة احتياطية كاملة',
        });
      }
      return uri;
    } catch (error) {
      console.error('Full Backup Error:', error);
      throw error;
    }
  },

  importFullBackup: async (onSuccess) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return false;
      }

      const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const data = JSON.parse(content);

      await db.withTransactionAsync(async () => {
        if (Array.isArray(data.events)) {
          for (const event of data.events) {
            await db.runAsync(
              `INSERT OR REPLACE INTO events (id, name, date, location, createdAt) 
               VALUES (?, ?, ?, ?, ?)`,
              [event.id, event.name, event.date, event.location || '', event.createdAt || new Date().toISOString()]
            );
          }
        }

        if (Array.isArray(data.records)) {
          for (const record of data.records) {
            await db.runAsync(
              `INSERT OR REPLACE INTO records 
               (id, eventId, personName, amount, type, note, date) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                record.id,
                record.eventId,
                record.personName,
                record.amount,
                record.type,
                record.note || '',
                record.date,
              ]
            );
          }
        }
      });

      if (typeof onSuccess === 'function') {
        onSuccess();
      }
      return true;
    } catch (error) {
      console.error('Import Backup Error:', error);
      throw error;
    }
  },
};

export default BackupService;
