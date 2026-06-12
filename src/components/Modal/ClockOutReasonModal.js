import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import CommonButton from '../CommonButton';
import CommonTextInput from '../CommonTextInput';
import {
  darkBorderColor,
  darkInputBgColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import {
  CLOCK_OUT_CANCEL,
  CLOCK_OUT_CONFIRM,
  CLOCK_OUT_REASON_SUBTITLE,
  CLOCK_OUT_REASON_TITLE,
  REASON_END_OF_DAY,
  REASON_LUNCH_BREAK,
  REASON_MANUAL_LABEL,
  REASON_OTHER_PLACEHOLDER,
  REASON_PERSONAL,
  REASON_REQUIRED,
} from '../../constants/Constants';
import { style, spacings } from '../../constants/Fonts';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../../utils';

const REASON_OPTIONS = [
  { id: 'lunch', label: REASON_LUNCH_BREAK },
  { id: 'personal', label: REASON_PERSONAL },
  { id: 'end_of_day', label: REASON_END_OF_DAY },
];

const ClockOutReasonModal = ({ visible, onConfirm, onCancel }) => {
  const [selectedReasonId, setSelectedReasonId] = useState(null);
  const [customReason, setCustomReason] = useState('');
  const [error, setError] = useState('');

  const resetForm = () => {
    setSelectedReasonId(null);
    setCustomReason('');
    setError('');
  };

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  const handleConfirm = () => {
    const manualReason = customReason.trim();
    const selectedOption = REASON_OPTIONS.find(option => option.id === selectedReasonId);
    const endDay = selectedReasonId === 'end_of_day';

    let reason = manualReason;

    if (!reason && selectedOption) {
      reason = selectedOption.label;
    }

    if (!reason) {
      setError(REASON_REQUIRED);
      return;
    }

    if (!endDay && manualReason && selectedOption && selectedReasonId !== 'end_of_day') {
      reason = `${selectedOption.label}: ${manualReason}`;
    }

    resetForm();
    onConfirm({ reason, endDay });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}>
      <TouchableWithoutFeedback onPress={handleCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalCard}>
              <Text style={styles.title}>{CLOCK_OUT_REASON_TITLE}</Text>
              <Text style={styles.subtitle}>{CLOCK_OUT_REASON_SUBTITLE}</Text>

              <ScrollView
                style={styles.reasonList}
                showsVerticalScrollIndicator={false}>
                {REASON_OPTIONS.map(option => {
                  const isSelected = selectedReasonId === option.id;
                  const isEndOfDay = option.id === 'end_of_day';

                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.reasonChip,
                        isSelected && styles.reasonChipSelected,
                        isEndOfDay && isSelected && styles.endOfDayChipSelected,
                      ]}
                      onPress={() => {
                        setSelectedReasonId(option.id);
                        setError('');
                      }}
                      activeOpacity={0.85}>
                      <Text
                        style={[
                          styles.reasonChipText,
                          isSelected && styles.reasonChipTextSelected,
                          isEndOfDay && isSelected && styles.endOfDayChipTextSelected,
                        ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <CommonTextInput
                label={REASON_MANUAL_LABEL}
                value={customReason}
                onChangeText={text => {
                  setCustomReason(text);
                  if (text.trim()) {
                    setError('');
                  }
                }}
                placeholder={REASON_OTHER_PLACEHOLDER}
                containerStyle={styles.customReasonInput}
                error={error}
              />

              <View style={styles.actions}>
                <CommonButton
                  title={CLOCK_OUT_CANCEL}
                  variant="outline"
                  onPress={handleCancel}
                  style={styles.actionButton}
                />
                <CommonButton
                  title={CLOCK_OUT_CONFIRM}
                  onPress={handleConfirm}
                  style={styles.actionButton}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default ClockOutReasonModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(6),
  },
  modalCard: {
    width: '100%',
    maxWidth: wp(90),
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(5),
    paddingTop: hp(2.5),
    paddingBottom: hp(2),
  },
  title: {
    ...style.fontSizeLarge,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    textAlign: 'center',
  },
  subtitle: {
    ...style.fontSizeNormal,
    ...style.fontWeightThin,
    color: darkTextSecondaryColor,
    textAlign: 'center',
    marginTop: hp(1),
    marginBottom: hp(2),
    lineHeight: hp(2.6),
  },
  reasonList: {
    maxHeight: hp(20),
    marginBottom: hp(1),
  },
  reasonChip: {
    borderWidth: 1,
    borderColor: darkBorderColor,
    backgroundColor: darkInputBgColor,
    borderRadius: wp(2.5),
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(4),
    marginBottom: spacings.normal,
  },
  reasonChipSelected: {
    borderColor: '#3DDC84',
    backgroundColor: 'rgba(61, 220, 132, 0.12)',
  },
  endOfDayChipSelected: {
    borderColor: '#E85D5D',
    backgroundColor: 'rgba(232, 93, 93, 0.12)',
  },
  reasonChipText: {
    ...style.fontSizeNormal,
    ...style.fontWeightThin1x,
    color: darkTextPrimaryColor,
  },
  reasonChipTextSelected: {
    ...style.fontWeightMedium,
    color: '#3DDC84',
  },
  endOfDayChipTextSelected: {
    color: '#E85D5D',
  },
  customReasonInput: {
    marginBottom: spacings.normal,
  },
  actions: {
    flexDirection: 'row',
    gap: wp(3),
    marginTop: hp(1),
  },
  actionButton: {
    flex: 1,
  },
});
