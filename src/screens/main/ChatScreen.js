import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import AiAssistant from '../../components/AiAssistant';
import AppHeader from '../../components/AppHeader';
import {
  CHAT_CHANNELS_TITLE,
  CHAT_LABEL,
  CHAT_MEMBERS_SUFFIX,
  CHAT_SUBTITLE,
  CHAT_UNREAD_SUFFIX,
} from '../../constants/Constants';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import { MAIN_ROUTES } from '../../navigation/routes';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';
const CARD_RADIUS = wp(4);
const HORIZONTAL_PAD = wp(5);
const CARD_GAP = hp(1.2);

const CHAT_CHANNELS = [
  {
    id: 'general',
    name: 'general',
    members: 34,
    unread: 2,
    preview: 'Rahul: Q2 LinkedIn campaign is live...',
    icon: 'hash',
  },
  {
    id: 'dev-team',
    name: 'dev-team',
    members: 12,
    unread: 0,
    preview: 'Amit: Pushed the login fix to staging',
    icon: 'hash',
  },
  {
    id: 'design',
    name: 'design',
    members: 8,
    unread: 1,
    preview: 'Priya: ClientHub v2 Figma link updated',
    icon: 'hash',
  },
  {
    id: 'marketing',
    name: 'marketing',
    members: 10,
    unread: 0,
    preview: 'Kavya: Innovate Digital case study draft',
    icon: 'hash',
  },
  {
    id: 'hr-team',
    name: 'hr-team',
    members: 6,
    unread: 0,
    preview: 'Meera: Leave policy for Q2 is now live',
    icon: 'hash',
  },
  {
    id: 'announcements',
    name: 'announcements',
    members: 34,
    unread: 1,
    preview: 'CEO Admin: Office open on Saturday',
    icon: 'volume-2',
  },
];

const ChatScreen = () => {
  const navigation = useNavigation();
  const totalUnread = CHAT_CHANNELS.reduce((sum, ch) => sum + ch.unread, 0);

  const openChannel = channel => {
    navigation.navigate(MAIN_ROUTES.CHANNEL_CHAT, {
      channelId: channel.id,
      channelName: channel.name,
      members: channel.members,
    });
  };

  return (
    <View style={styles.root}>
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader title={CHAT_LABEL} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>{CHAT_SUBTITLE}</Text>

        {totalUnread > 0 ? (
          <View style={styles.unreadBanner}>
            <Icon name="message-circle" size={wp(4.2)} color={PURPLE} />
            <Text style={styles.unreadBannerText}>
              {totalUnread} {CHAT_UNREAD_SUFFIX}
            </Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{CHAT_CHANNELS_TITLE}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{CHAT_CHANNELS.length}</Text>
          </View>
        </View>

        <View style={styles.channelList}>
          {CHAT_CHANNELS.map(channel => (
            <TouchableOpacity
              key={channel.id}
              style={styles.channelCard}
              onPress={() => openChannel(channel)}
              activeOpacity={0.8}>
              <View style={styles.channelIconWrap}>
                <Icon name={channel.icon} size={wp(5)} color={PURPLE} />
              </View>

              <View style={styles.channelBody}>
                <View style={styles.channelTopRow}>
                  <Text style={styles.channelName}>#{channel.name}</Text>
                  {channel.unread > 0 ? (
                    <View style={styles.unreadDot}>
                      <Text style={styles.unreadDotText}>{channel.unread}</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.channelPreview} numberOfLines={1}>
                  {channel.preview}
                </Text>

                <View style={styles.channelMeta}>
                  <Icon name="users" size={wp(3.5)} color={darkTextSecondaryColor} />
                  <Text style={styles.channelMetaText}>
                    {channel.members} {CHAT_MEMBERS_SUFFIX}
                  </Text>
                </View>
              </View>

              <Icon name="chevron-right" size={wp(4.5)} color={darkTextSecondaryColor} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
    <AiAssistant />
    </View>
  );
};

export default ChatScreen;

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
    paddingBottom: hp(4),
  },
  subtitle: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginBottom: hp(1.8),
  },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    backgroundColor: 'rgba(155, 89, 182, 0.12)',
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: 'rgba(155, 89, 182, 0.3)',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    marginBottom: hp(2),
  },
  unreadBannerText: {
    ...style.fontSizeSmall2x,
    color: PURPLE,
    ...style.fontWeightMedium,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    marginBottom: hp(1.4),
  },
  sectionTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  countBadge: {
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    minWidth: wp(6),
    height: wp(6),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(2),
  },
  countBadgeText: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    ...style.fontWeightMedium,
  },
  channelList: {
    gap: CARD_GAP,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkSurfaceColor,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.6),
    gap: wp(3.5),
  },
  channelIconWrap: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(3),
    backgroundColor: 'rgba(155, 89, 182, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelBody: {
    flex: 1,
    minWidth: 0,
  },
  channelTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(0.4),
  },
  channelName: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
    letterSpacing: 0.2,
  },
  unreadDot: {
    backgroundColor: PURPLE,
    borderRadius: wp(3),
    minWidth: wp(5),
    height: wp(5),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(1.5),
  },
  unreadDotText: {
    ...style.fontSizeSmall,
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  channelPreview: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginBottom: hp(0.8),
  },
  channelMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },
  channelMetaText: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
});
