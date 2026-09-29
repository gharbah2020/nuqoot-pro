import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getFullBackup, restoreFromBackup } from '../database/LocalDB';
import { formatDate, formatCurrency } from '../utils/helpers';

export const BackupService = {
  // تصدير كملف JSON
  async exportToFile() {
    try {
      const data = await getFullBackup();
      const json = JSON.stringify(data, null, 2);
      const name = `nuqoot_backup_${new Date().toISOString().slice(0, 10)}.json`;
      const uri = FileSystem.documentDirectory + name;

      await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { 
          mimeType: 'application/json', 
          dialogTitle: 'حفظ نسخة احتياطية من دفتر النقوط' 
        });
      }
      return { success: true, message: 'تم استخراج ملف النسخة الاحتياطية بنجاح' };
    } catch (e) { 
      return { success: false, message: e.message }; 
    }
  },

  // استيراد من ملف JSON
  async importFromFile() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ 
        type: 'application/json', 
        copyToCacheDirectory: true 
      });

      if (res.canceled || !res.assets?.[0]) {
        return { success: false, message: 'تم إلغاء العملية' };
      }

      const content = await FileSystem.readAsStringAsync(res.assets[0].uri, { 
        encoding: FileSystem.EncodingType.UTF8 
      });
      const data = JSON.parse(content);

      if (!data.events || !data.nuqoot) {
        return { success: false, message: 'هذا الملف غير متوافق مع دفتر النقوط' };
      }

      await restoreFromBackup(data);
      return { 
        success: true, 
        message: `تمت الاستعادة بنجاح! (${data.events.length} مناسبة - ${data.nuqoot.length} شخص)` 
      };
    } catch (e) { 
      return { success: false, message: 'تعذر قراءة الملف: ' + e.message }; 
    }
  },

  // تصدير تقرير نصي للواتساب
  async exportAsText() {
    try {
      const data = await getFullBackup();
      let t = '═══════════════════════════════\n';
      t += '      📒 دفتر النقوط - تقرير شامل\n';
      t += `      📅 ${new Date().toLocaleDateString('ar-EG')}\n`;
      t += '═══════════════════════════════\n\n';

      let tIn = 0, tOut = 0;

      for (const ev of data.events) {
        const dir = ev.direction === 'incoming' ? '📥 نقوط واردة (ليّا)' : '📤 نقوط صادرة (عليّا)';
        t += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        t += `📌 ${ev.name}\n`;
        t += `النوع: ${ev.type} | التاريخ: ${ev.date}\n`;
        t += `الاتجاه: ${dir}\n`;
        if (ev.location) t += `المكان: ${ev.location}\n`;

        const ns = data.nuqoot.filter(n => n.event_id === ev.id);
        let sum = 0;
        ns.forEach((n, i) => {
          t += `  ${i + 1}. ${n.person_name} ➔ ${formatCurrency(n.amount)} ج.م`;
          if (n.relation) t += ` (${n.relation})`;
          if (n.phone) t += ` 📱${n.phone}`;
          t += '\n';
          sum += n.amount;
        });

        t += `💰 إجمالي المناسبة: ${formatCurrency(sum)} ج.م\n\n`;
        if (ev.direction === 'incoming') tIn += sum; else tOut += sum;
      }

      t += '═══════════════════════════════\n';
      t += `📥 إجمالي الوارد (ليّا): ${formatCurrency(tIn)} ج.م\n`;
      t += `📤 إجمالي الصادر (عليّا): ${formatCurrency(tOut)} ج.م\n`;
      t += `⚖️ صافي الرصيد: ${formatCurrency(tIn - tOut)} ج.م\n`;
      t += '═══════════════════════════════\n';

      const uri = FileSystem.documentDirectory + `nuqoot_report_${new Date().toISOString().slice(0, 10)}.txt`;
      await FileSystem.writeAsStringAsync(uri, t, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
      return { success: true, message: 'تم إنشاء التقرير بنجاح' };
    } catch (e) { 
      return { success: false, message: e.message }; 
    }
  }
};