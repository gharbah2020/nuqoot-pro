import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as FileSystemStandard from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import LocalDB from '../database/LocalDB';

// ==========================================
// Safe Universal FileSystem Helper Functions
// ==========================================

const safeGetDir = () => {
  return (
    FileSystemLegacy.documentDirectory ||
    FileSystemLegacy.cacheDirectory ||
    FileSystemStandard.documentDirectory ||
    FileSystemStandard.cacheDirectory
  );
};

const safeWriteFile = async (fileUri, contents, options = {}) => {
  try {
    if (FileSystemLegacy && typeof FileSystemLegacy.writeAsStringAsync === 'function') {
      return await FileSystemLegacy.writeAsStringAsync(fileUri, contents, options);
    }
    if (FileSystemStandard && typeof FileSystemStandard.writeAsStringAsync === 'function') {
      return await FileSystemStandard.writeAsStringAsync(fileUri, contents, options);
    }
    throw new Error('لا توجد دالة كتابة ملفات متوافقة في النظام');
  } catch (err) {
    console.error('safeWriteFile Error:', err);
    throw err;
  }
};

const safeReadFile = async (fileUri, options = {}) => {
  try {
    if (FileSystemLegacy && typeof FileSystemLegacy.readAsStringAsync === 'function') {
      return await FileSystemLegacy.readAsStringAsync(fileUri, options);
    }
    if (FileSystemStandard && typeof FileSystemStandard.readAsStringAsync === 'function') {
      return await FileSystemStandard.readAsStringAsync(fileUri, options);
    }
    throw new Error('لا توجد دالة قراءة ملفات متوافقة في النظام');
  } catch (err) {
    console.error('safeReadFile Error:', err);
    throw err;
  }
};

const safeDeleteFile = async (fileUri) => {
  try {
    if (FileSystemLegacy && typeof FileSystemLegacy.deleteAsync === 'function') {
      return await FileSystemLegacy.deleteAsync(fileUri, { idempotent: true });
    }
    if (FileSystemStandard && typeof FileSystemStandard.deleteAsync === 'function') {
      return await FileSystemStandard.deleteAsync(fileUri, { idempotent: true });
    }
  } catch (e) {
    console.log('Delete file skipped:', e.message);
  }
};

