import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, StatusBar, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';

import db from './src/Database';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import EventsScreen from './src/screens/EventsScreen';
import EventDetailScreen from './src/screens/EventDetailScreen';
import PersonDetailScreen from './src/screens/PersonDetailScreen';
import SearchScreen from './src/screens/SearchScreen';
import ReportsScreen from './src/screens/ReportsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const checkSession = useCallback(async () => {
    try {
      await db.init();
      const userSetting = await db.getFirstAsync("SELECT value FROM settings WHERE key = 'currentUser'");
      if (userSetting && userSetting.value) {
        const user = JSON.parse(userSetting.value);
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (hasHardware && isEnrolled) {
          const authResult = await LocalAuthentication.authenticateAsync({
            promptMessage: 'تسجيل الدخول باستخدام البصمة',
            fallbackLabel: 'استخدام كلمة المرور',
            cancelLabel: 'إلغاء',
          });
          if (authResult.success) {
            setCurrentUser(user);
          }
        } else {
          setCurrentUser(user);
        }
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handleLogin = async (user) => {
    setCurrentUser(user);
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('currentUser', ?)",
      [JSON.stringify(user)]
    );
  };

  const handleLogout = async () => {
    Alert.alert('تسجيل الخروج', 'هل أنت تأكد من تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تأكيد',
        style: 'destructive',
        onPress: async () => {
          await db.runAsync("DELETE FROM settings WHERE key = 'currentUser'");
          setCurrentUser(null);
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1B5E20" />
        <Text style={styles.loadingText}>جاري تحميل دفتر النقوط Pro...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E20" translucent={false} />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#1B5E20' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
            headerTitleAlign: 'center',
          }}
        >
          {currentUser ? (
            <>
              <Stack.Screen
                name="Events"
                options={({ navigation }) => ({
                  title: 'دفتر النقوط Pro',
                  headerLeft: () => (
                    <TouchableOpacity onPress={handleLogout} style={styles.headerBtn}>
                      <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                  ),
                  headerRight: () => (
                    <View style={styles.headerRightContainer}>
                      <TouchableOpacity
                        onPress={() => navigation.navigate('Search')}
                        style={styles.headerBtn}
                      >
                        <Ionicons name="search-outline" size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => navigation.navigate('Reports')}
                        style={styles.headerBtn}
                      >
                        <Ionicons name="stats-chart-outline" size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ),
                })}
              >
                {(props) => <EventsScreen {...props} currentUser={currentUser} />}
              </Stack.Screen>

              <Stack.Screen
                name="EventDetail"
                component={EventDetailScreen}
                options={({ route }) => ({
                  title: route.params?.event?.name || 'تفاصيل المناسبة',
                })}
              />

              <Stack.Screen
                name="PersonDetail"
                component={PersonDetailScreen}
                options={({ route }) => ({
                  title: `كشف حساب: ${route.params?.personName || 'شخص'}`,
                })}
              />

              <Stack.Screen
                name="Search"
                component={SearchScreen}
                options={{ title: 'البحث الشامل والمجموعات' }}
              />

              <Stack.Screen
                name="Reports"
                component={ReportsScreen}
                options={{ title: 'التقارير والإحصائيات' }}
              />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" options={{ headerShown: false }}>
                {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
              </Stack.Screen>
              <Stack.Screen
                name="Register"
                options={{ title: 'إنشاء حساب جديد' }}
              >
                {(props) => <RegisterScreen {...props} onLogin={handleLogin} />}
              </Stack.Screen>
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#1B5E20',
    fontWeight: 'bold',
  },
  headerBtn: {
    padding: 6,
    marginHorizontal: 4,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
