import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CanvasScreen from './(tabs)/CanvasScreen';
import VoteScreen from './(tabs)/VoteScreen';
import ProfileStack from '../ProfileStack';
import Foundation from '@expo/vector-icons/Foundation';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

const Tab = createBottomTabNavigator();

export default function HomeScreen() {
  return (
    <Tab.Navigator
    screenOptions={{
      tabBarLabelStyle: {
        color: 'black', 
      },
    }}
    >
      <Tab.Screen 
      name="Home" 
      component={ProfileStack} 
      options={{
         headerShown: false,
         tabBarIcon: ({ color, size }) => (
         <Foundation name="home" size={24} color="black" />
        )
          }} 
          />
      <Tab.Screen 
      name="Draw"
      component={CanvasScreen}
      options={{ headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="draw" size={24} color="black" />
        )
       }} 
        />
      <Tab.Screen 
      name="Vote"
      component={VoteScreen}
      options={{ headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="hand-holding-heart" size={24} color="black" />
          )
       }}  
       />
    </Tab.Navigator>
  );
}
