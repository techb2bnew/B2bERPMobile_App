import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import AiAssistant from '../../components/AiAssistant';
import AppHeader from '../../components/AppHeader';
import {
  MARK_ALL_READ,
  NOTIFICATIONS_SUBTITLE,
  NOTIFICATIONS_TITLE,
} from '../../constants/Constants';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../../utils';

const PURPLE = '#9B59B6';
const CARD_RADIUS = wp(4);
const HORIZONTAL_PAD = wp(5);
const CARD_GAP = hp(1);

const FILTERS = ['All', 'Alert', 'CRM', 'Revenue', 'Tasks', 'HR', 'AI'];

const NOTIFICATIONS = [
  {
    id: '1',
    type: 'Alert',
    icon: 'alert-triangle',
    color: '#F5A623',
    title: 'Dev team at 140% capacity',
    body: 'Sprint #14 has 42 points assigned but team capacity is 30. Reassign or defer 12 points.',
    time: '5 min ago',
    unread: true,
  },
  {
    id: '2',
    type: 'CRM',
    icon: 'zap',
    color: '#2D7DD2',
    title: 'TechCorp deal idle for 3 days',
    body: 'Proposal sent on Mar 8 (₹4.2L). No follow-up logged. Suggested action: call today.',
    time: '1 hr ago',
    unread: true,
  },
  {
    id: '3',
    type: 'Revenue',
    icon: 'dollar-sign',
    color: '#3DDC84',
    title: 'Kavya Nair closed ₹8.2L deal',
    body: 'Enterprise plan — 12-month contract. Commission: ₹82,000.',
    time: '3 hr ago',
    unread: true,
  },
  {
    id: '4',
    type: 'Tasks',
    icon: 'activity',
    color: '#F85149',
    title: 'Sprint #14 has 3 blockers',
    body: 'API integration, design review, and QA sign-off are blocking 6 tasks.',
    time: 'Yesterday',
    unread: false,
  },
  {
    id: '5',
    type: 'HR',
    icon: 'clock',
    color: PURPLE,
    title: 'Rahul Gupta late login — 4th time',
    body: 'Logged in at 10:42 AM. Policy threshold is 3 late arrivals per month.',
    time: 'Yesterday',
    unread: false,
  },
  {
    id: '6',
    type: 'AI',
    icon: 'cpu',
    color: '#2D7DD2',
    title: 'AI Weekly Summary Ready',
    body: 'Team productivity up 12%. 3 deals at risk. 2 employees flagged for burnout.',
    time: '2 days ago',
    unread: false,
  },
];

const NotificationsScreen = () => {
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered =
    activeFilter === 'All'
      ? NOTIFICATIONS
      : NOTIFICATIONS.filter(item => item.type === activeFilter);

  return (
    <View style={styles.root}>
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader title={NOTIFICATIONS_TITLE} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View style={styles.topRowLeft}>
            <Text style={styles.heading}>{NOTIFICATIONS_TITLE}</Text>
            <Text style={styles.subtitle}>{NOTIFICATIONS_SUBTITLE}</Text>
          </View>
          <TouchableOpacity style={styles.markReadButton} activeOpacity={0.8}>
            <Text style={styles.markReadText}>{MARK_ALL_READ}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}>
          {FILTERS.map(filter => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                activeFilter === filter && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(filter)}
              activeOpacity={0.8}>
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter && styles.filterTextActive,
                ]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.listSection}>
          {filtered.map(item => (
            <View key={item.id} style={styles.card}>
              <View style={[styles.iconCircle, { backgroundColor: `${item.color}22` }]}>
                <Icon name={item.icon} size={wp(5.2)} color={item.color} />
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.cardTime}>{item.time}</Text>
                </View>
                <Text style={styles.cardBody}>{item.body}</Text>
                <View style={styles.cardFooter}>
                  <View style={styles.typeTag}>
                    <Text style={styles.typeTagText}>{item.type}</Text>
                  </View>
                  {item.unread ? <View style={styles.unreadDot} /> : null}
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
    <AiAssistant />
    </View>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: darkBackgroundColor,
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PAD,
    paddingTop: hp(1.2),
    paddingBottom: hp(14),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp(2),
    gap: wp(3),
  },
  topRowLeft: {
    flex: 1,
    paddingRight: wp(2),
  },
  heading: {
    ...style.fontSizeLargeXX,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    lineHeight: hp(3.2),
  },
  subtitle: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginTop: hp(0.6),
    lineHeight: hp(2.2),
  },
  markReadButton: {
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(2.5),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1),
    marginTop: hp(0.3),
  },
  markReadText: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightThin1x,
    color: darkTextSecondaryColor,
  },
  filters: {
    gap: wp(2.5),
    paddingBottom: hp(0.5),
    marginBottom: hp(1.8),
  },
  filterChip: {
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(5),
    paddingHorizontal: wp(4.5),
    paddingVertical: hp(1),
    minHeight: hp(4.2),
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: darkSurfaceColor,
    borderColor: darkTextSecondaryColor,
  },
  filterText: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
  },
  filterTextActive: {
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  listSection: {
    gap: CARD_GAP,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: darkSurfaceColor,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    gap: wp(3),
  },
  iconCircle: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(0.2),
  },
  cardContent: {
    flex: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: wp(2),
    marginBottom: hp(0.6),
  },
  cardTitle: {
    flex: 1,
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    lineHeight: hp(2.6),
  },
  cardTime: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginTop: hp(0.3),
    minWidth: wp(16),
    textAlign: 'right',
  },
  cardBody: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    lineHeight: hp(2.4),
    marginBottom: hp(1),
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  typeTag: {
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(4),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.5),
  },
  typeTagText: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
  unreadDot: {
    width: wp(2.2),
    height: wp(2.2),
    borderRadius: wp(1.1),
    backgroundColor: '#2D7DD2',
  },
});
