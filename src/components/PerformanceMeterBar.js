import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { darkBorderColor, darkTextSecondaryColor } from '../constants/Color';
import { style } from '../constants/Fonts';
import { KPI_SEVERITY_COLORS, kpiSeverity } from '../utils/performanceUtils';
import { heightPercentageToDP as hp } from '../utils';

const PerformanceMeterBar = ({ label, percent, caption }) => {
  const color = KPI_SEVERITY_COLORS[kpiSeverity(percent)];
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.percent, { color }]}>{Math.round(percent)}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: color }]} />
      </View>
      {caption ? (
        <Text style={styles.caption} numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
};

export default PerformanceMeterBar;

const styles = StyleSheet.create({
  container: {
    gap: hp(0.6),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  percent: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightMedium1x,
  },
  track: {
    height: hp(0.8),
    borderRadius: hp(0.4),
    backgroundColor: darkBorderColor,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: hp(0.4),
  },
  caption: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
});
