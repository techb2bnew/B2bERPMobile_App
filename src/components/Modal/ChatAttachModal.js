import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {
  CHAT_ATTACH_FILE,
  CHAT_ATTACH_PHOTO,
  CHAT_ATTACH_TITLE,
  CHAT_ATTACH_VIDEO,
  CHAT_CANCEL,
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
  { id: 'photo', label: CHAT_ATTACH_PHOTO, icon: 'image', color: '#3DDC84' },
  { id: 'video', label: CHAT_ATTACH_VIDEO, icon: 'video', color: '#E84393' },
  { id: 'file', label: CHAT_ATTACH_FILE, icon: 'paperclip', color: '#F5C542' },
];

const ChatAttachModal = ({ visible, onClose, onSelect, onDismiss }) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
    onDismiss={onDismiss}>
    <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.card} onPress={() => {}}>
        <Text style={styles.title}>{CHAT_ATTACH_TITLE}</Text>

        {OPTIONS.map(option => (
          <TouchableOpacity
            key={option.id}
            style={styles.optionRow}
            onPress={() => onSelect(option.id)}
            activeOpacity={0.85}>
            <View style={[styles.iconWrap, { borderColor: option.color }]}>
              <Icon name={option.icon} size={wp(5)} color={option.color} />
            </View>
            <Text style={styles.optionLabel}>{option.label}</Text>
            <Icon name="chevron-right" size={wp(5)} color={darkTextSecondaryColor} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.85}>
          <Text style={styles.cancelText}>{CHAT_CANCEL}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

export default ChatAttachModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: darkSurfaceColor,
    borderTopLeftRadius: wp(5),
    borderTopRightRadius: wp(5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
    paddingBottom: hp(3),
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
    paddingVertical: hp(1.4),
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
  },
  iconWrap: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(3),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  optionLabel: {
    flex: 1,
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  cancelButton: {
    marginTop: hp(1.5),
    alignItems: 'center',
    paddingVertical: hp(1.2),
  },
  cancelText: {
    ...style.fontSizeNormal,
    color: PURPLE,
    ...style.fontWeightMedium,
  },
});
