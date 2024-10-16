import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CanvasScreen from './(tabs)/CanvasScreen';
import ProfileScreen from './(tabs)/ProfileScreen';
import VoteScreen from './(tabs)/VoteScreen';
import ProfileStack from '../ProfileStack';

const Tab = createBottomTabNavigator();

export default function HomeScreen() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="ProfileStack" component={ProfileStack} options={{ headerShown: false }} />
      <Tab.Screen options={{ headerShown: false }} name="CanvasScreen" component={CanvasScreen} />
      <Tab.Screen options={{ headerShown: false }} name="VoteScreen" component={VoteScreen} />
    </Tab.Navigator>
  );
}
