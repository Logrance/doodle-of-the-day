import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { auth, db } from '../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

async function registerForPushNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

  const user = auth.currentUser;
  if (user && token) {
    await updateDoc(doc(db, 'users', user.uid), { expoPushToken: token });
  }
}

export function usePushToken() {
  useEffect(() => {
    registerForPushNotifications().catch(() => {});
  }, []);
}
