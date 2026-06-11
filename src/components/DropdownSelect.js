import React, { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {
  darkBorderColor,
  darkInputBgColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../constants/Color';
import { style } from '../constants/Fonts';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../utils';

const PURPLE = '#9B59B6';

const DropdownSelect = ({
  label,
  value,
  options,
  onChange,
  required = false,
  containerStyle,
}) => {
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [menuLayout, setMenuLayout] = useState({ top: 0, left: 0, width: 0 });

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setMenuLayout({
        top: y + height + hp(0.4),
        left: x,
        width,
      });
      setOpen(true);
    });
  };

  const closeMenu = () => setOpen(false);

  const handleSelect = option => {
    onChange(option);
    closeMenu();
  };

  return (
    <View style={[styles.field, containerStyle]}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? ' *' : ''}
        </Text>
      ) : null}

      <TouchableOpacity
        ref={triggerRef}
        style={styles.select}
        onPress={openMenu}
        activeOpacity={0.85}>
        <Text style={styles.selectText} numberOfLines={1}>
          {value}
        </Text>
        <Icon name="chevron-down" size={wp(4.5)} color={darkTextSecondaryColor} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={closeMenu}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={closeMenu} />
          <View
            style={[
              styles.menu,
              {
                top: menuLayout.top,
                left: menuLayout.left,
                width: menuLayout.width,
              },
            ]}>
            {options.map(option => {
              const isActive = value === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionItem, isActive && styles.optionItemActive]}
                  onPress={() => handleSelect(option)}
                  activeOpacity={0.85}>
                  <Text style={[styles.optionText, isActive && styles.optionTextActive]} numberOfLines={1}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default DropdownSelect;

const styles = StyleSheet.create({
  field: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginBottom: hp(0.7),
    marginTop: hp(1),
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: darkInputBgColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
    gap: wp(2),
  },
  selectText: {
    flex: 1,
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
    textTransform: 'capitalize',
  },
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  menu: {
    position: 'absolute',
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    overflow: 'hidden',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  optionItem: {
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
    backgroundColor: darkInputBgColor,
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
  },
  optionItemActive: {
    backgroundColor: 'rgba(155, 89, 182, 0.2)',
  },
  optionText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    textTransform: 'capitalize',
  },
  optionTextActive: {
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
});
