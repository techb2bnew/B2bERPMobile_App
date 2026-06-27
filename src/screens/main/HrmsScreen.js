import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import { useAuth } from '../../context/AuthContext';
import { isHrManagerUser, isCeoAdminUser } from '../../constants/roles';
import { darkBackgroundColor } from '../../constants/Color';
import HrmsAdminScreen from './HrmsAdminScreen';
import HrmsEmployeeScreen from './HrmsEmployeeScreen';

const HrmsScreen = () => {
  const { user } = useAuth();
  const isAdminOrHr = isCeoAdminUser(user) || isHrManagerUser(user);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader title="HRMS - Command Center" />
      <View style={styles.content}>
        {isAdminOrHr ? (
          <HrmsAdminScreen />
        ) : (
          <HrmsEmployeeScreen userId={user?.id} />
        )}
      </View>
    </SafeAreaView>
  );
};

export default HrmsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: darkBackgroundColor,
  },
  content: {
    flex: 1,
  },
});
