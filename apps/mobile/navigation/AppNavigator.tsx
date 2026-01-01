import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import LoginScreen from '../screens/LoginScreen';
import JobListScreen from '../screens/JobListScreen';
import JobDetailsScreen from '../screens/JobDetailsScreen';
import PunchInScreen from '../screens/PunchInScreen';
import PunchOutScreen from '../screens/PunchOutScreen';

export type RootStackParamList = {
    Login: undefined;
    JobList: { userId: string };
    JobDetails: { jobId: string };
    PunchIn: { userId: string };
    PunchOut: { timesheetId: string };
    Inventory: undefined;
    Signature: { onOK: (signature: string) => void };
    CreateQuote: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Login">
                <Stack.Screen
                    name="Login"
                    component={LoginScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="JobList"
                    component={JobListScreen}
                    options={{ title: 'My Schedule', headerLeft: () => null }}
                />
                <Stack.Screen
                    name="JobDetails"
                    component={JobDetailsScreen}
                    options={{ title: 'Job Details' }}
                />
                <Stack.Screen
                    name="PunchIn"
                    component={PunchInScreen}
                    options={{ headerShown: false, gestureEnabled: false }} // No back gesture
                />
                <Stack.Screen
                    name="PunchOut"
                    component={PunchOutScreen}
                    options={{ title: 'End Of Day' }}
                />
                <Stack.Screen
                    name="Inventory"
                    component={require('../screens/InventoryScreen').default}
                    options={{ title: 'Weekly Inventory' }}
                />
                <Stack.Screen
                    name="Inventory"
                    component={require('../screens/InventoryScreen').default}
                    options={{ title: 'Weekly Inventory' }}
                />
                <Stack.Screen
                    name="Signature"
                    component={require('../screens/SignatureScreen').default}
                    options={{ title: 'Signature' }}
                />
                <Stack.Screen
                    name="CreateQuote"
                    component={require('../screens/CreateQuoteScreen').default}
                    options={{ title: 'New Quote' }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
