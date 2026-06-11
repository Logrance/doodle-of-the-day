import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { auth, getCallableFunction } from '../firebaseConfig';

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
    // Claim the token via callable so any other user docs that previously
    // held this token (other accounts on the same device) get cleared in
    // the same write.
    await getCallableFunction('claimPushToken')({ token });
  }
}

export function usePushToken() {
  useEffect(() => {
    registerForPushNotifications().catch(() => {});
  }, []);
}
