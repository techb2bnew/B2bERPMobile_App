import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {
  CHAT_CHOOSE_TYPE,
  CHAT_DIRECT_DESC,
  CHAT_DIRECT_MESSAGE,
  CHAT_GROUP,
  CHAT_GROUP_DESC,
} from '../../constants/Constants';
import {
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';

const OPTIONS = [
  {
    id: 'direct',
    title: CHAT_DIRECT_MESSAGE,
    description: CHAT_DIRECT_DESC,
    icon: 'message-circle',
  },
  {
    id: 'group',
    title: CHAT_GROUP,
    description: CHAT_GROUP_DESC,
    icon: 'users',
  },
];

const NewChatTypeModal = ({ visible, onClose, onSelectType }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.card} onPress={() => {}}>
        <Text style={styles.title}>{CHAT_CHOOSE_TYPE}</Text>

        {OPTIONS.map(option => (
          <TouchableOpacity
            key={option.id}
            style={styles.optionRow}
            onPress={() => onSelectType(option.id)}
            activeOpacity={0.85}>
            <View style={styles.optionIconWrap}>
              <Icon name={option.icon} size={wp(5.5)} color={PURPLE} />
            </View>
            <View style={styles.optionBody}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            <Icon name="chevron-right" size={wp(5)} color={darkTextSecondaryColor} />
          </TouchableOpacity>
        ))}
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

export default NewChatTypeModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
  },
  card: {
    width: '100%',
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4.5),
    paddingTop: hp(2),
    paddingBottom: hp(2),
  },
  title: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    marginBottom: hp(1.5),
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    backgroundColor: 'rgba(155, 89, 182, 0.08)',
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.4),
    marginBottom: hp(1),
  },
  optionIconWrap: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(3),
    backgroundColor: 'rgba(155, 89, 182, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBody: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  optionDescription: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginTop: hp(0.2),
  },
});
