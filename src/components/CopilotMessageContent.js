/**
 * Turns the Copilot's Markdown-ish replies into real formatting so literal **
 * and ### characters never show up on screen. React Native counterpart of the
 * admin web app's `CopilotMarkdown.tsx`.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  darkBorderColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../constants/Color';
import { style } from '../constants/Fonts';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../utils';

const PURPLE = '#9B59B6';

const renderInline = (text, keyPrefix) => {
  const parts = String(text ?? '').split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.filter(Boolean).map((part, idx) => {
    const key = `${keyPrefix}-${idx}`;

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <Text key={key} style={styles.bold}>
          {part.slice(2, -2)}
        </Text>
      );
    }

    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <Text key={key} style={styles.code}>
          {part.slice(1, -1)}
        </Text>
      );
    }

    return <Text key={key}>{part}</Text>;
  });
};

const splitTableCells = row =>
  row
    .split('|')
    .map(cell => cell.trim())
    .filter((cell, index, arr) => {
      const isLeadingEmpty = index === 0 && cell === '';
      const isTrailingEmpty = index === arr.length - 1 && cell === '';
      return !isLeadingEmpty && !isTrailingEmpty;
    });

const isSeparatorRow = row => /^[\s|:-]+$/.test(row);

const MarkdownTable = ({ rows, tableKey }) => {
  const cleaned = rows.map(row => row.trim()).filter(row => row.includes('|'));
  if (cleaned.length < 2) {
    return null;
  }

  const header = splitTableCells(cleaned[0]);
  const body = cleaned
    .slice(1)
    .filter(row => !isSeparatorRow(row))
    .map(splitTableCells);

  if (header.length === 0 || body.length === 0) {
    return null;
  }

  const columnWidth = Math.max(wp(28), wp(84) / header.length);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tableScroll}
      contentContainerStyle={styles.tableWrap}>
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeaderRow]}>
          {header.map((cell, index) => (
            <View
              key={`${tableKey}-th-${index}`}
              style={[styles.tableCell, { width: columnWidth }]}>
              <Text style={styles.tableHeaderText} numberOfLines={2}>
                {renderInline(cell, `${tableKey}-th-${index}`)}
              </Text>
            </View>
          ))}
        </View>

        {body.map((row, rowIndex) => (
          <View
            key={`${tableKey}-tr-${rowIndex}`}
            style={[
              styles.tableRow,
              rowIndex < body.length - 1 && styles.tableRowBorder,
            ]}>
            {header.map((_, colIndex) => (
              <View
                key={`${tableKey}-td-${rowIndex}-${colIndex}`}
                style={[styles.tableCell, { width: columnWidth }]}>
                <Text style={styles.tableBodyText}>
                  {renderInline(row[colIndex] ?? '', `${tableKey}-td-${rowIndex}-${colIndex}`)}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const CopilotMessageContent = ({ content }) => {
  const lines = String(content ?? '').split('\n');
  const elements = [];
  let tableBuffer = [];

  const flushTable = key => {
    if (tableBuffer.length === 0) {
      return;
    }
    const rows = tableBuffer;
    tableBuffer = [];
    elements.push(<MarkdownTable key={key} rows={rows} tableKey={key} />);
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      tableBuffer.push(line);
      return;
    }

    flushTable(`table-${index}`);

    if (/^#{1,4}\s/.test(trimmed)) {
      const text = trimmed.replace(/^#{1,4}\s/, '');
      elements.push(
        <Text key={`h-${index}`} style={styles.heading}>
          {renderInline(text, `h-${index}`)}
        </Text>,
      );
      return;
    }

    if (/^([-*•]|\d+\.)\s/.test(trimmed)) {
      const bulletText = trimmed.replace(/^([-*•]|\d+\.)\s/, '');
      elements.push(
        <View key={`li-${index}`} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>
            {renderInline(bulletText, `li-${index}`)}
          </Text>
        </View>,
      );
      return;
    }

    if (trimmed.length > 0) {
      elements.push(
        <Text key={`p-${index}`} style={styles.paragraph}>
          {renderInline(trimmed, `p-${index}`)}
        </Text>,
      );
    }
  });

  flushTable('table-end');

  return <View style={styles.container}>{elements}</View>;
};

export default CopilotMessageContent;

const styles = StyleSheet.create({
  container: {
    gap: hp(0.5),
  },
  paragraph: {
    ...style.fontSizeNormal,
    color: '#e2e8f7',
    lineHeight: hp(2.5),
  },
  heading: {
    ...style.fontSizeNormal1x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    marginTop: hp(0.8),
  },
  bold: {
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  code: {
    ...style.fontSizeSmall1x,
    color: '#c9d4ee',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2),
  },
  bulletDot: {
    ...style.fontSizeNormal,
    color: PURPLE,
    lineHeight: hp(2.5),
  },
  bulletText: {
    flex: 1,
    ...style.fontSizeNormal,
    color: '#e2e8f7',
    lineHeight: hp(2.5),
  },
  tableScroll: {
    marginVertical: hp(0.8),
  },
  tableWrap: {
    paddingRight: wp(2),
  },
  table: {
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(2.5),
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeaderRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  tableCell: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.9),
  },
  tableHeaderText: {
    ...style.fontSizeSmall1x,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  tableBodyText: {
    ...style.fontSizeSmall1x,
    color: darkTextSecondaryColor,
  },
});
