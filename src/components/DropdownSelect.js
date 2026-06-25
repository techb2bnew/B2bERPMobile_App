import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
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
  whiteColor,
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
  const [open, setOpen] = useState(false);

  const openMenu = () => setOpen(true);
  const closeMenu = () => setOpen(false);

  const handleSelect = option => {
    onChange(option);
    closeMenu();
  };

  const sheetHeight = Math.min(hp(65), hp(8) + options.length * hp(5.8) + hp(10));

  return (
    <View style={[styles.field, containerStyle]}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? ' *' : ''}
        </Text>
      ) : null}

      <TouchableOpacity
        style={styles.select}
        onPress={openMenu}
        activeOpacity={0.85}>
        <Text style={styles.selectText} numberOfLines={1}>
          {value}
        </Text>
        <Icon
          name={open ? 'chevron-up' : 'chevron-down'}
          size={wp(4.5)}
          color={darkTextSecondaryColor}
        />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeMenu}>
        <View style={styles.sheetRoot}>
          <Pressable style={styles.sheetBackdrop} onPress={closeMenu} />

          <View style={[styles.sheet, { height: sheetHeight }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label || 'Select'}</Text>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={closeMenu}
                activeOpacity={0.85}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.optionsList}
              contentContainerStyle={styles.optionsListContent}
              showsVerticalScrollIndicator
              bounces={false}
              keyboardShouldPersistTaps="handled">
              {options.map(option => {
                const isActive = value === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.optionItem, isActive && styles.optionItemActive]}
                    onPress={() => handleSelect(option)}
                    activeOpacity={0.85}>
                    <Text
                      style={[styles.optionText, isActive && styles.optionTextActive]}
                      numberOfLines={1}>
                      {option}
                    </Text>
                    {isActive ? (
                      <Icon name="check" size={wp(4.5)} color={PURPLE} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.sheetFooterButton}
              onPress={closeMenu}
              activeOpacity={0.85}>
              <Text style={styles.sheetFooterButtonText}>Done</Text>
            </TouchableOpacity>
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
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    backgroundColor: darkSurfaceColor,
    borderTopLeftRadius: wp(5),
    borderTopRightRadius: wp(5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderBottomWidth: 0,
    paddingHorizontal: wp(4),
    paddingBottom: hp(2),
  },
  sheetHandle: {
    alignSelf: 'center',
    width: wp(12),
    height: hp(0.5),
    borderRadius: hp(0.25),
    backgroundColor: darkBorderColor,
    marginTop: hp(1),
    marginBottom: hp(1.2),
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1),
  },
  sheetTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    textTransform: 'capitalize',
  },
  doneButton: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
  },
  doneButtonText: {
    ...style.fontSizeNormal,
    color: PURPLE,
    ...style.fontWeightMedium,
  },
  optionsList: {
    flex: 1,
  },
  optionsListContent: {
    paddingBottom: hp(0.5),
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(1.3),
    paddingHorizontal: wp(1),
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
    gap: wp(2),
  },
  optionItemActive: {
    backgroundColor: 'rgba(155, 89, 182, 0.1)',
    borderRadius: wp(2),
  },
  optionText: {
    flex: 1,
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    textTransform: 'capitalize',
  },
  optionTextActive: {
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  sheetFooterButton: {
    marginTop: hp(1),
    backgroundColor: PURPLE,
    borderRadius: wp(3),
    paddingVertical: hp(1.3),
    alignItems: 'center',
  },
  sheetFooterButtonText: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: whiteColor,
  },
});
