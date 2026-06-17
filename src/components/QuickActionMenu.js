import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import AiAssistantFab from './AiAssistantFab';
import {
  QUICK_ACTION_BROADCAST_MESSAGE,
  QUICK_ACTION_CALL_EMPLOYEE,
} from '../constants/Constants';
import {
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../constants/Color';
import { style } from '../constants/Fonts';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../utils';

const MENU_ITEMS = [
  {
    id: 'call',
    label: QUICK_ACTION_CALL_EMPLOYEE,
    icon: 'phone',
    iconColor: '#3DDC84',
    onPressKey: 'onCallEmployee',
  },
  {
    id: 'broadcast',
    label: QUICK_ACTION_BROADCAST_MESSAGE,
    icon: 'send',
    iconColor: '#F5C542',
    onPressKey: 'onBroadcastMessage',
  },
];

const QuickActionMenu = ({
  visible,
  onClose,
  onCallEmployee,
  onBroadcastMessage,
  badgeCount = 4,
}) => {
  const handlers = {
    onCallEmployee,
    onBroadcastMessage,
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close quick actions">
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={styles.menuWrap}>
          <View style={styles.menu}>
            {MENU_ITEMS.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index < MENU_ITEMS.length - 1 && styles.menuItemBorder,
                ]}
                onPress={() => handlers[item.onPressKey]?.()}
                activeOpacity={0.85}>
                <View style={[styles.iconWrap, { borderColor: item.iconColor }]}>
                  <Icon name={item.icon} size={wp(4.2)} color={item.iconColor} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>

        <AiAssistantFab onPress={onClose} badgeCount={badgeCount} />
      </TouchableOpacity>
    </Modal>
  );
};

export default QuickActionMenu;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  menuWrap: {
    position: 'absolute',
    right: wp(5),
    bottom: hp(3) + wp(14) + hp(1.5),
    width: wp(52),
    zIndex: 210,
    elevation: 26,
  },
  menu: {
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.6),
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
  },
  iconWrap: {
    width: wp(8.5),
    height: wp(8.5),
    borderRadius: wp(2.5),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  menuLabel: {
    flex: 1,
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
});
