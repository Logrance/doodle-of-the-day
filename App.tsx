import React, { useEffect, useState } from 'react';
import { NavigationContainer, LinkingOptions, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebaseConfig';
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

const navigationRef = createNavigationContainerRef<RootStackParamList>();

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
          Profile: 'profile',
          Draw: 'draw',
          Vote: 'vote',
        },
      },
    },
  },
};

// Map a notification's `data.url` to a concrete tab. Bypasses React Navigation's
// linking parser, which silently falls back to the first tab (Profile) when the
// URL doesn't cleanly resolve in the nested stack/tab tree.
function navigateFromNotificationUrl(url: string, attempt = 0) {
  const lower = url.toLowerCase();
  let tab: 'Profile' | 'Draw' | 'Vote' | null = null;
  if (lower.includes('/draw')) tab = 'Draw';
  else if (lower.includes('/vote')) tab = 'Vote';
  else if (lower.includes('/profile')) tab = 'Profile';
  if (!tab) return;
  // Cold starts (tapping a notification while the app is killed) can resolve the
  // launching notification before the nav tree has mounted. Don't drop the intent
  // on the floor — retry briefly until the ref is ready, otherwise the app just
  // shows its default landing tab (Profile), which looks like wrong-screen routing.
  if (!navigationRef.isReady()) {
    if (attempt < 40) setTimeout(() => navigateFromNotificationUrl(url, attempt + 1), 100);
    return;
  }
  // @ts-expect-error nested-navigator typing — runtime form is correct
  navigationRef.navigate('HomeScreen', { screen: tab });
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
  });
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [verified, setVerified] = useState<boolean>(auth.currentUser?.emailVerified ?? false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        try { await u.reload(); } catch {}
        const current = auth.currentUser;
        setUser(current);
        setVerified(current?.emailVerified ?? false);
      } else {
        setUser(null);
        setVerified(false);
      }
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!user || verified) return;
    const id = setInterval(async () => {
      const current = auth.currentUser;
      if (!current) return;
      try { await current.reload(); } catch { return; }
      if (auth.currentUser?.emailVerified) {
        setVerified(true);
      }
    }, 3000);
    return () => clearInterval(id);
  }, [user, verified]);

  useEffect(() => {
    if (fontsLoaded && authReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, authReady]);

  // Handle notification taps: warm-start via listener, cold-start via the
  // last-response API. Runs only once the user is authed and HomeScreen is
  // mounted, so navigation refs resolve.
  const isAuthed = user != null && verified;
  useEffect(() => {
    if (!isAuthed) return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string') navigateFromNotificationUrl(url);
    });
    Notifications.getLastNotificationResponseAsync().then((response) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string') navigateFromNotificationUrl(url);
    });
    return () => sub.remove();
  }, [isAuthed]);

  if (!fontsLoaded || !authReady) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <NavigationContainer ref={navigationRef} linking={linking}>
        {isAuthed ? <AppStack /> : <AuthStack user={user} />}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="Deets" component={Deets} />
    </Stack.Navigator>
  );
}

function AuthStack({ user }: { user: User | null }) {
  return (
    <Stack.Navigator
      initialRouteName={user ? 'CheckEmail' : 'Welcome'}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen
        name="CheckEmail"
        component={CheckEmailScreen}
        initialParams={user ? { email: user.email ?? '' } : undefined}
      />
    </Stack.Navigator>
  );
}
