import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import { getFullBackup, restoreFromBackup, getDB } from '../database/LocalDB';
import { generateId, formatCurrency } from '../utils/helpers';

export const BackupService = {
  // 📊 1. تصدير Excel (.xlsx)
  async exportToExcel() {
    try {
      const data = await getFullBackup();
      const excelRows = [];

      for (const ev of data.events) {
        const nuqootList = data.nuqoot.filter(n => n.event_id === ev.id);
        const dirLabel = ev.direction === 'incoming' ? 'واردة (ليّا)' : 'صادرة (عليّا)';

        if (nuqootList.length === 0) {
          excelRows.push({
            'المناسبة': ev.name, 'النوع': ev.type, 'الاتجاه': dirLabel, 'التاريخ': ev.date,
            'اسم الشخص': '-', 'المبلغ (ج.م)': 0, 'البلد/العنوان': '-', 'الهاتف': '-', 'القرابة': '-'
          });
        } else {
          nuqootList.forEach(n => {
            excelRows.push({
              'المناسبة': ev.name, 'النوع': ev.type, 'الاتجاه': dirLabel, 'التاريخ': ev.date,
              'اسم الشخص': n.person_name, 'المبلغ (ج.م)': n.amount, 
              'البلد/العنوان': n.address || '-', 'الهاتف': n.phone || '-', 'القرابة': n.relation || '-'
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
        await Sharing.shareAsync(uri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'مشاركة ملف الإكسيل' });
      }
      return { success: true, message: 'تم التصدير بنجاح' };
    } catch (e) { return { success: false, message: 'خطأ: ' + e.message }; }
  },

  // 📥 2. استيراد Excel (.xlsx)
  async importFromExcel() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return { success: false, message: 'تم الإلغاء' };

      const content = await FileSystem.readAsStringAsync(res.assets[0].uri, { encoding: FileSystem.EncodingType.Base64 });
      const wb = XLSX.read(content, { type: 'base64' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);

      if (rows.length === 0) return { success: false, message: 'الملف فارغ' };

      const db = await getDB();
      const eventsMap = new Map();

      for (const row of rows) {
        const evName = row['المناسبة'] || row['اسم المناسبة'] || 'مناسبة مستوردة';
        const evDate = row['التاريخ'] || new Date().toISOString().slice(0, 10);
        const evDir = (row['الاتجاه'] || '').includes('صادرة') ? 'outgoing' : 'incoming';
        const evKey = `${evName}_${evDate}_${evDir}`;

        let eventId = eventsMap.get(evKey);
        if (!eventId) {
          eventId = generateId();
          eventsMap.set(evKey, eventId);
          await db.runAsync(
            `INSERT INTO events (id, name, type, date, direction, notes) VALUES (?, ?, ?, ?, ?, ?)`,
            [eventId, evName, 'other', evDate, evDir, 'مستورد من Excel']
          );
        }

        const personName = row['اسم الشخص'] || row['الاسم'];
        const amount = parseFloat(row['المبلغ (ج.م)'] || row['المبلغ'] || 0);

        if (personName && personName !== '-' && amount > 0) {
          await db.runAsync(
            `INSERT INTO nuqoot (id, event_id, person_name, amount, phone, relation, address, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [generateId(), eventId, personName, amount, row['الهاتف'] || '', row['القرابة'] || '', row['البلد/العنوان'] || row['البلد'] || '', '']
          );
        }
      }
      return { success: true, message: 'تم استيراد البيانات بنجاح' };
    } catch (e) { return { success: false, message: 'تعذر القراءة: ' + e.message }; }
  },

  // 📄 3. تصدير تقرير PDF
  async exportToPDF() {
    try {
      const data = await getFullBackup();
      let totalIn = 0, totalOut = 0;
      let html = `<html dir="rtl"><head><meta charset="utf-8"><style>body{font-family:sans-serif;padding:20px;text-align:right}h1{color:#1B5E20;text-align:center}.card{border:1px solid #ddd;padding:15px;margin-bottom:15px;border-radius:10px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #ddd;padding:8px}th{background:#E8F5E9;color:#1B5E20}</style></head><body><h1>دفتر النقوط - تقرير شامل</h1>`;

      for (const ev of data.events) {
        const ns = data.nuqoot.filter(n => n.event_id === ev.id);
        let sum = 0;
        html += `<div class="card"><h3>📌 ${ev.name} (${ev.date})</h3><table><tr><th>الاسم</th><th>البلد/العنوان</th><th>الهاتف</th><th>المبلغ</th></tr>`;
        ns.forEach(n => {
          sum += n.amount;
          html += `<tr><td><b>${n.person_name}</b></td><td>${n.address||'-'}</td><td>${n.phone||'-'}</td><td><b>${formatCurrency(n.amount)}</b></td></tr>`;
        });
        html += `</table><h4>إجمالي المناسبة: ${formatCurrency(sum)} ج.م</h4></div>`;
        if (ev.direction === 'incoming') totalIn += sum; else totalOut += sum;
      }
      html += `<div style="background:#1B5E20;color:#fff;padding:15px;border-radius:10px;text-align:center"><h3>إجمالي الوارد: ${formatCurrency(totalIn)} | إجمالي الصادر: ${formatCurrency(totalOut)}</h3><h2>الصافي: ${formatCurrency(totalIn - totalOut)} ج.م</h2></div></body></html>`;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
  },

  // 💾 4. تصدير ملف JSON (النسخ الاحتياطي)
  async exportToFile() {
    try {
      const data = await getFullBackup();
      const uri = FileSystem.documentDirectory + `nuqoot_backup_${new Date().toISOString().slice(0, 10)}.json`;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(data), { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
      return { success: true, message: 'تم التصدير بنجاح' };
    } catch (e) { return { success: false, message: e.message }; }
  },

  // 📥 5. استيراد JSON (استعادة النسخة الاحتياطية)
  async importFromFile() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return { success: false, message: 'تم الإلغاء' };
      const content = await FileSystem.readAsStringAsync(res.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
      await restoreFromBackup(JSON.parse(content));
      return { success: true, message: `تمت الاستعادة بنجاح` };
    } catch (e) { return { success: false, message: e.message }; }
  }
};
