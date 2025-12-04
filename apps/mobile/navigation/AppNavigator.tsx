import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import LoginScreen from '../screens/LoginScreen';
import JobListScreen from '../screens/JobListScreen';
import JobDetailsScreen from '../screens/JobDetailsScreen';

export type RootStackParamList = {
    Login: undefined;
    JobList: { userId: string };
    JobDetails: { jobId: string };
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
            </Stack.Navigator>
        </NavigationContainer>
    );
}
