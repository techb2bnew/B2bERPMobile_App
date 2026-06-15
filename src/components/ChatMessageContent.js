import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { CHAT_TAP_TO_OPEN_FILE, CHAT_TAP_TO_PLAY_VIDEO } from '../constants/Constants';
import { darkTextPrimaryColor, darkTextSecondaryColor } from '../constants/Color';
import { style } from '../constants/Fonts';
import {
  formatFileSize,
  getMessageKind,
  normalizeUrlForOpen,
  splitTextWithLinks,
} from '../services/chatMediaService';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../utils';

const PURPLE = '#9B59B6';

const openExternalUrl = async url => {
  const normalized = normalizeUrlForOpen(url);
  if (!normalized) {
    return;
  }

  try {
    await Linking.openURL(normalized);
  } catch {
    // caller may show alert
  }
};

const LinkText = ({ text, isOwn }) => {
  const parts = splitTextWithLinks(text);

  return (
    <Text style={[styles.text, isOwn && styles.ownText]}>
      {parts.map((part, index) =>
        part.type === 'link' ? (
          <Text
            key={`${part.value}-${index}`}
            style={[styles.link, isOwn && styles.ownLink]}
            onPress={() => openExternalUrl(part.value)}>
            {part.value}
          </Text>
        ) : (
          <Text key={`${part.value}-${index}`}>{part.value}</Text>
        ),
      )}
    </Text>
  );
};

const ChatMessageContent = ({ message, isOwn }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const kind = getMessageKind(message);

  if (kind === 'image' && message.mediaUrl) {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => openExternalUrl(message.mediaUrl)}
        style={styles.mediaWrap}>
        {imageLoading ? (
          <View style={styles.mediaLoader}>
            <ActivityIndicator size="small" color={PURPLE} />
          </View>
        ) : null}
        <Image
          source={{ uri: message.mediaUrl }}
          style={styles.image}
          resizeMode="cover"
          onLoadEnd={() => setImageLoading(false)}
        />
      </TouchableOpacity>
    );
  }

  if (kind === 'video' && message.mediaUrl) {
    return (
      <TouchableOpacity
        style={styles.videoCard}
        activeOpacity={0.85}
        onPress={() => openExternalUrl(message.mediaUrl)}>
        <View style={styles.videoIconWrap}>
          <Icon name="play" size={wp(6)} color={darkTextPrimaryColor} />
        </View>
        <View style={styles.fileMeta}>
          <Text style={[styles.fileName, isOwn && styles.ownText]} numberOfLines={2}>
            {message.fileName || 'Video'}
          </Text>
          <Text style={[styles.fileHint, isOwn && styles.ownHint]}>{CHAT_TAP_TO_PLAY_VIDEO}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (kind === 'file' && message.mediaUrl) {
    const sizeLabel = formatFileSize(message.fileSize);
    return (
      <TouchableOpacity
        style={styles.fileCard}
        activeOpacity={0.85}
        onPress={() => openExternalUrl(message.mediaUrl)}>
        <View style={styles.fileIconWrap}>
          <Icon name="file-text" size={wp(5)} color={darkTextPrimaryColor} />
        </View>
        <View style={styles.fileMeta}>
          <Text style={[styles.fileName, isOwn && styles.ownText]} numberOfLines={2}>
            {message.fileName || message.text}
          </Text>
          <Text style={[styles.fileHint, isOwn && styles.ownHint]}>
            {[sizeLabel, CHAT_TAP_TO_OPEN_FILE].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (kind === 'link') {
    const linkLabel = String(message.text || '').trim();

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => openExternalUrl(linkLabel)}>
        <View style={styles.linkRow}>
          <Icon
            name="link"
            size={wp(4.2)}
            color={isOwn ? '#B8DEFF' : '#8EC5FF'}
            style={styles.linkIcon}
          />
          <Text style={[styles.linkOnlyText, isOwn && styles.ownLinkText]}>{linkLabel}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return <LinkText text={message.text} isOwn={isOwn} />;
};

export default ChatMessageContent;

const styles = StyleSheet.create({
  text: {
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
    lineHeight: hp(2.35),
    flexShrink: 1,
  },
  ownText: {
    color: '#F5F5F5',
  },
  link: {
    color: '#8EC5FF',
    textDecorationLine: 'underline',
  },
  ownLink: {
    color: '#B8DEFF',
  },
  mediaWrap: {
    borderRadius: wp(2.5),
    overflow: 'hidden',
    minWidth: wp(40),
    maxWidth: wp(58),
  },
  mediaLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    zIndex: 1,
  },
  image: {
    width: wp(58),
    height: hp(22),
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    minWidth: wp(42),
    maxWidth: wp(58),
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    minWidth: wp(42),
    maxWidth: wp(58),
  },
  videoIconWrap: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileIconWrap: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(2.5),
    backgroundColor: 'rgba(155, 89, 182, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileMeta: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  fileHint: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginTop: hp(0.2),
  },
  ownHint: {
    color: 'rgba(255,255,255,0.65)',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(1.5),
  },
  linkIcon: {
    marginTop: hp(0.15),
  },
  linkOnlyText: {
    ...style.fontSizeNormal,
    color: '#8EC5FF',
    textDecorationLine: 'underline',
    lineHeight: hp(2.35),
    maxWidth: wp(58),
  },
  ownLinkText: {
    color: '#B8DEFF',
  },
});
