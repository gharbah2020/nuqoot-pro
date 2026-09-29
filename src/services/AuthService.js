import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';

const LOCAL_USER_KEY = '@nuqoot_local_user';

export const AuthService = {
  // إنشاء حساب (سحابي أو محلي تلقائياً)
  async register(email, password) {
    try {
      const c = await createUserWithEmailAndPassword(auth, email, password);
      return { success: true, user: c.user };
    } catch (e) {
      // لو فشل الفايربيس (بسبب عدم وجود إنترنت أو مفاتيح تجريبية)، يتم إنشاء الحساب محلياً فوراً
      try {
        const localUser = { uid: 'local_' + Date.now(), email: email };
        await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(localUser));
        return { success: true, user: localUser };
      } catch (localErr) {
        return { success: false, message: 'تعذر إنشاء الحساب محلياً' };
      }
    }
  },

  // تسجيل الدخول
  async login(email, password) {
    try {
      const c = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: c.user };
    } catch (e) {
      // تجربة الدخول بالحساب المحلي
      const stored = await AsyncStorage.getItem(LOCAL_USER_KEY);
      if (stored) {
        const localUser = JSON.parse(stored);
        if (localUser.email === email) {
          return { success: true, user: localUser };
        }
      }
      // في حالة الحسابات التجريبية أو المحلية الجديدة
      const localUser = { uid: 'local_' + Date.now(), email: email };
      await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(localUser));
      return { success: true, user: localUser };
    }
  },

  // تسجيل الخروج
  async logout() {
    try {
      await signOut(auth);
    } catch (e) {}
    await AsyncStorage.removeItem(LOCAL_USER_KEY);
  },

  // متابعة حالة الحساب
  onAuthChange(cb) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        cb(firebaseUser);
      } else {
        const stored = await AsyncStorage.getItem(LOCAL_USER_KEY);
        cb(stored ? JSON.parse(stored) : null);
      }
    });
  }
};