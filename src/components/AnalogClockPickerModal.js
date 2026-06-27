import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../constants/Color';
import { style } from '../constants/Fonts';
import CommonButton from './CommonButton';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../utils';

const PURPLE = '#9B59B6';

const AnalogClockPickerModal = ({
  visible,
  onClose,
  onConfirm,
  initialTime,
}) => {
  const [activeMode, setActiveMode] = useState('hour'); // 'hour' or 'minute'
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedAmpm, setSelectedAmpm] = useState('AM');

  useEffect(() => {
    if (visible && initialTime) {
      const match = initialTime.match(/^(\d+):(\d+)\s+(AM|PM)$/i);
      if (match) {
        setSelectedHour(parseInt(match[1], 10));
        setSelectedMinute(parseInt(match[2], 10));
        setSelectedAmpm(match[3].toUpperCase());
      }
      setActiveMode('hour');
    }
  }, [visible, initialTime]);

  const handleConfirm = () => {
    const formattedHour = String(selectedHour).padStart(2, '0');
    const formattedMinute = String(selectedMinute).padStart(2, '0');
    onConfirm(`${formattedHour}:${formattedMinute} ${selectedAmpm}`);
    onClose();
  };

  const handleHourSelect = (h) => {
    setSelectedHour(h);
    setTimeout(() => {
      setActiveMode('minute');
    }, 250);
  };

  const handleMinuteSelect = (m) => {
    setSelectedMinute(m);
  };

  // Dial calculations
  const DIAL_SIZE = wp(60);
  const CENTER = DIAL_SIZE / 2;
  const RADIUS = DIAL_SIZE / 2 - wp(6.5);
  const ITEM_SIZE = wp(8);

  const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const handAngle = activeMode === 'hour' ? selectedHour * 30 : selectedMinute * 6;

  if (!visible) return null;

  return (
    <View style={styles.modalRoot}>
      <TouchableOpacity activeOpacity={1} style={styles.clockOverlay} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.clockCard} onPress={() => {}}>
          
          <Text style={styles.clockModalTitle}>Select Time</Text>

          {/* Time display box */}
          <View style={styles.timeDisplayRow}>
            <TouchableOpacity
              onPress={() => setActiveMode('hour')}
              style={[styles.timeDisplayBox, activeMode === 'hour' && styles.timeDisplayBoxActive]}>
              <Text style={[styles.timeDisplayText, activeMode === 'hour' && styles.timeDisplayActiveText]}>
                {String(selectedHour).padStart(2, '0')}
              </Text>
            </TouchableOpacity>

            <Text style={styles.timeColon}>:</Text>

            <TouchableOpacity
              onPress={() => setActiveMode('minute')}
              style={[styles.timeDisplayBox, activeMode === 'minute' && styles.timeDisplayBoxActive]}>
              <Text style={[styles.timeDisplayText, activeMode === 'minute' && styles.timeDisplayActiveText]}>
                {String(selectedMinute).padStart(2, '0')}
              </Text>
            </TouchableOpacity>

            <View style={styles.ampmDisplayColumn}>
              <TouchableOpacity
                onPress={() => setSelectedAmpm('AM')}
                style={[styles.ampmMiniBtn, selectedAmpm === 'AM' && styles.ampmMiniBtnActive]}>
                <Text style={[styles.ampmMiniBtnText, selectedAmpm === 'AM' && styles.ampmMiniBtnActiveText]}>AM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedAmpm('PM')}
                style={[styles.ampmMiniBtn, selectedAmpm === 'PM' && styles.ampmMiniBtnActive]}>
                <Text style={[styles.ampmMiniBtnText, selectedAmpm === 'PM' && styles.ampmMiniBtnActiveText]}>PM</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Clock face dial */}
          <View style={[styles.clockDial, { width: DIAL_SIZE, height: DIAL_SIZE, borderRadius: DIAL_SIZE / 2 }]}>
            
            {/* Clock hand pointer */}
            <View style={[
              styles.clockHandContainer,
              {
                top: CENTER - RADIUS,
                left: CENTER - 1,
                height: RADIUS * 2,
                transform: [{ rotate: `${handAngle}deg` }]
              }
            ]}>
              <View style={[styles.clockHandLine, { height: RADIUS }]} />
              <View style={styles.clockHandCap} />
            </View>
            <View style={styles.clockCenterDot} />

            {/* Dial Items */}
            {activeMode === 'hour' ? (
              HOURS.map((h, i) => {
                const angleRad = (i * 30 - 90) * (Math.PI / 180);
                const x = CENTER + RADIUS * Math.cos(angleRad) - ITEM_SIZE / 2;
                const y = CENTER + RADIUS * Math.sin(angleRad) - ITEM_SIZE / 2;
                const isSelected = selectedHour === h;

                return (
                  <TouchableOpacity
                    key={h}
                    onPress={() => handleHourSelect(h)}
                    style={[
                      styles.clockNumberCell,
                      { left: x, top: y, width: ITEM_SIZE, height: ITEM_SIZE, borderRadius: ITEM_SIZE / 2 },
                      isSelected && styles.clockNumberCellActive
                    ]}>
                    <Text style={[styles.clockNumberText, isSelected && styles.clockNumberActiveText]}>
                      {h}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              MINUTES.map((m, i) => {
                const angleRad = (i * 30 - 90) * (Math.PI / 180);
                const x = CENTER + RADIUS * Math.cos(angleRad) - ITEM_SIZE / 2;
                const y = CENTER + RADIUS * Math.sin(angleRad) - ITEM_SIZE / 2;
                const isSelected = selectedMinute === m;

                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => handleMinuteSelect(m)}
                    style={[
                      styles.clockNumberCell,
                      { left: x, top: y, width: ITEM_SIZE, height: ITEM_SIZE, borderRadius: ITEM_SIZE / 2 },
                      isSelected && styles.clockNumberCellActive
                    ]}>
                    <Text style={[styles.clockNumberText, isSelected && styles.clockNumberActiveText]}>
                      {String(m).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Dialog actions */}
          <View style={styles.clockActions}>
            <CommonButton
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={styles.clockCancelBtn}
            />
            <CommonButton
              title="Set Time"
              onPress={handleConfirm}
              style={styles.clockSetBtn}
              textStyle={styles.submitBtnText}
            />
          </View>

        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};

export default AnalogClockPickerModal;

const styles = StyleSheet.create({
  modalRoot: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, elevation: 9999 },
  clockOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  clockCard: { backgroundColor: darkSurfaceColor, padding: wp(5), borderRadius: wp(5), width: wp(85), alignItems: 'center' },
  clockModalTitle: { ...style.fontSizeLarge, ...style.fontWeightBold, color: darkTextPrimaryColor, marginBottom: hp(2) },
  timeDisplayRow: { flexDirection: 'row', alignItems: 'center', marginBottom: hp(3) },
  timeDisplayBox: { paddingHorizontal: wp(4), paddingVertical: hp(1), borderRadius: wp(2), backgroundColor: darkBackgroundColor, borderWidth: 1, borderColor: darkBorderColor },
  timeDisplayBoxActive: { backgroundColor: 'rgba(155, 89, 182, 0.2)', borderColor: PURPLE },
  timeDisplayText: { ...style.fontSizeExtraLarge, color: darkTextSecondaryColor, ...style.fontWeightMedium },
  timeDisplayActiveText: { color: PURPLE, ...style.fontWeightBold },
  timeColon: { ...style.fontSizeExtraLarge, color: darkTextPrimaryColor, marginHorizontal: wp(2) },
  ampmDisplayColumn: { marginLeft: wp(3), gap: hp(0.5) },
  ampmMiniBtn: { paddingHorizontal: wp(2), paddingVertical: hp(0.3), borderRadius: wp(1), borderWidth: 1, borderColor: darkBorderColor },
  ampmMiniBtnActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  ampmMiniBtnText: { ...style.fontSizeSmall, color: darkTextSecondaryColor },
  ampmMiniBtnActiveText: { color: '#ffffff', ...style.fontWeightBold },
  clockDial: { backgroundColor: darkBackgroundColor, position: 'relative', marginVertical: hp(2) },
  clockCenterDot: { width: wp(2), height: wp(2), borderRadius: wp(1), backgroundColor: PURPLE, position: 'absolute', top: '50%', left: '50%', marginTop: -wp(1), marginLeft: -wp(1) },
  clockHandContainer: { position: 'absolute', width: 2, alignItems: 'center' },
  clockHandLine: { width: 2, backgroundColor: PURPLE },
  clockHandCap: { width: wp(4), height: wp(4), borderRadius: wp(2), backgroundColor: PURPLE, marginTop: -wp(2) },
  clockNumberCell: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  clockNumberCellActive: { backgroundColor: PURPLE },
  clockNumberText: { ...style.fontSizeNormal, color: darkTextPrimaryColor },
  clockNumberActiveText: { color: '#ffffff', ...style.fontWeightBold },
  clockActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: hp(3), gap: wp(3) },
  clockCancelBtn: { flex: 1 },
  clockSetBtn: { flex: 1, backgroundColor: PURPLE, borderColor: PURPLE },
  submitBtnText: { color: '#ffffff', ...style.fontWeightMedium },
});
