import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import DropdownSelect from '../DropdownSelect';
import {
  MEETING_FILTER_ALL,
  MEETING_FILTER_APPLY,
  MEETING_FILTER_CLEAR_ALL,
  MEETING_FILTER_DATE_ALL,
  MEETING_FILTER_DATE_LABEL,
  MEETING_FILTER_DATE_TODAY,
  MEETING_FILTER_DATE_WEEK,
  MEETING_FILTER_PLATFORM_LABEL,
  MEETING_FILTER_SEARCH_LABEL,
  MEETING_FILTER_SEARCH_PLACEHOLDER,
  MEETING_FILTER_STATUS_LABEL,
  MEETING_FILTER_TITLE,
  MEETING_FILTER_TYPE_LABEL,
  MEETING_PARTICIPANTS_LABEL,
  MEETING_STATUS_CANCELLED,
  MEETING_STATUS_COMPLETED,
  MEETING_STATUS_ONGOING,
  MEETING_STATUS_SCHEDULED,
} from '../../constants/Constants';
import {
  darkBorderColor,
  darkInputBgColor,
  darkPlaceholderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import { MEETING_PLATFORM_OPTIONS, MEETING_TYPE_OPTIONS } from '../../services/meetingsService';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';

const STATUS_OPTIONS = [
  MEETING_FILTER_ALL,
  MEETING_STATUS_SCHEDULED,
  MEETING_STATUS_ONGOING,
  MEETING_STATUS_COMPLETED,
  MEETING_STATUS_CANCELLED,
];

const TYPE_OPTIONS = [MEETING_FILTER_ALL, ...MEETING_TYPE_OPTIONS];
const PLATFORM_OPTIONS = [MEETING_FILTER_ALL, ...MEETING_PLATFORM_OPTIONS];
const DATE_OPTIONS = [MEETING_FILTER_DATE_ALL, MEETING_FILTER_DATE_TODAY, MEETING_FILTER_DATE_WEEK];

export const DEFAULT_MEETING_FILTERS = {
  search: '',
  status: MEETING_FILTER_ALL,
  type: MEETING_FILTER_ALL,
  platform: MEETING_FILTER_ALL,
  participant: MEETING_FILTER_ALL,
  dateRange: MEETING_FILTER_DATE_ALL,
};

const MeetingFilterModal = ({ visible, filters, participantOptions = [], onClose, onApply, onClear }) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(MEETING_FILTER_ALL);
  const [type, setType] = useState(MEETING_FILTER_ALL);
  const [platform, setPlatform] = useState(MEETING_FILTER_ALL);
  const [participant, setParticipant] = useState(MEETING_FILTER_ALL);
  const [dateRange, setDateRange] = useState(MEETING_FILTER_DATE_ALL);

  const participantNameOptions = [
    MEETING_FILTER_ALL,
    ...participantOptions.map(option => option.name),
  ];

  useEffect(() => {
    if (!visible) {
      return;
    }
    setSearch(filters.search || '');
    setStatus(filters.status || MEETING_FILTER_ALL);
    setType(filters.type || MEETING_FILTER_ALL);
    setPlatform(filters.platform || MEETING_FILTER_ALL);
    setParticipant(filters.participant || MEETING_FILTER_ALL);
    setDateRange(filters.dateRange || MEETING_FILTER_DATE_ALL);
  }, [visible, filters]);

  const handleClear = () => {
    setSearch('');
    setStatus(MEETING_FILTER_ALL);
    setType(MEETING_FILTER_ALL);
    setPlatform(MEETING_FILTER_ALL);
    setParticipant(MEETING_FILTER_ALL);
    setDateRange(MEETING_FILTER_DATE_ALL);
    onClear();
  };

  const handleApply = () => {
    onApply({ search, status, type, platform, participant, dateRange });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.title}>{MEETING_FILTER_TITLE}</Text>
                <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.clearText}>{MEETING_FILTER_CLEAR_ALL}</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} bounces={false} style={styles.scroll}>
                <View style={styles.field}>
                  <Text style={styles.label}>{MEETING_FILTER_SEARCH_LABEL}</Text>
                  <TextInput
                    style={styles.input}
                    value={search}
                    onChangeText={setSearch}
                    placeholder={MEETING_FILTER_SEARCH_PLACEHOLDER}
                    placeholderTextColor={darkPlaceholderColor}
                  />
                </View>

                <DropdownSelect
                  label={MEETING_FILTER_STATUS_LABEL}
                  value={status}
                  options={STATUS_OPTIONS}
                  onChange={setStatus}
                  containerStyle={styles.dropdownField}
                />

                <DropdownSelect
                  label={MEETING_FILTER_TYPE_LABEL}
                  value={type}
                  options={TYPE_OPTIONS}
                  onChange={setType}
                  containerStyle={styles.dropdownField}
                />

                <DropdownSelect
                  label={MEETING_FILTER_PLATFORM_LABEL}
                  value={platform}
                  options={PLATFORM_OPTIONS}
                  onChange={setPlatform}
                  containerStyle={styles.dropdownField}
                />

                <DropdownSelect
                  label={MEETING_PARTICIPANTS_LABEL}
                  value={participant}
                  options={participantNameOptions}
                  onChange={setParticipant}
                  containerStyle={styles.dropdownField}
                />

                <DropdownSelect
                  label={MEETING_FILTER_DATE_LABEL}
                  value={dateRange}
                  options={DATE_OPTIONS}
                  onChange={setDateRange}
                  containerStyle={styles.dropdownField}
                />
              </ScrollView>

              <TouchableOpacity style={styles.applyButton} onPress={handleApply} activeOpacity={0.85}>
                <Text style={styles.applyButtonText}>{MEETING_FILTER_APPLY}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default MeetingFilterModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: hp(12),
    paddingRight: wp(4),
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  card: {
    width: wp(88),
    maxHeight: hp(72),
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4.5),
    paddingTop: hp(2),
    paddingBottom: hp(2.5),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1.8),
  },
  title: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  clearText: {
    ...style.fontSizeSmall2x,
    color: PURPLE,
    ...style.fontWeightMedium,
  },
  scroll: {
    maxHeight: hp(52),
  },
  field: {
    marginBottom: hp(1.5),
  },
  label: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginBottom: hp(0.7),
  },
  input: {
    backgroundColor: darkInputBgColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
  },
  dropdownField: {
    marginBottom: hp(1.5),
  },
  applyButton: {
    marginTop: hp(0.5),
    backgroundColor: PURPLE,
    borderRadius: wp(3),
    paddingVertical: hp(1.3),
    alignItems: 'center',
  },
  applyButtonText: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
});
