import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreen from "./HomeScreen/(tabs)/ProfileScreen";
import UserDrawingsScreen from "./UserDrawingsScreen";
import WinnerDrawingsScreen from "./WinnerDrawingsScreen";
import GalleryScreen from "./GalleryScreen";
import Deets from "./Deets";
import LeaderboardScreen from "./LeaderboardScreen";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator();

const headerOptions = {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.navy,
    headerTitleStyle: { fontFamily: 'Poppins_700Bold', fontSize: 17 },
    headerShadowVisible: false,
};

export default function ProfileStack() {
    return (
        <Stack.Navigator screenOptions={headerOptions}>
            <Stack.Screen name="ProfileScreen" component={ProfileScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Deets" component={Deets} options={{ title: 'Account' }} />
            <Stack.Screen name="GalleryScreen" component={GalleryScreen} options={{ title: 'Gallery' }} />
            <Stack.Screen name="UserDrawingsScreen" component={UserDrawingsScreen} options={{ title: 'My drawings' }}/>
            <Stack.Screen name="WinnerDrawingsScreen" component={WinnerDrawingsScreen} options={{ title: 'My wins' }}/>
            <Stack.Screen name="LeaderboardScreen" component={LeaderboardScreen} options={{ title: 'Leaderboard' }}/>
        </Stack.Navigator>
    );
}