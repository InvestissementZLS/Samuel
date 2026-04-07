import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Platform, View, Text } from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import JobListScreen from '../screens/JobListScreen';
import JobDetailsScreen from '../screens/JobDetailsScreen';
import PunchInScreen from '../screens/PunchInScreen';
import PunchOutScreen from '../screens/PunchOutScreen';
import QuickAddJobScreen from '../screens/QuickAddJobScreen';

export type RootStackParamList = {
    Login: undefined;
    JobList: { userId: string };
    JobDetails: { jobId: string };
    PunchIn: { userId: string };
    PunchOut: { timesheetId: string };
    Inventory: undefined;
    Signature: { onOK: (signature: string) => void };
    CreateQuote: undefined;
    AddExpense: { userId: string };
    QuickAddJob: { userId: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    return (
        <Stack.Navigator initialRouteName="Login" id={undefined}>
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
                options={{ headerShown: false, gestureEnabled: false }}
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
                name="Signature"
                component={Platform.OS === 'web' ? () => <View><Text>Signature not available on Web</Text></View> : require('../screens/SignatureScreen').default}
                options={{ title: 'Signature' }}
            />
            <Stack.Screen
                name="CreateQuote"
                component={require('../screens/CreateQuoteScreen').default}
                options={{ title: 'New Quote' }}
            />
            <Stack.Screen
                name="AddExpense"
                component={require('../screens/AddExpenseScreen').default}
                options={{ title: 'Nouvelle Dépense' }}
            />
            <Stack.Screen
                name="QuickAddJob"
                component={QuickAddJobScreen}
                options={{ title: '📞 Appel entrant', headerBackTitle: 'Retour' }}
            />
        </Stack.Navigator>
    );
}
