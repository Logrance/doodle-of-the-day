import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import CheckEmailScreen from './screens/CheckEmailScreen';
import HomeScreen from './screens/HomeScreen/HomeScreen';
import Deets from './screens/Deets';
import { useFonts } from 'expo-font';
import { Poppins_400Regular, Poppins_700Bold } from '@expo-google-fonts/poppins';

type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  CheckEmail: { email: string };
  HomeScreen: undefined;
  Deets: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

SplashScreen.preventAutoHideAsync().catch(() => {});

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['doodleoftheday://', 'https://doodleoftheday.app'],
  config: {
    screens: {
      Welcome: 'welcome',
      Login: 'login',
      SignUp: 'signup',
      ForgotPassword: 'forgot-password',
      CheckEmail: 'check-email',
      Deets: 'account',
      HomeScreen: {
        path: 'home',
        screens: {
          Home: 'profile',
          Draw: 'draw',
          Vote: 'vote',
        },
      },
    },
  },
  async getInitialURL() {
    const response = await Notifications.getLastNotificationResponseAsync();
    const url = response?.notification.request.content.data?.url;
    if (typeof url === 'string') return url;
    return null;
  },
  subscribe(listener) {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string') listener(url);
    });
    return () => sub.remove();
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="CheckEmail" component={CheckEmailScreen} />
        <Stack.Screen name="HomeScreen" component={HomeScreen} />
        <Stack.Screen name="Deets" component={Deets} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
