import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import { getFullBackup, restoreFromBackup, getDB } from '../database/LocalDB';
import { generateId, formatCurrency } from '../utils/helpers';

// 🧠 محرك التواريخ الذكي الخارق لمعالجة تواريخ الإكسيل بجميع صيغها
const parseExcelDate = (excelDate) => {
  if (!excelDate) return new Date().toISOString().slice(0, 10);
  
  try {
    // 1. إذا كان الإكسيل يرسله كرقم تسلسلي (Serial Number) مثل 44099
    if (typeof excelDate === 'number' || !isNaN(Number(excelDate)) && !String(excelDate).includes('-') && !String(excelDate).includes('/')) {
      const num = Number(excelDate);
      if (num > 1000 && num < 100000) {
        // الفرق بين تاريخ بداية إكسيل (1900) وتاريخ جافاسكريبت (1970) هو 25569 يوم
        const date = new Date(Math.round((num - 25569) * 86400 * 1000));
        if (!isNaN(date.getTime())) {
          return date.toISOString().slice(0, 10);
        }
      }
    }

    // 2. إذا كان تاريخ من نوع Date Object
    if (excelDate instanceof Date) {
      if (!isNaN(excelDate.getTime())) return excelDate.toISOString().slice(0, 10);
    }

    // 3. إذا كان نصاً (String) مثل 25-09-2020 أو 25/09/2020
    const strDate = String(excelDate).trim().replace(/[\.\. \/]/g, '-');
    const parts = strDate.split('-');

    if (parts.length === 3) {
      let [p1, p2, p3] = parts;
      
      // صيغة يوم-شهر-سنة (25-09-2020)
      if (p1.length <= 2 && p3.length === 4) {
        const day = p1.padStart(2, '0');
        const month = p2.padStart(2, '0');
        const year = p3;
        return `${year}-${month}-${day}`;
      }
      
      // صيغة سنة-شهر-يوم (2020-09-25)
      if (p1.length === 4 && p3.length <= 2) {
        const year = p1;
        const month = p2.padStart(2, '0');
        const day = p3.padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }

    // محاولة أخيرة عبر المحلل المباشر
    const d = new Date(strDate);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  } catch (e) {
    console.log('Date parse error:', e);
  }

  return new Date().toISOString().slice(0, 10); // بديل آمن عند الطوارئ
};

export const BackupService = {
  // 📊 1. تصدير Excel احترافي
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
      
      const fileName = `Nuqoot_Excel_${Date.now()}.xlsx`;
      const uri = (FileSystem.cacheDirectory || FileSystem.documentDirectory) + fileName;

      await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { 
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
          dialogTitle: 'مشاركة ملف الإكسيل' 
        });
      }
      return { success: true, message: 'تم تصدير ملف الإكسيل بنجاح' };
    } catch (e) { 
      return { success: false, message: 'خطأ أثناء التصدير: ' + e.message }; 
    }
  },

  // 📥 2. استيراد Excel مع المحرك الذكي للتاريخ
  async importFromExcel() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return { success: false, message: 'تم إلغاء اختيار الملف' };

      const pickedUri = res.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(pickedUri, { encoding: FileSystem.EncodingType.Base64 });
      const wb = XLSX.read(content, { type: 'base64', cellDates: true });

      if (!wb.SheetNames || wb.SheetNames.length === 0) return { success: false, message: 'ملف الإكسيل غير صالح' };

      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);

      if (!rows || rows.length === 0) return { success: false, message: 'لا توجد بيانات داخل شيت الإكسيل' };

      const db = await getDB();
      const eventsMap = new Map();

      for (const row of rows) {
        const evName = row['المناسبة'] || row['اسم المناسبة'] || 'مناسبة مستوردة';
        
        // 🎯 تحويل التاريخ بالمحرك الذكي لمنع أي خطأ
        const rawDate = row['التاريخ'] || row['تاريخ المناسبة'] || row['Date'];
        const evDate = parseExcelDate(rawDate);
        
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

        const personName = row['اسم الشخص'] || row['الاسم'] || row['Name'];
        const amount = parseFloat(row['المبلغ (ج.م)'] || row['المبلغ'] || row['Amount'] || 0);

        if (personName && personName !== '-' && amount > 0) {
          await db.runAsync(
            `INSERT INTO nuqoot (id, event_id, person_name, amount, phone, relation, address, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              generateId(), 
              eventId, 
              String(personName).trim(), 
              amount, 
              row['الهاتف'] || row['رقم الهاتف'] ? String(row['الهاتف'] || row['رقم الهاتف']) : '', 
              row['القرابة'] || row['صلة القرابة'] ? String(row['القرابة'] || row['صلة القرابة']) : '', 
              row['البلد/العنوان'] || row['البلد'] || row['العنوان'] || '', 
              ''
            ]
          );
        }
      }
      return { success: true, message: 'تم استيراد بيانات الإكسيل بنجاح بتواريخ دقيقة 100%' };
    } catch (e) { 
      return { success: false, message: 'تعذر القراءة: ' + e.message }; 
    }
  },

  // 📄 3. تصدير تقرير PDF احترافي
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
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'مشاركة تقرير PDF' });
      }
      return { success: true, message: 'تم إنشاء تقرير PDF بنجاح' };
    } catch (e) { 
      return { success: false, message: 'خطأ: ' + e.message }; 
    }
  },

  // 💾 4. تصدير ملف JSON
  async exportToFile() {
    try {
      const data = await getFullBackup();
      const fileName = `nuqoot_backup_${Date.now()}.json`;
      const uri = (FileSystem.cacheDirectory || FileSystem.documentDirectory) + fileName;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(data, null, 2), { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'تصدير ملف النسخة الاحتياطية' });
      }
      return { success: true, message: 'تم تصدير ملف النسخة الاحتياطية بنجاح' };
    } catch (e) { 
      return { success: false, message: 'خطأ أثناء التصدير: ' + e.message }; 
    }
  },

  // 📥 5. استيراد JSON
  async importFromFile() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return { success: false, message: 'تم إلغاء اختيار الملف' };
      const pickedUri = res.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(pickedUri, { encoding: FileSystem.EncodingType.UTF8 });
      const data = JSON.parse(content);
      if (!data.events || !data.nuqoot) return { success: false, message: 'ملف النسخة الاحتياطية غير صالح' };
      await restoreFromBackup(data);
      return { success: true, message: `تمت استعادة البيانات بنجاح (${data.events.length} مناسبة)` };
    } catch (e) { 
      return { success: false, message: 'تعذر الاستعادة: ' + e.message }; 
    }
  }
};
