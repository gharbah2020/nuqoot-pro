import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import { getFullBackup, restoreFromBackup, getDB } from '../database/LocalDB';
import { generateId, formatCurrency, formatDate } from '../utils/helpers';

export const BackupService = {
  // 📊 1. تصدير البيانات إلى ملف Excel (.xlsx) بكل التفاصيل
  async exportToExcel() {
    try {
      const data = await getFullBackup();
      const excelRows = [];

      for (const ev of data.events) {
        const nuqootList = data.nuqoot.filter(n => n.event_id === ev.id);
        const dirLabel = ev.direction === 'incoming' ? 'واردة (ليّا)' : 'صادرة (عليّا)';

        if (nuqootList.length === 0) {
          excelRows.push({
            'اسم المناسبة': ev.name,
            'نوع المناسبة': ev.type,
            'اتجاه النقوط': dirLabel,
            'التاريخ': ev.date,
            'البلد / المكان': ev.location || 'غير محدد',
            'اسم الشخص': '-',
            'صلة القرابة': '-',
            'رقم الهاتف': '-',
            'المبلغ (ج.م)': 0,
            'ملاحظات': ev.notes || ''
          });
        } else {
          nuqootList.forEach(n => {
            excelRows.push({
              'اسم المناسبة': ev.name,
              'نوع المناسبة': ev.type,
              'اتجاه النقوط': dirLabel,
              'التاريخ': ev.date,
              'البلد / المكان': ev.location || 'غير محدد',
              'اسم الشخص': n.person_name,
              'صلة القرابة': n.relation || '-',
              'رقم الهاتف': n.phone || '-',
              'المبلغ (ج.م)': n.amount,
              'ملاحظات': n.notes || ''
            });
          });
        }
      }

      const ws = XLSX.utils.json_to_sheet(excelRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "دفتر النقوط");

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const fileName = `Nuqoot_Excel_${new Date().toISOString().slice(0, 10)}.xlsx`;
      const uri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'تصدير جدول النقوط Excel'
        });
      }
      return { success: true, message: 'تم تصدير ملف Excel بنجاح' };
    } catch (e) {
      return { success: false, message: 'خطأ أثناء التصدير: ' + e.message };
    }
  },

  // 📥 2. استيراد البيانات من ملف Excel (.xlsx)
  async importFromExcel() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true
      });

      if (res.canceled || !res.assets?.[0]) {
        return { success: false, message: 'تم إلغاء الاختيار' };
      }

      const content = await FileSystem.readAsStringAsync(res.assets[0].uri, {
        encoding: FileSystem.EncodingType.Base64
      });

      const wb = XLSX.read(content, { type: 'base64' });
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];
      const rows = XLSX.utils.sheet_to_json(ws);

      if (rows.length === 0) {
        return { success: false, message: 'ملف Excel فارغ' };
      }

      const db = await getDB();
      const eventsMap = new Map();

      for (const row of rows) {
        const evName = row['اسم المناسبة'] || row['المناسبة'] || 'مناسبة مستوردة';
        const evDate = row['التاريخ'] || new Date().toISOString().slice(0, 10);
        const evDir = (row['اتجاه النقوط'] || '').includes('صادرة') ? 'outgoing' : 'incoming';
        const evLoc = row['البلد / المكان'] || row['المكان'] || '';
        const evKey = `${evName}_${evDate}_${evDir}`;

        let eventId = eventsMap.get(evKey);
        if (!eventId) {
          eventId = generateId();
          eventsMap.set(evKey, eventId);
          await db.runAsync(
            `INSERT INTO events (id, name, type, date, direction, location, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [eventId, evName, 'other', evDate, evDir, evLoc, 'مستورد من Excel']
          );
        }

        const personName = row['اسم الشخص'] || row['الاسم'];
        const amount = parseFloat(row['المبلغ (ج.م)'] || row['المبلغ'] || 0);

        if (personName && personName !== '-' && amount > 0) {
          await db.runAsync(
            `INSERT INTO nuqoot (id, event_id, person_name, amount, phone, relation, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [generateId(), eventId, personName, amount, row['رقم الهاتف'] || '', row['صلة القرابة'] || '', row['ملاحظات'] || '']
          );
        }
      }

      return { success: true, message: 'تم استيراد البيانات من Excel بنجاح' };
    } catch (e) {
      return { success: false, message: 'تعذر قراءة ملف Excel: ' + e.message };
    }
  },

  // 📄 3. تصدير تقرير PDF احترافي وجاهز لإرساله عبر الواتساب
  async exportToPDF() {
    try {
      const data = await getFullBackup();
      let totalIn = 0, totalOut = 0;

      let htmlContent = `
        <html dir="rtl">
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; background-color: #f9f9f9; text-align: right; }
            h1 { color: #1B5E20; text-align: center; font-size: 24px; margin-bottom: 5px; }
            .subtitle { text-align: center; color: #666; font-size: 14px; margin-bottom: 20px; }
            .card { background: #fff; border-radius: 10px; padding: 15px; margin-bottom: 15px; border: 1px solid #ddd; }
            .event-header { font-size: 16px; font-weight: bold; color: #1B5E20; border-bottom: 2px solid #1B5E20; padding-bottom: 5px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #e0e0e0; padding: 8px; text-align: right; font-size: 12px; }
            th { background-color: #E8F5E9; color: #1B5E20; font-weight: bold; }
            .total-box { background: #1B5E20; color: #fff; padding: 15px; border-radius: 10px; margin-top: 20px; text-align: center; }
          </style>
        </head>
        <body>
          <h1>📒 دفتر النقوط - تقرير شامل</h1>
          <div class="subtitle">تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</div>
      `;

      for (const ev of data.events) {
        const nuqootList = data.nuqoot.filter(n => n.event_id === ev.id);
        let evTotal = 0;
        const dirLabel = ev.direction === 'incoming' ? '📥 نقوط واردة (ليّا)' : '📤 نقوط صادرة (عليّا)';

        htmlContent += `
          <div class="card">
            <div class="event-header">📌 ${ev.name} (${dirLabel})</div>
            <div>📅 التاريخ: ${ev.date} ${ev.location ? ` | 📍 المكان: ${ev.location}` : ''}</div>
            <table>
              <thead>
                <tr>
                  <th>م</th>
                  <th>اسم الشخص</th>
                  <th>صلة القرابة</th>
                  <th>الهاتف</th>
                  <th>المبلغ</th>
                </tr>
              </thead>
              <tbody>
        `;

        nuqootList.forEach((n, idx) => {
          evTotal += n.amount;
          htmlContent += `
            <tr>
              <td>${idx + 1}</td>
              <td><b>${n.person_name}</b></td>
              <td>${n.relation || '-'}</td>
              <td>${n.phone || '-'}</td>
              <td><b>${formatCurrency(n.amount)} ج.م</b></td>
            </tr>
          `;
        });

        htmlContent += `
              </tbody>
            </table>
            <div style="margin-top: 8px; font-weight: bold; color: #333;">إجمالي المناسبة: ${formatCurrency(evTotal)} ج.م</div>
          </div>
        `;

        if (ev.direction === 'incoming') totalIn += evTotal;
        else totalOut += evTotal;
      }

      htmlContent += `
        <div class="total-box">
          <h3>⚖️ ملخص الحساب الكلي</h3>
          <p>📥 إجمالي الوارد (ليّا): ${formatCurrency(totalIn)} ج.م</p>
          <p>📤 إجمالي الصادر (عليّا): ${formatCurrency(totalOut)} ج.م</p>
          <h2>صافي الرصيد: ${formatCurrency(totalIn - totalOut)} ج.م</h2>
        </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'مشاركة التقرير عبر الواتساب'
        });
      }
      return { success: true, message: 'تم إنشاء تقرير PDF بنجاح' };
    } catch (e) {
      return { success: false, message: 'خطأ أثناء إنشاء PDF: ' + e.message };
    }
  },

  // 📄 4. تصدير وتمرير كملف JSON
  async exportToFile() {
    try {
      const data = await getFullBackup();
      const json = JSON.stringify(data, null, 2);
      const name = `nuqoot_backup_${new Date().toISOString().slice(0, 10)}.json`;
      const uri = FileSystem.documentDirectory + name;
      await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
      return { success: true, message: 'تم تصدير ملف النسخة الاحتياطية' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  // 📥 5. استيراد JSON
  async importFromFile() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return { success: false, message: 'تم الإلغاء' };
      const content = await FileSystem.readAsStringAsync(res.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
      const data = JSON.parse(content);
      if (!data.events || !data.nuqoot) return { success: false, message: 'ملف غير صالح' };
      await restoreFromBackup(data);
      return { success: true, message: `تم استعادة البيانات بنجاح` };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }
};