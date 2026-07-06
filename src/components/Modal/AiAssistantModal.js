import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import AiAssistantFab from '../AiAssistantFab';
import {
  AI_ASSISTANT_GREETING,
  AI_ASSISTANT_HIGHLIGHT,
  AI_ASSISTANT_INPUT_PLACEHOLDER,
  AI_ASSISTANT_POWERED_BY,
  AI_ASSISTANT_STAR,
  AI_ASSISTANT_STATUS,
  AI_ASSISTANT_TITLE,
  AI_ASSISTANT_WARNING,
  AI_PROMPT_HIRING,
  AI_PROMPT_PRODUCTS,
  AI_PROMPT_PRODUCTIVITY,
  AI_PROMPT_UNDERPERFORMING,
  AI_PROMPT_PROJECTS,
} from '../../constants/Constants';
import {
  darkAccentGreenColor,
  darkBorderColor,
  darkElevatedColor,
  darkInputBgColor,
  darkPlaceholderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';

const QUICK_PROMPTS = [
  AI_PROMPT_UNDERPERFORMING,
  AI_PROMPT_PRODUCTIVITY,
  AI_PROMPT_PROJECTS,
  AI_PROMPT_HIRING,
];

const AI_MESSAGES = [
  AI_ASSISTANT_GREETING,
  AI_ASSISTANT_HIGHLIGHT,
  AI_ASSISTANT_WARNING,
  AI_ASSISTANT_STAR,
];

const AiIcon = ({ size }) => (
  <Icon name="cpu" size={size} color={darkTextPrimaryColor} />
);

const AiAssistantModal = ({ visible, onClose, badgeCount = 4 }) => {
  const [query, setQuery] = useState('');
  const scrollRef = useRef(null);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const timer = setTimeout(() => scrollToBottom(false), 120);
    return () => clearTimeout(timer);
  }, [visible, scrollToBottom]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close AI Assistant"
        />
        <View style={styles.backdropBlur} pointerEvents="none" />
        <View style={styles.backdropFrost} pointerEvents="none" />

        <View style={styles.contentWrap}>
          <View style={styles.cardShell}>
            <View style={styles.card}>
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIcon}>
                    <AiIcon size={wp(5.5)} />
                  </View>
                  <View style={styles.headerTextWrap}>
                    <Text style={styles.headerTitle}>{AI_ASSISTANT_TITLE}</Text>
                    <View style={styles.statusRow}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>{AI_ASSISTANT_STATUS}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Icon name="x" size={wp(5)} color={darkTextSecondaryColor} />
                </TouchableOpacity>
              </View>

              <ScrollView
                ref={scrollRef}
                style={styles.body}
                contentContainerStyle={styles.bodyContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => scrollToBottom(false)}>
                <View style={styles.promptsWrap}>
                  {QUICK_PROMPTS.map(prompt => (
                    <TouchableOpacity key={prompt} style={styles.promptChip} activeOpacity={0.8}>
                      <Text style={styles.promptText}>{prompt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {AI_MESSAGES.map((msg, index) => (
                  <View key={index} style={styles.messageRow}>
                    <View style={styles.messageIcon}>
                      <AiIcon size={wp(4)} />
                    </View>
                    <View style={styles.messageBubble}>
                      <Text style={styles.messageText}>{msg}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.footer}>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    value={query}
                    onChangeText={setQuery}
                    placeholder={AI_ASSISTANT_INPUT_PLACEHOLDER}
                    placeholderTextColor={darkPlaceholderColor}
                    multiline
                    onFocus={() => scrollToBottom(true)}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, !query.trim() && styles.sendButtonDisabled]}
                    disabled={!query.trim()}
                    activeOpacity={0.85}>
                    <Icon name="send" size={wp(4.2)} color={darkTextPrimaryColor} />
                  </TouchableOpacity>
                </View>
                {/* <Text style={styles.poweredBy}>{AI_ASSISTANT_POWERED_BY}</Text> */}
              </View>
            </View>
          </View>
        </View>

        <AiAssistantFab onPress={onClose} badgeCount={badgeCount} />
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AiAssistantModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    zIndex: 1,
  },
  backdropBlur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 9, 21, 0.75)',
    zIndex: 2,
  },
  backdropFrost: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    zIndex: 3,
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingTop: hp(5),
    paddingBottom: hp(10),
    zIndex: 10,
  },
  cardShell: {
    width: '90%',
    position: "absolute",
    bottom: hp(12),
    right: wp(5),
    height: hp(80)
  },
  card: {
    flex: 1,
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(4.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4.5),
    paddingTop: hp(1.8),
    paddingBottom: hp(1.6),
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
    backgroundColor: darkSurfaceColor,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    flex: 1,
  },
  headerIcon: {
    width: wp(10.5),
    height: wp(10.5),
    borderRadius: wp(5.25),
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    marginTop: hp(0.4),
    flexWrap: 'wrap',
  },
  statusDot: {
    width: wp(1.8),
    height: wp(1.8),
    borderRadius: wp(1),
    backgroundColor: darkAccentGreenColor,
  },
  statusText: {
    ...style.fontSizeSmall,
    color: darkAccentGreenColor,
    flexShrink: 1,
  },
  closeButton: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(0.2),
  },
  body: {
    flex: 1,
    backgroundColor: darkSurfaceColor,
  },
  bodyContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: wp(4.5),
    paddingTop: hp(1.8),
    paddingBottom: hp(1.5),
    gap: hp(1.6),
  },
  promptsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    marginBottom: hp(0.5),
  },
  promptChip: {
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(5),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.85),
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  promptText: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
  },
  messageRow: {
    flexDirection: 'row',
    gap: wp(2.5),
    alignItems: 'flex-start',
  },
  messageIcon: {
    width: wp(7.5),
    height: wp(7.5),
    borderRadius: wp(3.75),
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(0.3),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  messageBubble: {
    flex: 1,
    backgroundColor: darkElevatedColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: 'rgba(48, 54, 61, 0.9)',
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
  },
  messageText: {
    ...style.fontSizeNormal,
    color: '#B8C0CC',
    lineHeight: hp(2.5),
  },
  footer: {
    paddingHorizontal: wp(4.5),
    paddingTop: hp(1.4),
    paddingBottom: hp(1.6),
    borderTopWidth: 1,
    borderTopColor: darkBorderColor,
    backgroundColor: darkSurfaceColor,
  },
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
    marginBottom: hp(0.8),
  },
  input: {
    backgroundColor: darkInputBgColor,
    borderRadius: wp(5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingLeft: wp(4),
    paddingRight: wp(14),
    paddingVertical: hp(1.3),
    minHeight: hp(5.8),
    maxHeight: hp(10),
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
  },
  sendButton: {
    position: 'absolute',
    right: wp(1.5),
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  poweredBy: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
