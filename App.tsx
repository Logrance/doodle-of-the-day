import React from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen/HomeScreen';
import { useFonts } from 'expo-font';
import { Poppins_400Regular, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import Deets from './screens/Deets';

type RootStackParamList = {
  Login: undefined;
  HomeScreen: undefined;
  Deets: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();


  export default function App() {

    const [fontsLoaded] = useFonts({
      Poppins_400Regular,
      Poppins_700Bold,
      PressStart2P_400Regular,
    });
  
    if (!fontsLoaded) {
      return null; 
    }


  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen options={{ headerShown: false }} name="Login" component={LoginScreen} />
        <Stack.Screen options={{ headerShown: false }} name="HomeScreen" component={HomeScreen} />
        <Stack.Screen options={{ headerShown: false }} name="Deets" component={Deets} />
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
