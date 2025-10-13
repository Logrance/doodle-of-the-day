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
      tabBarLabelPosition: 'below-icon',
      tabBarLabelStyle: {
        color: 'black', 
      },
      //tabBarStyle: { marginTop: 60 },
    }}
    >
      <Tab.Screen 
       name="Home"
       component={ProfileStack}
       options={{
         headerShown: false,
         tabBarIcon: ({ color, size, focused }) => (
           <Foundation
             name="home"
             size={24}
             color={focused ? 'white' : 'black'} 
             style={{
               backgroundColor: focused ? 'rgba(2,52,72, 0.3)' : 'transparent', 
               borderRadius: 12, 
               paddingVertical: 2,
              paddingHorizontal: 8,
             }}
           />
         ),
       }}
     />
      <Tab.Screen
        name="Draw"
        component={CanvasScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name="draw"
              size={24}
              color={focused ? 'white' : 'black'}
              style={{
                backgroundColor: focused ? 'rgba(2,52,72, 0.3)' : 'transparent',
                borderRadius: 12, 
                paddingVertical: 2,
               paddingHorizontal: 8,
              }}
            />
          ),
        }}
      />
     <Tab.Screen
        name="Vote"
        component={VoteScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <FontAwesome5
              name="hand-holding-heart"
              size={24}
              color={focused ? 'white' : 'black'}
              style={{
                backgroundColor: focused ? 'rgba(2,52,72, 0.3)' : 'transparent',
                borderRadius: 12, 
                paddingVertical: 2,
               paddingHorizontal: 8,
              }}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
