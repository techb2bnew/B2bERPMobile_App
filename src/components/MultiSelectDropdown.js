import React, { useMemo, useState } from 'react';
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
  darkPlaceholderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
  whiteColor,
} from '../constants/Color';
import { style } from '../constants/Fonts';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../utils';

const PURPLE = '#9B59B6';
const SHEET_HEIGHT = hp(42);

const MultiSelectDropdown = ({
  label,
  options = [],
  selectedIds = [],
  onChange,
  placeholder = 'Select options',
  sheetTitle = 'Select options',
  required = false,
  containerStyle,
}) => {
  const [open, setOpen] = useState(false);

  const selectedOptions = useMemo(
    () => options.filter(option => selectedIds.includes(option.id)),
    [options, selectedIds],
  );

  const displayText = useMemo(() => {
    if (selectedOptions.length === 0) {
      return placeholder;
    }

    if (selectedOptions.length === 1) {
      return selectedOptions[0].name;
    }

    return `${selectedOptions.length} assignees selected`;
  }, [placeholder, selectedOptions]);

  const openMenu = () => setOpen(true);
  const closeMenu = () => setOpen(false);

  const toggleOption = optionId => {
    if (selectedIds.includes(optionId)) {
      onChange(selectedIds.filter(id => id !== optionId));
      return;
    }

    onChange([...selectedIds, optionId]);
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
        style={styles.select}
        onPress={openMenu}
        activeOpacity={0.85}>
        <Text
          style={[
            styles.selectText,
            selectedOptions.length === 0 && styles.placeholderText,
          ]}
          numberOfLines={1}>
          {displayText}
        </Text>
        <Icon
          name={open ? 'chevron-up' : 'chevron-down'}
          size={wp(4.5)}
          color={darkTextSecondaryColor}
        />
      </TouchableOpacity>

      {selectedOptions.length > 0 ? (
        <View style={styles.selectedWrap}>
          {selectedOptions.map(option => (
            <View key={option.id} style={styles.selectedChip}>
              <Text style={styles.selectedChipText}>{option.name}</Text>
              <TouchableOpacity
                onPress={() => toggleOption(option.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="x" size={wp(3.2)} color={darkTextPrimaryColor} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeMenu}>
        <View style={styles.sheetRoot}>
          <Pressable style={styles.sheetBackdrop} onPress={closeMenu} />

          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{sheetTitle}</Text>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={closeMenu}
                activeOpacity={0.85}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetHint}>Tap names to select or remove</Text>

            <ScrollView
              style={styles.optionsList}
              contentContainerStyle={styles.optionsListContent}
              showsVerticalScrollIndicator
              bounces={false}
              keyboardShouldPersistTaps="handled">
              {options.map(option => {
                const isActive = selectedIds.includes(option.id);
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.optionItem, isActive && styles.optionItemActive]}
                    onPress={() => toggleOption(option.id)}
                    activeOpacity={0.85}>
                    <View style={styles.optionLeft}>
                      <View
                        style={[
                          styles.checkbox,
                          isActive && styles.checkboxActive,
                        ]}>
                        {isActive ? (
                          <Icon name="check" size={wp(3.5)} color={whiteColor} />
                        ) : null}
                      </View>
                      <Text
                        style={[styles.optionText, isActive && styles.optionTextActive]}
                        numberOfLines={1}>
                        {option.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.sheetFooterButton}
              onPress={closeMenu}
              activeOpacity={0.85}>
              <Text style={styles.sheetFooterButtonText}>
                {selectedOptions.length > 0
                  ? `Done · ${selectedOptions.length} selected`
                  : 'Done'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MultiSelectDropdown;

const styles = StyleSheet.create({
  field: {
    width: '100%',
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
  },
  placeholderText: {
    color: darkPlaceholderColor,
  },
  selectedWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    marginTop: hp(0.8),
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    backgroundColor: 'rgba(155, 89, 182, 0.2)',
    borderRadius: wp(5),
    borderWidth: 1,
    borderColor: PURPLE,
    paddingLeft: wp(3),
    paddingRight: wp(2),
    paddingVertical: hp(0.45),
  },
  selectedChipText: {
    ...style.fontSizeSmall2x,
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
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
    height: SHEET_HEIGHT,
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
    marginBottom: hp(0.5),
  },
  sheetTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
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
  sheetHint: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginBottom: hp(1),
  },
  optionsList: {
    flex: 1,
    maxHeight: hp(26),
  },
  optionsListContent: {
    paddingBottom: hp(1),
  },
  optionItem: {
    paddingVertical: hp(1.1),
    paddingHorizontal: wp(1),
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
  },
  optionItemActive: {
    backgroundColor: 'rgba(155, 89, 182, 0.08)',
    borderRadius: wp(2),
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },
  checkbox: {
    width: wp(5),
    height: wp(5),
    borderRadius: wp(1.2),
    borderWidth: 1.5,
    borderColor: darkBorderColor,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: darkInputBgColor,
  },
  checkboxActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  optionText: {
    flex: 1,
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
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
