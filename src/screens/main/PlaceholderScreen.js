import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import { COMING_SOON } from '../../constants/Constants';
import {
  darkBackgroundColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style, spacings } from '../../constants/Fonts';
import { heightPercentageToDP as hp } from '../../utils';

const PlaceholderScreen = ({ title }) => {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader title={title} />
      <View style={styles.content}>
        <Text style={styles.text}>{COMING_SOON}</Text>
      </View>
    </SafeAreaView>
  );
};

export default PlaceholderScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: darkBackgroundColor,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: hp(10),
  },
  text: {
    ...style.fontSizeNormal2x,
    color: darkTextSecondaryColor,
  },
});