// Parse Excel numeric serial dates or string formats safely
const parseExcelDate = (val) => {
  if (!val) {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  // Handle Excel Serial Number (e.g. 44099 -> 2020-09-25)
  if (typeof val === 'number' || (!isNaN(val) && !String(val).includes('-') && !String(val).includes('/'))) {
    const serial = parseFloat(val);
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400 * 1000;
    const dateObj = new Date(utcValue);
    if (!isNaN(dateObj.getTime())) {
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  const str = String(val).trim();

  // YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str)) {
    const parts = str.split(/[-/]/);
    const yyyy = parts[0];
    const mm = String(parts[1]).padStart(2, '0');
    const dd = String(parts[2]).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(str)) {
    const parts = str.split(/[-/]/);
    const dd = String(parts[0]).padStart(2, '0');
    const mm = String(parts[1]).padStart(2, '0');
    const yyyy = parts[2];
    return `${yyyy}-${mm}-${dd}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const today = new Date();
  return today.toISOString().split('T')[0];
};

class BackupService {
  /**
   * 1. Export records to Excel (.xlsx) file
   */
  static async exportToExcel() {
    try {
      const records = await LocalDB.getAllRecords();

      if (!records || records.length === 0) {
        throw new Error('لا توجد بيانات نقوط للتصدير');
      }

      const excelData = records.map((r, idx) => ({
        'م': idx + 1,
        'اسم الشخص': r.person_name || '',
        'المبلغ': r.amount || 0,
        'نوع النقوط': r.type === 'given' ? 'له (نقوط مقتطع/معطى)' : 'عليه (نقوط مقبوض/واصل)',
        'اسم المناسبة': r.event_name || 'عام',
        'التاريخ': r.date || '',
        'العنوان / السكن': r.address || '',
        'رقم الهاتف': r.phone || '',
        'صلة القرابة': r.relationship || '',
        'ملاحظات': r.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'النقوط');

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const filename = `Nuqoot_Export_${Date.now()}.xlsx`;
      const fileUri = safeGetDir() + filename;

      await safeWriteFile(fileUri, wbout, { encoding: 'base64' });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'تصدير جدول النقوط إلى Excel',
          UTI: 'com.microsoft.excel.xlsx'
        });
      }

      return { success: true, count: records.length };
    } catch (error) {
      console.error('Error in exportToExcel:', error);
      throw error;
    }
  }

  /**
   * 2. Import records from Excel file (.xlsx or .xls)
   */
  static async importFromExcel() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'application/octet-stream'
        ],
        copyToCacheDirectory: true
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { success: false, cancelled: true };
      }

      const file = result.assets[0];
      const base64Str = await safeReadFile(file.uri, { encoding: 'base64' });
      const workbook = XLSX.read(base64Str, { type: 'base64', cellDates: false });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rows || rows.length === 0) {
        throw new Error('ملف Excel فارغ أو لا يحتوي على أعمدة متوافقة');
      }

      const existingEvents = await LocalDB.getAllEvents();
      const eventsMap = new Map();
      existingEvents.forEach(e => eventsMap.set(e.name.trim(), e.id));

      let importedCount = 0;

      for (const row of rows) {
        const personName =
          row['اسم الشخص'] ||
          row['الاسم'] ||
          row['Name'] ||
          row['Person Name'] ||
          '';

        if (!personName.trim()) continue;

        const amount = parseFloat(
          row['المبلغ'] || row['Amount'] || row['نقوط'] || 0
        );

        let type = 'given';
        const rawType = String(
          row['نوع النقوط'] || row['النوع'] || row['Type'] || ''
        ).trim();
        if (rawType.includes('عليه') || rawType.includes('مقبوض') || rawType.includes('received')) {
          type = 'received';
        }

        const eventName =
          String(
            row['اسم المناسبة'] || row['المناسبة'] || row['Event'] || 'مناسبة عامة'
          ).trim();

        let eventId = eventsMap.get(eventName);
        if (!eventId) {
          eventId = await LocalDB.addEvent({
            name: eventName,
            date: new Date().toISOString().split('T')[0],
            notes: 'تم إنشاؤها تلقائياً أثناء استيراد Excel'
          });
          eventsMap.set(eventName, eventId);
        }

        const rawDate = row['التاريخ'] || row['Date'] || '';
        const parsedDate = parseExcelDate(rawDate);

        const phone = String(row['رقم الهاتف'] || row['الهاتف'] || row['Phone'] || '').trim();
        const address = String(row['العنوان / السكن'] || row['العنوان'] || row['Address'] || '').trim();
        const relationship = String(row['صلة القرابة'] || row['القرابة'] || row['Relation'] || '').trim();
        const notes = String(row['ملاحظات'] || row['Notes'] || '').trim();

        await LocalDB.addRecord({
          event_id: eventId,
          person_name: personName.trim(),
          amount: isNaN(amount) ? 0 : amount,
          type: type,
          date: parsedDate,
          phone: phone,
          address: address,
          relationship: relationship,
          notes: notes
        });

        importedCount++;
      }

      return { success: true, count: importedCount };
    } catch (error) {
      console.error('Error in importFromExcel:', error);
      throw error;
    }
  }

  /**
   * 3. Export JSON Full Backup
   */
  static async exportBackup() {
    try {
      const events = await LocalDB.getAllEvents();
      const records = await LocalDB.getAllRecords();

      const backupData = {
        version: '1.3.0',
        exportedAt: new Date().toISOString(),
        eventsCount: events.length,
        recordsCount: records.length,
        events: events,
        records: records
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const filename = `NuqootPro_Backup_${Date.now()}.json`;
      const fileUri = safeGetDir() + filename;

      await safeWriteFile(fileUri, jsonStr, { encoding: 'utf8' });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'مشاركة ملف النسخة الاحتياطية (JSON)',
          UTI: 'public.json'
        });
      }

      return { success: true, eventsCount: events.length, recordsCount: records.length };
    } catch (error) {
      console.error('Error in exportBackup:', error);
      throw error;
    }
  }

  /**
   * 4. Import JSON Full Backup
   */
  static async importBackup() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', '*/*'],
        copyToCacheDirectory: true
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { success: false, cancelled: true };
      }

      const file = result.assets[0];
      const jsonStr = await safeReadFile(file.uri, { encoding: 'utf8' });
      const backupData = JSON.parse(jsonStr);

      if (!backupData || !Array.isArray(backupData.records)) {
        throw new Error('تنسيق ملف النسخة الاحتياطية غير صحيح أو تالف');
      }

      const eventsMap = new Map();

      if (Array.isArray(backupData.events)) {
        for (const ev of backupData.events) {
          const newId = await LocalDB.addEvent({
            name: ev.name,
            date: ev.date || new Date().toISOString().split('T')[0],
            notes: ev.notes || ''
          });
          eventsMap.set(ev.id, newId);
        }
      }

      let importedCount = 0;
      for (const rec of backupData.records) {
        let eventId = eventsMap.get(rec.event_id);
        if (!eventId) {
          const defaultEventId = await LocalDB.addEvent({
            name: rec.event_name || 'مناسبة مستوردة',
            date: rec.date || new Date().toISOString().split('T')[0],
            notes: 'تمت إضافتها من النسخة الاحتياطية'
          });
          eventsMap.set(rec.event_id, defaultEventId);
          eventId = defaultEventId;
        }

        await LocalDB.addRecord({
          event_id: eventId,
          person_name: rec.person_name,
          amount: rec.amount,
          type: rec.type,
          date: parseExcelDate(rec.date),
          phone: rec.phone || '',
          address: rec.address || '',
          relationship: rec.relationship || '',
          notes: rec.notes || ''
        });

        importedCount++;
      }

      return { success: true, count: importedCount };
    } catch (error) {
      console.error('Error in importBackup:', error);
      throw error;
    }
  }

  /**
   * 5. Generate Professional PDF Report for WhatsApp & Printing
   */
  static async generatePdfReport(eventName = 'تقرير النقوط العام', recordsList = null) {
    try {
      const records = recordsList || await LocalDB.getAllRecords();

      if (!records || records.length === 0) {
        throw new Error('لا توجد سجلات لإنشاء التقرير');
      }

      let totalGiven = 0;
      let totalReceived = 0;

      records.forEach(r => {
        if (r.type === 'given') totalGiven += Number(r.amount || 0);
        else totalReceived += Number(r.amount || 0);
      });

      const netBalance = totalReceived - totalGiven;

      const rowsHtml = records.map((r, index) => `
        <tr style="background-color: ${index % 2 === 0 ? '#FFFFFF' : '#F9FBF9'};">
          <td style="padding: 10px; border: 1px solid #DDD; text-align: center;">${index + 1}</td>
          <td style="padding: 10px; border: 1px solid #DDD; font-weight: bold; color: #1B5E20;">${r.person_name}</td>
          <td style="padding: 10px; border: 1px solid #DDD; text-align: center; font-weight: bold; color: ${r.type === 'given' ? '#C62828' : '#2E7D32'};">
            ${Number(r.amount).toLocaleString('ar-EG')}
          </td>
          <td style="padding: 10px; border: 1px solid #DDD; text-align: center;">
            ${r.type === 'given' ? '<span style="color:#C62828; font-weight:bold;">له (مقتطع)</span>' : '<span style="color:#2E7D32; font-weight:bold;">عليه (واصل)</span>'}
          </td>
          <td style="padding: 10px; border: 1px solid #DDD; text-align: center;">${r.event_name || '-'}</td>
          <td style="padding: 10px; border: 1px solid #DDD; text-align: center;">${r.date || '-'}</td>
          <td style="padding: 10px; border: 1px solid #DDD; text-align: center;">${r.phone || '-'}</td>
          <td style="padding: 10px; border: 1px solid #DDD; text-align: center;">${r.relationship || '-'}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #1B5E20; padding-bottom: 15px; }
            .header h1 { color: #1B5E20; margin: 0 0 5px 0; font-size: 26px; }
            .header p { color: #666; margin: 0; font-size: 14px; }
            .stats-container { display: flex; justify-content: space-between; margin-bottom: 25px; background: #F1F8E9; padding: 15px; border-radius: 8px; border: 1px solid #DCEDC8; }
            .stat-box { text-align: center; flex: 1; }
            .stat-title { font-size: 13px; color: #555; margin-bottom: 5px; }
            .stat-value { font-size: 18px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #1B5E20; color: white; padding: 12px; border: 1px solid #1B5E20; font-size: 14px; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #EEE; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>دفتر النقوط - ${eventName}</h1>
            <p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')} - إجمالي السجلات: ${records.length}</p>
          </div>

          <div class="stats-container">
            <div class="stat-box">
              <div class="stat-title">إجمالي النقوط المعطاة (له)</div>
              <div class="stat-value" style="color: #C62828;">${totalGiven.toLocaleString('ar-EG')}</div>
            </div>
            <div class="stat-box">
              <div class="stat-title">إجمالي النقوط المقبوضة (عليه)</div>
              <div class="stat-value" style="color: #2E7D32;">${totalReceived.toLocaleString('ar-EG')}</div>
            </div>
            <div class="stat-box">
              <div class="stat-title">الرصيد الصافي</div>
              <div class="stat-value" style="color: ${netBalance >= 0 ? '#1B5E20' : '#C62828'};">${netBalance.toLocaleString('ar-EG')}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>م</th>
                <th>اسم الشخص</th>
                <th>المبلغ</th>
                <th>النوع</th>
                <th>المناسبة</th>
                <th>التاريخ</th>
                <th>الهاتف</th>
                <th>الصلة</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            تم استخراج هذا التقرير تلقائياً بواسطة تطبيق (دفتر النقوط Pro)
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'مشاركة تقرير النقوط PDF عبر واتساب',
          UTI: 'com.adobe.pdf'
        });
      }

      return { success: true, uri };
    } catch (error) {
      console.error('Error in generatePdfReport:', error);
      throw error;
    }
  }
}

export default BackupService;
