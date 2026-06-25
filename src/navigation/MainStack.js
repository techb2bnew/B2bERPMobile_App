import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CustomDrawer from '../components/CustomDrawer';
import { AttendanceProvider } from '../context/AttendanceContext';
import { DrawerProvider, useDrawer } from '../context/DrawerContext';
import { darkBackgroundColor } from '../constants/Color';
import DashboardScreen from '../screens/main/DashboardScreen';
import ChannelChatScreen from '../screens/main/ChannelChatScreen';
import ChatScreen from '../screens/main/ChatScreen';
import ProjectsWorkScreen from '../screens/main/ProjectsWorkScreen';
import TaskManagementScreen from '../screens/main/TaskManagementScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import TimeSheetScreen from '../screens/main/TimeSheetScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import ApplyLeaveScreen from '../screens/main/ApplyLeaveScreen';
import ShiftTrackerScreen from '../screens/main/ShiftTrackerScreen';
import { MAIN_ROUTES } from './routes';

const Stack = createNativeStackNavigator();

const focusListener = (routeName, setActiveRoute) => ({
  focus: () => setActiveRoute(routeName),
});

const MainStackNavigator = () => {
  const { setActiveRoute } = useDrawer();

  return (
    <View style={styles.root}>
      <Stack.Navigator
        initialRouteName={MAIN_ROUTES.DASHBOARD}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: darkBackgroundColor },
        animation: 'slide_from_right',
        gestureEnabled: false,
      }}>
        <Stack.Screen
          name={MAIN_ROUTES.DASHBOARD}
          component={DashboardScreen}
          listeners={focusListener(MAIN_ROUTES.DASHBOARD, setActiveRoute)}
        />
        <Stack.Screen
          name={MAIN_ROUTES.NOTIFICATIONS}
          component={NotificationsScreen}
          listeners={focusListener(MAIN_ROUTES.NOTIFICATIONS, setActiveRoute)}
        />
        <Stack.Screen
          name={MAIN_ROUTES.PROJECTS_WORK}
          component={ProjectsWorkScreen}
          listeners={focusListener(MAIN_ROUTES.PROJECTS_WORK, setActiveRoute)}
        />
        <Stack.Screen
          name={MAIN_ROUTES.TASK_MANAGEMENT}
          component={TaskManagementScreen}
          listeners={focusListener(MAIN_ROUTES.PROJECTS_WORK, setActiveRoute)}
        />
        <Stack.Screen
          name={MAIN_ROUTES.TIME_SHEET}
          component={TimeSheetScreen}
          listeners={focusListener(MAIN_ROUTES.TIME_SHEET, setActiveRoute)}
        />
        <Stack.Screen
          name={MAIN_ROUTES.CHAT}
          component={ChatScreen}
          listeners={focusListener(MAIN_ROUTES.CHAT, setActiveRoute)}
        />
        <Stack.Screen
          name={MAIN_ROUTES.CHANNEL_CHAT}
          component={ChannelChatScreen}
          listeners={focusListener(MAIN_ROUTES.CHAT, setActiveRoute)}
        />
        <Stack.Screen
          name={MAIN_ROUTES.PROFILE}
          component={ProfileScreen}
          listeners={focusListener(MAIN_ROUTES.PROFILE, setActiveRoute)}
        />
        <Stack.Screen
          name={MAIN_ROUTES.APPLY_LEAVE}
          component={ApplyLeaveScreen}
          listeners={focusListener(MAIN_ROUTES.APPLY_LEAVE, setActiveRoute)}
        />
        <Stack.Screen
          name={MAIN_ROUTES.SHIFT_TRACKER}
          component={ShiftTrackerScreen}
          listeners={focusListener(MAIN_ROUTES.SHIFT_TRACKER, setActiveRoute)}
        />
      </Stack.Navigator>
      <CustomDrawer />
    </View>
  );
};

const MainStack = () => {
  return (
    <AttendanceProvider>
      <DrawerProvider>
        <MainStackNavigator />
      </DrawerProvider>
    </AttendanceProvider>
  );
};

export default MainStack;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
