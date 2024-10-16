import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreen from "./HomeScreen/(tabs)/ProfileScreen";
import UserDrawingsScreen from "./UserDrawingsScreen";
import WinnerDrawingsScreen from "./WinnerDrawingsScreen";

const Stack = createNativeStackNavigator();

export default function ProfileStack() {
    return (
        <Stack.Navigator>
            <Stack.Screen name="ProfileScreen" component={ProfileScreen} options={{ headerShown: false }} />
            <Stack.Screen name="UserDrawingsScreen" component={UserDrawingsScreen} />
            <Stack.Screen name="WinnerDrawingsScreen" component={WinnerDrawingsScreen} />
        </Stack.Navigator>
    );
}