import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreen from "./HomeScreen/(tabs)/ProfileScreen";
import UserDrawingsScreen from "./UserDrawingsScreen";
import WinnerDrawingsScreen from "./WinnerDrawingsScreen";
import Deets from "./Deets";

const Stack = createNativeStackNavigator();

export default function ProfileStack() {
    return (
        <Stack.Navigator>
            <Stack.Screen name="ProfileScreen" component={ProfileScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Deets" component={Deets} />
            <Stack.Screen name="UserDrawingsScreen" component={UserDrawingsScreen} options={{ title: 'My drawings' }}/>
            <Stack.Screen name="WinnerDrawingsScreen" component={WinnerDrawingsScreen} options={{ title: 'My wins' }}/>
        </Stack.Navigator>
    );
}