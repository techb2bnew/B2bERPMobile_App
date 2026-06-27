import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import AtsJobsScreen from './AtsJobsScreen';
import AtsPipelineScreen from './AtsPipelineScreen';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkSurfaceColor,
  darkTextSecondaryColor,
  whiteColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';

const RecruiterDashboardScreen = () => {
  const [activeTab, setActiveTab] = useState('Jobs'); // 'Jobs' or 'Pipeline'

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <AppHeader title="Recruitment (ATS)" />
      
      {/* Top Main Tabs */}
      <View style={styles.mainTabsContainer}>
        <TouchableOpacity
          style={[styles.mainTabBtn, activeTab === 'Jobs' && styles.mainTabBtnActive]}
          onPress={() => setActiveTab('Jobs')}
          activeOpacity={0.8}
        >
          <Text style={[styles.mainTabText, activeTab === 'Jobs' && styles.mainTabTextActive]}>
            Job Vacancies
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.mainTabBtn, activeTab === 'Pipeline' && styles.mainTabBtnActive]}
          onPress={() => setActiveTab('Pipeline')}
          activeOpacity={0.8}
        >
          <Text style={[styles.mainTabText, activeTab === 'Pipeline' && styles.mainTabTextActive]}>
            Candidate Pipeline
          </Text>
        </TouchableOpacity>
      </View>

      {/* Render the appropriate component */}
      <View style={styles.contentArea}>
        {activeTab === 'Jobs' ? <AtsJobsScreen /> : <AtsPipelineScreen />}
      </View>

    </SafeAreaView>
  );
};

export default RecruiterDashboardScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: darkBackgroundColor },
  mainTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
    backgroundColor: darkSurfaceColor,
  },
  mainTabBtn: {
    flex: 1,
    paddingVertical: hp(1.2),
    alignItems: 'center',
    borderRadius: wp(2),
  },
  mainTabBtnActive: {
    backgroundColor: 'rgba(155, 89, 182, 0.2)',
  },
  mainTabText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    ...style.fontWeightMedium,
  },
  mainTabTextActive: {
    color: PURPLE,
    ...style.fontWeightBold,
  },
  contentArea: {
    flex: 1,
  },
});
