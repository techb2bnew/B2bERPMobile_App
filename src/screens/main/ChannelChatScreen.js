import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import {
  CHAT_BROADCAST_LABEL,
  CHAT_MEMBERS_SUFFIX,
  CHAT_MESSAGE_PLACEHOLDER_PREFIX,
} from '../../constants/Constants';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkInputBgColor,
  darkPlaceholderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';
const HORIZONTAL_PAD = wp(4);

const AVATAR_COLORS = ['#2D7DD2', '#9B59B6', '#E84393', '#3DDC84', '#F5A623'];

const CHANNEL_MESSAGES = {
  general: [
    {
      id: '1',
      name: 'Arjun Mehta',
      initial: 'AM',
      color: AVATAR_COLORS[0],
      time: '10:42 AM',
      text: 'CRM API integration is 80% done. Should be ready for review by EOD.',
    },
    {
      id: '2',
      name: 'Priya Sharma',
      initial: 'PS',
      color: AVATAR_COLORS[1],
      time: '10:38 AM',
      text: 'Sharing updated ClientHub v2 designs now — check the Figma link in #design.',
    },
    {
      id: '3',
      name: 'CEO Admin',
      initial: 'B2',
      color: AVATAR_COLORS[2],
      time: '10:15 AM',
      text: '🚨 Broadcast: All team leads — weekly sync moved to 4 PM today.',
      isBroadcast: true,
    },
    {
      id: '4',
      name: 'Kavya Nair',
      initial: 'KN',
      color: AVATAR_COLORS[3],
      time: '9:55 AM',
      text: 'Innovate Digital deal signed! ₹8.2L closed. 🎉 Celebrating small wins.',
    },
    {
      id: '5',
      name: 'Rahul Gupta',
      initial: 'RG',
      color: AVATAR_COLORS[4],
      time: '9:30 AM',
      text: 'Q2 LinkedIn campaign is live — early CTR looks strong at 4.8%.',
    },
  ],
  'dev-team': [
    {
      id: '1',
      name: 'Amit Kumar',
      initial: 'AK',
      color: AVATAR_COLORS[0],
      time: '11:05 AM',
      text: 'Pushed the login fix to staging — please test on Android.',
    },
    {
      id: '2',
      name: 'Sneha Patel',
      initial: 'SP',
      color: AVATAR_COLORS[1],
      time: '10:50 AM',
      text: 'Supabase RLS policies updated for employee module.',
    },
    {
      id: '3',
      name: 'Rahul Gupta',
      initial: 'RG',
      color: AVATAR_COLORS[4],
      time: '10:20 AM',
      text: 'Code review needed on PR #142 — API integration branch.',
    },
  ],
  design: [
    {
      id: '1',
      name: 'Priya Sharma',
      initial: 'PS',
      color: AVATAR_COLORS[1],
      time: '2:15 PM',
      text: 'ClientHub v2 Figma link updated — feedback welcome by EOD.',
    },
    {
      id: '2',
      name: 'Neha Singh',
      initial: 'NS',
      color: AVATAR_COLORS[2],
      time: '1:40 PM',
      text: 'Dashboard card spacing aligned with design system tokens.',
    },
  ],
  marketing: [
    {
      id: '1',
      name: 'Rahul Gupta',
      initial: 'RG',
      color: AVATAR_COLORS[4],
      time: '3:00 PM',
      text: 'Q2 LinkedIn ads CTR at 4.8% — scaling budget next week.',
    },
    {
      id: '2',
      name: 'Kavya Nair',
      initial: 'KN',
      color: AVATAR_COLORS[3],
      time: '11:30 AM',
      text: 'Innovate Digital case study draft ready for review.',
    },
  ],
  'hr-team': [
    {
      id: '1',
      name: 'Meera Joshi',
      initial: 'MJ',
      color: AVATAR_COLORS[1],
      time: '9:00 AM',
      text: 'Leave policy for Q2 is now live on the portal.',
    },
    {
      id: '2',
      name: 'CEO Admin',
      initial: 'B2',
      color: AVATAR_COLORS[2],
      time: '8:45 AM',
      text: '🚨 Broadcast: All-hands meeting scheduled for Friday 3 PM.',
      isBroadcast: true,
    },
  ],
  announcements: [
    {
      id: '1',
      name: 'CEO Admin',
      initial: 'B2',
      color: AVATAR_COLORS[2],
      time: 'Today',
      text: '🚨 Broadcast: Office will remain open on Saturday for sprint closure.',
      isBroadcast: true,
    },
    {
      id: '2',
      name: 'HR Team',
      initial: 'HR',
      color: AVATAR_COLORS[0],
      time: 'Yesterday',
      text: 'Health insurance renewal forms due by end of month.',
    },
  ],
};

const ChannelChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { channelId, channelName, members } = route.params || {};

  const [message, setMessage] = useState('');

  const messages = useMemo(
    () => CHANNEL_MESSAGES[channelId] || [],
    [channelId],
  );

  const placeholder = `${CHAT_MESSAGE_PLACEHOLDER_PREFIX}${channelName}`;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Icon name="chevron-left" size={wp(6)} color={darkTextPrimaryColor} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.channelTitle} numberOfLines={1}>
            # {channelName}
          </Text>
          <Text style={styles.memberCount}>
            {members} {CHAT_MEMBERS_SUFFIX}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIcon} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="phone" size={wp(5)} color={darkTextSecondaryColor} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="search" size={wp(5)} color={darkTextSecondaryColor} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? hp(1) : 0}>
        <ScrollView
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          showsVerticalScrollIndicator={false}>
          {messages.map(item => (
            <View
              key={item.id}
              style={[styles.messageRow, item.isBroadcast && styles.broadcastRow]}>
              <View style={[styles.avatar, { backgroundColor: item.color }]}>
                <Text style={styles.avatarText}>{item.initial}</Text>
              </View>

              <View style={styles.messageBody}>
                <View style={styles.messageHeader}>
                  <Text style={styles.senderName}>{item.name}</Text>
                  {item.isBroadcast ? (
                    <View style={styles.broadcastBadge}>
                      <Text style={styles.broadcastBadgeText}>{CHAT_BROADCAST_LABEL}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.messageTime}>{item.time}</Text>
                </View>
                <Text style={styles.messageText}>{item.text}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder={placeholder}
            placeholderTextColor={darkPlaceholderColor}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
            disabled={!message.trim()}
            activeOpacity={0.85}>
            <Icon name="send" size={wp(4.5)} color={darkTextPrimaryColor} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChannelChatScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: darkBackgroundColor,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PAD,
    paddingVertical: hp(1.4),
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
    gap: wp(2),
  },
  backButton: {
    padding: wp(1),
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
  },
  channelTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  memberCount: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginTop: hp(0.2),
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },
  headerIcon: {
    padding: wp(1),
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: HORIZONTAL_PAD,
    paddingTop: hp(2),
    paddingBottom: hp(2),
    gap: hp(2.2),
  },
  messageRow: {
    flexDirection: 'row',
    gap: wp(3),
  },
  broadcastRow: {
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    padding: wp(3),
    marginHorizontal: -wp(1),
  },
  avatar: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  messageBody: {
    flex: 1,
    minWidth: 0,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: wp(2),
    marginBottom: hp(0.4),
  },
  senderName: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  broadcastBadge: {
    backgroundColor: 'rgba(155, 89, 182, 0.25)',
    borderRadius: wp(2),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.2),
  },
  broadcastBadgeText: {
    ...style.fontSizeSmall,
    color: PURPLE,
    ...style.fontWeightMedium,
  },
  messageTime: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginLeft: 'auto',
  },
  messageText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    lineHeight: hp(2.6),
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: HORIZONTAL_PAD,
    paddingVertical: hp(1.4),
    borderTopWidth: 1,
    borderTopColor: darkBorderColor,
    gap: wp(2.5),
  },
  input: {
    flex: 1,
    backgroundColor: darkInputBgColor,
    borderRadius: wp(5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    maxHeight: hp(12),
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
  },
  sendButton: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
