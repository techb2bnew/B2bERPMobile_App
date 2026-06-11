import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { darkBackgroundColor } from '../constants/Color';
import CreateAccountScreen from '../screens/CreateAccountScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import LoginScreen from '../screens/LoginScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import { AUTH_ROUTES } from './routes';

const Stack = createNativeStackNavigator();

const AuthStack = () => {
  return (
    <Stack.Navigator
      initialRouteName={AUTH_ROUTES.ROLE_SELECTION}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: darkBackgroundColor },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen
        name={AUTH_ROUTES.ROLE_SELECTION}
        component={RoleSelectionScreen}
      />
      <Stack.Screen name={AUTH_ROUTES.LOGIN} component={LoginScreen} />
      <Stack.Screen
        name={AUTH_ROUTES.CREATE_ACCOUNT}
        component={CreateAccountScreen}
      />
      <Stack.Screen
        name={AUTH_ROUTES.FORGOT_PASSWORD}
        component={ForgotPasswordScreen}
      />
    </Stack.Navigator>
  );
};

export default AuthStack;
