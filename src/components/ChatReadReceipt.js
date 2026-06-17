import React from 'react';
import { StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { widthPercentageToDP as wp } from '../utils';

const SENT_TICK_COLOR = 'rgba(255, 255, 255, 0.55)';
const READ_TICK_COLOR = '#53BDEB';

const ChatReadReceipt = ({ read = false }) => {
  if (read) {
    return (
      <MaterialCommunityIcons
        name="check-all"
        size={wp(3.6)}
        color={READ_TICK_COLOR}
        style={styles.readIcon}
      />
    );
  }

  return (
    <View style={styles.sentWrap}>
      <MaterialCommunityIcons name="check" size={wp(3.4)} color={SENT_TICK_COLOR} />
    </View>
  );
};

export default ChatReadReceipt;

const styles = StyleSheet.create({
  sentWrap: {
    marginLeft: wp(0.5),
  },
  readIcon: {
    marginLeft: wp(0.5),
  },
});
