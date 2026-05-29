import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ProfileScreen from "./HomeScreen/(tabs)/ProfileScreen";
import UserDrawingsScreen from "./UserDrawingsScreen";
import WinnerDrawingsScreen from "./WinnerDrawingsScreen";
import GalleryScreen from "./GalleryScreen";
import Deets from "./Deets";
import LeaderboardScreen from "./LeaderboardScreen";
import PublicProfileScreen from "./PublicProfileScreen";
import BlockedUsersScreen from "./BlockedUsersScreen";
import FavouritersScreen from "./FavouritersScreen";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator();

type CustomHeaderProps = {
    navigation: { goBack: () => void };
    options: { title?: string };
    back?: { title?: string };
};

function CustomHeader({ navigation, options, back }: CustomHeaderProps) {
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
            {back ? (
                <TouchableOpacity
                    onPress={navigation.goBack}
                    style={styles.backButton}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <MaterialCommunityIcons name="chevron-left" size={32} color={colors.navy} />
                </TouchableOpacity>
            ) : null}
            <Text style={styles.title} numberOfLines={1}>
                {options.title}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        paddingBottom: 12,
        paddingHorizontal: 12,
        minHeight: 56,
    },
    backButton: {
        padding: 4,
        marginRight: 4,
    },
    title: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 17,
        color: colors.navy,
        flex: 1,
    },
});

const screenOptions = {
    header: (props: any) => <CustomHeader {...props} />,
};

export default function ProfileStack() {
    return (
        <Stack.Navigator screenOptions={screenOptions}>
            <Stack.Screen name="ProfileScreen" component={ProfileScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Deets" component={Deets} options={{ title: 'Account' }} />
            <Stack.Screen name="GalleryScreen" component={GalleryScreen} options={{ title: 'Gallery' }} />
            <Stack.Screen name="UserDrawingsScreen" component={UserDrawingsScreen} options={{ title: 'My drawings' }}/>
            <Stack.Screen name="WinnerDrawingsScreen" component={WinnerDrawingsScreen} options={{ title: 'My wins' }}/>
            <Stack.Screen name="LeaderboardScreen" component={LeaderboardScreen} options={{ title: 'Leaderboard' }}/>
            <Stack.Screen name="PublicProfileScreen" component={PublicProfileScreen} options={{ title: 'Profile' }}/>
            <Stack.Screen name="BlockedUsersScreen" component={BlockedUsersScreen} options={{ title: 'Blocked users' }}/>
            <Stack.Screen name="FavouritersScreen" component={FavouritersScreen} options={{ title: 'Inbox' }}/>
        </Stack.Navigator>
    );
}
