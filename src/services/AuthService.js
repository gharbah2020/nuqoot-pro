import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from '../config/firebase';

export const AuthService = {
  async register(email, password) {
    try {
      const c = await createUserWithEmailAndPassword(auth, email, password);
      return { success: true, user: c.user };
    } catch (e) {
      let m = 'حدث خطأ أثناء إنشاء الحساب';
      if (e.code === 'auth/email-already-in-use') m = 'البريد مسجل مسبقاً';
      if (e.code === 'auth/weak-password') m = 'كلمة المرور ضعيفة (6 أحرف على الأقل)';
      return { success: false, message: m };
    }
  },
  async login(email, password) {
    try {
      const c = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: c.user };
    } catch (e) {
      let m = 'بيانات الدخول غير صحيحة';
      if (e.code === 'auth/user-not-found') m = 'الحساب غير مسجل';
      if (e.code === 'auth/wrong-password') m = 'كلمة المرور خاطئة';
      return { success: false, message: m };
    }
  },
  async logout() { 
    try {
      await signOut(auth);
    } catch (e) {
      console.log(e);
    }
  },
  onAuthChange(cb) { 
    return onAuthStateChanged(auth, cb); 
  }
};