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
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: '#eee',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarActiveTintColor: '#023448',
        tabBarInactiveTintColor: '#aaa',
        tabBarLabelStyle: {
          fontFamily: 'Poppins_400Regular',
          fontSize: 11,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={ProfileStack}
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Foundation name="home" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Draw"
        component={CanvasScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="draw" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Vote"
        component={VoteScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="hand-holding-heart" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
