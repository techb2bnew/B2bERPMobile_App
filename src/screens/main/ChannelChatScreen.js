import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { launchImageLibrary } from 'react-native-image-picker';
import { pick, types } from '@react-native-documents/picker';
import {
  CHAT_BROADCAST_LABEL,
  CHAT_EMPTY_THREAD,
  CHAT_LOAD_ERROR,
  CHAT_MEDIA_UPLOAD_ERROR,
  CHAT_MEMBERS_SUFFIX,
  CHAT_MESSAGE_PLACEHOLDER_DIRECT,
  CHAT_MESSAGE_PLACEHOLDER_PREFIX,
  CHAT_SEARCH_NO_RESULTS,
  CHAT_SEARCH_PLACEHOLDER,
  CHAT_SEARCH_RESULTS_SUFFIX,
  CHAT_SEND_ERROR,
  CHAT_UPLOADING_MEDIA,
  CALL_EMPLOYEE_CALL_BUTTON,
  CALL_EMPLOYEE_DIALER_ERROR,
  CALL_EMPLOYEE_NO_PHONE,
} from '../../constants/Constants';
import ChatMessageContent from '../../components/ChatMessageContent';
import ChatReadReceipt from '../../components/ChatReadReceipt';
import ChatAttachModal from '../../components/Modal/ChatAttachModal';
import UserAvatar from '../../components/UserAvatar';
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
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  fetchChannelMemberLastReadAt,
  fetchChannelMessages,
  isMessageReadByPeer,
  markChannelAsRead,
  resolveChannelForChatParams,
  sendChannelMessage,
  subscribeToChannelMessages,
  subscribeToChannelReads,
} from '../../services/chatService';
import { getEmployeeProfileById } from '../../services/employeeService';
import { resolveMessageTypeForContent, uploadChatMedia } from '../../services/chatMediaService';
import { capitalizeName, heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';
const OWN_BUBBLE = '#6C3A8C';
const OTHER_BUBBLE = '#1E2A3A';
const CHAT_BG = '#0F1419';
const HORIZONTAL_PAD = wp(3.5);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = value => UUID_PATTERN.test(String(value || ''));

const MESSAGE_AVATAR_SIZE = wp(8);
const READ_RECEIPT_POLL_MS = 2500;

const ChatMessageAvatar = ({ message, backgroundColor }) => (
  <UserAvatar
    userId={message.senderId}
    name={message.name}
    imageUrl={message.avatarUrl}
    size={MESSAGE_AVATAR_SIZE}
    backgroundColor={backgroundColor || message.color}
    textStyle={styles.avatarText}
  />
);

const shouldShowAvatar = (list, index, currentUserId) => {
  const item = list[index];
  if (item.isBroadcast || item.senderId === currentUserId) {
    return false;
  }

  const next = list[index + 1];
  if (!next || next.isBroadcast) {
    return true;
  }

  return next.senderId !== item.senderId;
};

const isClusterStart = (list, index) => {
  const item = list[index];
  const prev = list[index - 1];
  if (!prev || prev.isBroadcast || item.isBroadcast) {
    return true;
  }

  return prev.senderId !== item.senderId;
};

const ChannelChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const pendingAttachRef = useRef(null);
  const pickingMediaRef = useRef(false);
  const keyboardVisibleRef = useRef(false);

  const {
    chatType = 'group',
    chatId,
    chatName,
    channelId,
    channelName,
    members = 0,
    peerId,
    memberIds,
  } = route.params || {};

  const resolvedChatName = capitalizeName(chatName || channelName || 'chat');
  const isDirect = chatType === 'direct';

  const [effectiveChannelId, setEffectiveChannelId] = useState(
    isUuid(channelId) ? channelId : isUuid(chatId) ? chatId : null,
  );
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [peerPhone, setPeerPhone] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [peerLastReadAt, setPeerLastReadAt] = useState(null);

  const isBusy = sending || uploadingMedia;

  const refreshPeerLastReadAt = useCallback(async () => {
    if (!effectiveChannelId || !isDirect || !peerId || !isSupabaseConfigured) {
      return;
    }

    try {
      const lastRead = await fetchChannelMemberLastReadAt({
        channelId: effectiveChannelId,
        userId: peerId,
      });
      setPeerLastReadAt(current => (current === lastRead ? current : lastRead));
    } catch {
      // Ignore polling errors; next refresh will retry.
    }
  }, [effectiveChannelId, isDirect, peerId]);

  const scheduleReadReceiptRefresh = useCallback(() => {
    if (!isDirect || !peerId) {
      return;
    }

    refreshPeerLastReadAt();
    setTimeout(() => refreshPeerLastReadAt(), 800);
    setTimeout(() => refreshPeerLastReadAt(), 2500);
  }, [isDirect, peerId, refreshPeerLastReadAt]);

  const appendMessage = useCallback(newMessage => {
    setMessages(current => {
      if (current.some(item => item.id === newMessage.id)) {
        return current;
      }
      return [...current, newMessage];
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!user?.id) {
        return;
      }

      let nextChannelId = isUuid(channelId) ? channelId : isUuid(chatId) ? chatId : null;

      if (isSupabaseConfigured) {
        try {
          const resolved = await resolveChannelForChatParams(user.id, {
            chatType,
            chatId,
            channelId: nextChannelId,
            chatName: resolvedChatName,
            peerId,
            memberIds,
            currentUserName: user.name,
          });
          nextChannelId = resolved.channelId || resolved.chatId;
        } catch (error) {
          if (__DEV__) {
            console.log('[chat] resolve channel failed', error?.message);
          }
        }
      }

      if (cancelled) {
        return;
      }

      setEffectiveChannelId(nextChannelId);

      if (!nextChannelId || !isSupabaseConfigured) {
        setMessages([]);
        return;
      }

      setLoading(true);
      try {
        const rows = await fetchChannelMessages(nextChannelId);
        if (!cancelled) {
          setMessages(rows);
          await markChannelAsRead({ channelId: nextChannelId, userId: user.id });
          if (isDirect && peerId) {
            const lastRead = await fetchChannelMemberLastReadAt({
              channelId: nextChannelId,
              userId: peerId,
            });
            if (!cancelled) {
              setPeerLastReadAt(lastRead);
            }
          }
        }
      } catch {
        if (!cancelled) {
          Alert.alert('Chat', CHAT_LOAD_ERROR);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [channelId, chatId, chatType, memberIds, peerId, resolvedChatName, user?.id]);

  useEffect(() => {
    if (!effectiveChannelId || !isSupabaseConfigured) {
      return undefined;
    }

    return subscribeToChannelMessages(effectiveChannelId, newMessage => {
      appendMessage(newMessage);
      if (user?.id) {
        markChannelAsRead({ channelId: effectiveChannelId, userId: user.id }).catch(() => {});
      }
      if (isDirect && peerId && newMessage.senderId === peerId) {
        scheduleReadReceiptRefresh();
      }
    });
  }, [
    appendMessage,
    effectiveChannelId,
    isDirect,
    peerId,
    scheduleReadReceiptRefresh,
    user?.id,
  ]);

  useFocusEffect(
    useCallback(() => {
      refreshPeerLastReadAt();
    }, [refreshPeerLastReadAt]),
  );

  useEffect(() => {
    if (!effectiveChannelId || !isDirect || !peerId || !isSupabaseConfigured) {
      setPeerLastReadAt(null);
      return undefined;
    }

    refreshPeerLastReadAt();

    const intervalId = setInterval(refreshPeerLastReadAt, READ_RECEIPT_POLL_MS);
    const unsubscribe = subscribeToChannelReads(effectiveChannelId, row => {
      if (row?.user_id === peerId && row?.last_read_at) {
        setPeerLastReadAt(row.last_read_at);
        return;
      }

      refreshPeerLastReadAt();
    });

    const appStateSub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        refreshPeerLastReadAt();
      }
    });

    return () => {
      clearInterval(intervalId);
      unsubscribe();
      appStateSub.remove();
    };
  }, [effectiveChannelId, isDirect, peerId, refreshPeerLastReadAt]);

  useEffect(() => {
    if (!isDirect || !peerId) {
      setPeerPhone('');
      return;
    }

    let cancelled = false;

    getEmployeeProfileById(peerId)
      .then(profile => {
        if (!cancelled) {
          setPeerPhone(profile?.phone?.trim() || '');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPeerPhone('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isDirect, peerId]);

  const visibleMessages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!searchOpen || !query) {
      return messages;
    }

    return messages.filter(item => {
      const haystack = [item.text, item.fileName, item.mediaUrl]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [messages, searchOpen, searchQuery]);

  const scrollToBottom = useCallback((animated = true, delay = 0) => {
    const runScroll = () => {
      scrollRef.current?.scrollToEnd({ animated });
    };

    if (delay > 0) {
      setTimeout(runScroll, delay);
      return;
    }

    requestAnimationFrame(runScroll);
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, event => {
      keyboardVisibleRef.current = true;
      const animationDelay =
        Platform.OS === 'ios' ? Math.max(120, event?.duration || 250) : 150;
      scrollToBottom(true, animationDelay);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardVisibleRef.current = false;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToBottom]);

  useEffect(() => {
    if (searchOpen || messages.length === 0) {
      return;
    }

    const delay = keyboardVisibleRef.current ? 180 : 80;
    scrollToBottom(true, delay);
  }, [messages.length, searchOpen, scrollToBottom]);

  const handleCallPeer = async () => {
    const digits = peerPhone.replace(/\D/g, '');

    if (!digits) {
      Alert.alert(resolvedChatName, CALL_EMPLOYEE_NO_PHONE);
      return;
    }

    try {
      await Linking.openURL(`tel:${digits}`);
    } catch {
      Alert.alert(CALL_EMPLOYEE_CALL_BUTTON, CALL_EMPLOYEE_DIALER_ERROR);
    }
  };

  const toggleSearch = () => {
    setSearchOpen(current => {
      if (current) {
        setSearchQuery('');
      }
      return !current;
    });
  };

  const placeholder = isDirect
    ? `${CHAT_MESSAGE_PLACEHOLDER_DIRECT}${resolvedChatName}`
    : `${CHAT_MESSAGE_PLACEHOLDER_PREFIX}${resolvedChatName}`;

  const handleSendMedia = async ({ uri, fileName, mimeType }) => {
    if (!uri || !effectiveChannelId || !user?.id || !isSupabaseConfigured || uploadingMedia) {
      return;
    }

    setUploadingMedia(true);
    try {
      const uploaded = await uploadChatMedia({ uri, fileName, mimeType });
      const newMessage = await sendChannelMessage({
        channelId: effectiveChannelId,
        senderId: user.id,
        senderName: user.name,
        content: uploaded.fileName,
        messageType: uploaded.messageType,
        mediaUrl: uploaded.mediaUrl,
        mediaType: uploaded.mediaType,
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize,
      });
      appendMessage(newMessage);
      if (isDirect && peerId) {
        scheduleReadReceiptRefresh();
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('[chat] media send failed:', error?.message || error);
      }
      Alert.alert('Chat', CHAT_MEDIA_UPLOAD_ERROR);
    } finally {
      setUploadingMedia(false);
    }
  };

  const runMediaPicker = async type => {
    if (pickingMediaRef.current || uploadingMedia) {
      return;
    }

    pickingMediaRef.current = true;

    try {
      if (type === 'photo' || type === 'video') {
        const result = await launchImageLibrary({
          mediaType: type === 'photo' ? 'photo' : 'video',
          selectionLimit: 1,
          quality: type === 'photo' ? 0.85 : 1,
          ...(Platform.OS === 'ios' ? { presentationStyle: 'fullScreen' } : {}),
        });

        if (result.didCancel || result.errorCode || !result.assets?.length) {
          return;
        }

        const asset = result.assets[0];
        await handleSendMedia({
          uri: asset.uri,
          fileName:
            asset.fileName ||
            (type === 'photo' ? `photo-${Date.now()}.jpg` : `video-${Date.now()}.mp4`),
          mimeType: asset.type || (type === 'photo' ? 'image/jpeg' : 'video/mp4'),
        });
        return;
      }

      if (type === 'file') {
        const [file] = await pick({
          type: [types.allFiles],
          allowMultiSelection: false,
          copyTo: 'cachesDirectory',
          ...(Platform.OS === 'ios' ? { presentationStyle: 'fullScreen' } : {}),
        });

        if (!file?.uri) {
          return;
        }

        await handleSendMedia({
          uri: file.uri,
          fileName: file.name || `file-${Date.now()}`,
          mimeType: file.type || 'application/octet-stream',
        });
      }
    } catch (error) {
      if (error?.code === 'DOCUMENT_PICKER_CANCELED' || error?.code === 'OPERATION_CANCELED') {
        return;
      }
      Alert.alert('Chat', CHAT_MEDIA_UPLOAD_ERROR);
    } finally {
      pickingMediaRef.current = false;
    }
  };

  const scheduleMediaPicker = type => {
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => runMediaPicker(type), Platform.OS === 'ios' ? 350 : 150);
    });
  };

  const handleAttachSelect = type => {
    if (pickingMediaRef.current || uploadingMedia) {
      return;
    }

    setAttachOpen(false);

    if (Platform.OS === 'ios') {
      pendingAttachRef.current = type;
      // Fallback when Modal onDismiss does not fire on some iOS builds
      setTimeout(() => {
        if (pendingAttachRef.current !== type) {
          return;
        }
        pendingAttachRef.current = null;
        scheduleMediaPicker(type);
      }, 650);
      return;
    }

    scheduleMediaPicker(type);
  };

  const handleAttachModalDismiss = () => {
    if (Platform.OS !== 'ios') {
      return;
    }

    const type = pendingAttachRef.current;
    if (!type) {
      return;
    }

    pendingAttachRef.current = null;
    scheduleMediaPicker(type);
  };

  const renderMessage = (item, index, list) => {
    const isOwn = item.senderId === user?.id;
    const clusterStart = isClusterStart(list, index);
    const showAvatar = shouldShowAvatar(list, index, user?.id);
    const marginTop = clusterStart ? hp(1.2) : hp(0.35);

    if (item.isBroadcast) {
      return (
        <View key={item.id} style={[styles.broadcastRow, { marginTop }]}>
          <View style={styles.broadcastHeader}>
            <ChatMessageAvatar message={item} />
            <Text style={styles.broadcastName}>{item.name}</Text>
            <View style={styles.broadcastBadge}>
              <Text style={styles.broadcastBadgeText}>{CHAT_BROADCAST_LABEL}</Text>
            </View>
          </View>
          <ChatMessageContent message={item} isOwn={false} />
          <Text style={styles.broadcastTime}>{item.time}</Text>
        </View>
      );
    }

    if (isOwn) {
      const isRead =
        isDirect && isMessageReadByPeer(item.createdAt, peerLastReadAt);

      return (
        <View key={item.id} style={[styles.ownRow, { marginTop }]}>
          <View style={[styles.ownBubble, !clusterStart && styles.ownBubbleStacked]}>
          <View style={styles.bubbleInner}>
            <ChatMessageContent message={item} isOwn />
            <View style={styles.ownMetaRow}>
              <Text style={styles.ownTime}>{item.time}</Text>
              {isDirect ? <ChatReadReceipt read={isRead} /> : null}
            </View>
          </View>
          </View>
        </View>
      );
    }

    return (
      <View key={item.id} style={[styles.otherRow, { marginTop }]}>
        {showAvatar ? (
          <ChatMessageAvatar message={item} />
        ) : (
          <View style={styles.avatarSpacer} />
        )}
        <View style={[styles.otherBubble, !clusterStart && styles.otherBubbleStacked]}>
          {!isDirect && clusterStart ? (
            <Text style={styles.otherName}>{item.name}</Text>
          ) : null}
          <View style={styles.bubbleInner}>
            <ChatMessageContent message={item} isOwn={false} />
            <Text style={styles.otherTime}>{item.time}</Text>
          </View>
        </View>
      </View>
    );
  };

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || isBusy) {
      return;
    }

    if (!effectiveChannelId || !user?.id || !isSupabaseConfigured) {
      Alert.alert('Chat', CHAT_SEND_ERROR);
      return;
    }

    setSending(true);
    try {
      const newMessage = await sendChannelMessage({
        channelId: effectiveChannelId,
        senderId: user.id,
        senderName: user.name,
        content: trimmed,
        messageType: resolveMessageTypeForContent(trimmed),
      });
      setMessage('');
      appendMessage(newMessage);
      if (isDirect && peerId) {
        scheduleReadReceiptRefresh();
      }
    } catch {
      Alert.alert('Chat', CHAT_SEND_ERROR);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Icon name="chevron-left" size={wp(6)} color={darkTextPrimaryColor} />
        </TouchableOpacity>

        {isDirect && peerId ? (
          <UserAvatar userId={peerId} name={resolvedChatName} size={wp(9)} />
        ) : null}

        <View style={styles.headerCenter}>
          <Text style={styles.channelTitle} numberOfLines={1}>
            {isDirect ? resolvedChatName : `# ${resolvedChatName}`}
          </Text>
          {!isDirect ? (
            <Text style={styles.memberCount}>
              {members} {CHAT_MEMBERS_SUFFIX}
            </Text>
          ) : (
            <Text style={styles.memberCount}>Direct message</Text>
          )}
        </View>

        <View style={styles.headerActions}>
          {isDirect ? (
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={handleCallPeer}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="phone" size={wp(5)} color={darkTextSecondaryColor} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={toggleSearch}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon
              name={searchOpen ? 'x' : 'search'}
              size={wp(5)}
              color={searchOpen ? PURPLE : darkTextSecondaryColor}
            />
          </TouchableOpacity>
        </View>
      </View>

      {searchOpen ? (
        <View style={styles.searchBar}>
          <Icon name="search" size={wp(4.5)} color={darkTextSecondaryColor} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={CHAT_SEARCH_PLACEHOLDER}
            placeholderTextColor={darkPlaceholderColor}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.trim() ? (
            <Text style={styles.searchCount}>
              {visibleMessages.length} {CHAT_SEARCH_RESULTS_SUFFIX}
            </Text>
          ) : null}
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'height' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={PURPLE} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            onContentSizeChange={() => {
              if (!searchOpen) {
                scrollToBottom(true, keyboardVisibleRef.current ? 10 : 0);
              }
            }}>
            {visibleMessages.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>
                  {searchOpen && searchQuery.trim()
                    ? CHAT_SEARCH_NO_RESULTS
                    : CHAT_EMPTY_THREAD}
                </Text>
              </View>
            ) : (
              visibleMessages.map((item, index) => renderMessage(item, index, visibleMessages))
            )}
          </ScrollView>
        )}

        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={() => {
              if (!isBusy && !pickingMediaRef.current) {
                setAttachOpen(true);
              }
            }}
            disabled={isBusy || pickingMediaRef.current}
            activeOpacity={0.85}>
            <Icon name="plus" size={wp(5.5)} color={darkTextSecondaryColor} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder={placeholder}
            placeholderTextColor={darkPlaceholderColor}
            multiline
            editable={!isBusy}
            onFocus={() => scrollToBottom(true, Platform.OS === 'ios' ? 280 : 180)}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!message.trim() || isBusy) && styles.sendButtonDisabled]}
            disabled={!message.trim() || isBusy}
            onPress={handleSend}
            activeOpacity={0.85}>
            {sending ? (
              <ActivityIndicator size="small" color={darkTextPrimaryColor} />
            ) : (
              <Icon name="send" size={wp(4.5)} color={darkTextPrimaryColor} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <ChatAttachModal
        visible={attachOpen}
        onClose={() => setAttachOpen(false)}
        onSelect={handleAttachSelect}
        onDismiss={handleAttachModalDismiss}
      />

      <Modal
        visible={uploadingMedia}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}>
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadCard}>
            <ActivityIndicator size="large" color={PURPLE} />
            <Text style={styles.uploadText}>{CHAT_UPLOADING_MEDIA}</Text>
          </View>
        </View>
      </Modal>
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageList: {
    flex: 1,
    backgroundColor: CHAT_BG,
  },
  messageListContent: {
    paddingHorizontal: HORIZONTAL_PAD,
    paddingTop: hp(1.5),
    paddingBottom: hp(2),
    flexGrow: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    paddingHorizontal: HORIZONTAL_PAD,
    paddingVertical: hp(1),
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
    backgroundColor: darkBackgroundColor,
  },
  searchInput: {
    flex: 1,
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
    paddingVertical: hp(0.6),
  },
  searchCount: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
  ownRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingLeft: wp(16),
  },
  otherRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingRight: wp(16),
    gap: wp(2),
  },
  bubbleInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    columnGap: wp(2),
    rowGap: hp(0.2),
  },
  ownBubble: {
    maxWidth: wp(74),
    backgroundColor: OWN_BUBBLE,
    borderRadius: wp(4),
    borderBottomRightRadius: wp(1.2),
    paddingHorizontal: wp(3.2),
    paddingVertical: hp(0.75),
  },
  ownBubbleStacked: {
    borderBottomRightRadius: wp(4),
    borderTopRightRadius: wp(1.2),
  },
  otherBubble: {
    maxWidth: wp(74),
    backgroundColor: OTHER_BUBBLE,
    borderRadius: wp(4),
    borderBottomLeftRadius: wp(1.2),
    paddingHorizontal: wp(3.2),
    paddingVertical: hp(0.75),
  },
  otherBubbleStacked: {
    borderBottomLeftRadius: wp(4),
    borderTopLeftRadius: wp(1.2),
  },
  bubbleText: {
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
    lineHeight: hp(2.35),
    flexShrink: 1,
  },
  ownBubbleText: {
    color: '#F5F5F5',
  },
  ownMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: wp(2),
    marginBottom: hp(0.1),
  },
  ownTime: {
    ...style.fontSizeSmall,
    color: 'rgba(255, 255, 255, 0.55)',
  },
  otherTime: {
    ...style.fontSizeSmall,
    color: 'rgba(255, 255, 255, 0.45)',
    marginLeft: wp(2),
    marginBottom: hp(0.1),
  },
  otherName: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightMedium,
    color: PURPLE,
    marginBottom: hp(0.2),
  },
  attachButton: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(0.15),
  },
  avatarSmall: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSpacer: {
    width: wp(8),
  },
  broadcastRow: {
    alignSelf: 'stretch',
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    padding: wp(3),
    marginBottom: hp(0.6),
  },
  broadcastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: wp(2),
    marginBottom: hp(0.6),
  },
  broadcastText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    lineHeight: hp(2.6),
  },
  broadcastTime: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginTop: hp(0.5),
    alignSelf: 'flex-end',
  },
  avatarText: {
    ...style.fontSizeSmall,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  broadcastName: {
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
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(8),
  },
  emptyText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    textAlign: 'center',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: HORIZONTAL_PAD,
    paddingVertical: hp(1.2),
    backgroundColor: darkBackgroundColor,
    borderTopWidth: 1,
    borderTopColor: darkBorderColor,
    gap: wp(2),
  },
  input: {
    flex: 1,
    backgroundColor: darkInputBgColor,
    borderRadius: wp(6),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.1),
    maxHeight: hp(12),
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
  },
  sendButton: {
    width: wp(10.5),
    height: wp(10.5),
    borderRadius: wp(5.25),
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(0.15),
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  uploadOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(8),
  },
  uploadCard: {
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(8),
    paddingVertical: hp(3),
    alignItems: 'center',
    gap: hp(1.5),
    minWidth: wp(55),
  },
  uploadText: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
});
