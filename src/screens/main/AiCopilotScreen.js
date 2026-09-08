import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import Icon from 'react-native-vector-icons/Feather';
import AppHeader from '../../components/AppHeader';
import CopilotMessageContent from '../../components/CopilotMessageContent';
import { useAuth } from '../../context/AuthContext';
import {
  COPILOT_CAPABILITIES,
  COPILOT_DISCLAIMER,
  COPILOT_EMPTY_INPUT_PLACEHOLDER,
  COPILOT_GREETING,
  COPILOT_INSIGHTS_TITLE,
  COPILOT_QUICK_COMMANDS,
  COPILOT_QUICK_COMMANDS_TITLE,
  COPILOT_STATUS_LIVE,
  COPILOT_THINKING,
  COPILOT_TITLE,
} from '../../constants/Constants';
import {
  darkBorderColor,
  darkElevatedColor,
  darkInputBgColor,
  darkPlaceholderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import {
  askCopilot,
  clearCopilotDataCache,
} from '../../services/copilotService';
import { isOpenAiConfigured } from '../../config/openaiConfig';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';

const TypingDots = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStep(prev => (prev + 1) % 3), 320);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.typingRow}>
      {[0, 1, 2].map(index => (
        <View
          key={index}
          style={[styles.typingDot, index === step && styles.typingDotActive]}
        />
      ))}
    </View>
  );
};

const AiCopilotScreen = () => {
  const { user } = useAuth();
  const scrollRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showCapabilities, setShowCapabilities] = useState(false);

  const configured = useMemo(() => isOpenAiConfigured(), []);

  // Drop the cached snapshot when leaving the screen so it never goes stale.
  useEffect(() => clearCopilotDataCache, []);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated }));
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  const send = useCallback(
    async text => {
      const query = String(text || '').trim();
      if (!query || sending) {
        return;
      }

      const history = messages.slice(-8).map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.text,
      }));

      setMessages(prev => [...prev, { role: 'user', text: query }]);
      setInput('');
      setSending(true);

      try {
        const result = await askCopilot(query, { history, user });
        setMessages(prev => [...prev, { role: 'ai', text: result.content }]);
      } catch (err) {
        setMessages(prev => [
          ...prev,
          {
            role: 'ai',
            text: `Something went wrong: ${err?.message || 'unknown error'}. Please try again.`,
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [messages, sending, user],
  );

  const handleClear = useCallback(() => {
    setMessages([]);
    setInput('');
    clearCopilotDataCache();
  }, []);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <AppHeader
          title={COPILOT_TITLE}
          actionIcon={messages.length > 0 ? 'trash-2' : undefined}
          onActionPress={messages.length > 0 ? handleClear : undefined}
          actionAccessibilityLabel="Clear conversation"
        />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior="height"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 30}>
          {/* Status strip */}
          <View style={styles.statusBar}>
            <View style={styles.statusLeft}>
              <View style={styles.statusIcon}>
                <Icon name="cpu" size={wp(4.2)} color={darkTextPrimaryColor} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.statusTitle}>{COPILOT_TITLE}</Text>
                <View style={styles.statusRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.statusCaption} numberOfLines={1}>
                    {COPILOT_STATUS_LIVE}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setShowCapabilities(prev => !prev)}
              style={styles.capabilitiesToggle}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="What Copilot can do">
              <Icon
                name={showCapabilities ? 'chevron-up' : 'info'}
                size={wp(4)}
                color={PURPLE}
              />
            </TouchableOpacity>
          </View>

          {showCapabilities ? (
            <View style={styles.capabilitiesCard}>
              <Text style={styles.capabilitiesTitle}>{COPILOT_INSIGHTS_TITLE}</Text>
              {COPILOT_CAPABILITIES.map(item => (
                <View key={item.label} style={styles.capabilityRow}>
                  <Icon name={item.icon} size={wp(3.6)} color={PURPLE} />
                  <Text style={styles.capabilityText}>{item.label}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {!configured ? (
            <View style={styles.warningCard}>
              <Icon name="alert-triangle" size={wp(4)} color="#F5C542" />
              <Text style={styles.warningText}>
                OPENAI_API_KEY is missing — add it in src/config/openaiConfig.js.
              </Text>
            </View>
          ) : null}

          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollToBottom(false)}>
            {/* Greeting */}
            <View style={styles.aiRow}>
              <View style={styles.avatar}>
                <Icon name="cpu" size={wp(3.6)} color={darkTextPrimaryColor} />
              </View>
              <View style={styles.aiBubble}>
                <Text style={styles.greetingText}>{COPILOT_GREETING}</Text>
              </View>
            </View>

            {/* Quick commands */}
            {messages.length === 0 ? (
              <View style={styles.quickWrap}>
                <Text style={styles.quickTitle}>{COPILOT_QUICK_COMMANDS_TITLE}</Text>
                <View style={styles.quickChips}>
                  {COPILOT_QUICK_COMMANDS.map(item => (
                    <TouchableOpacity
                      key={item.label}
                      style={styles.quickChip}
                      activeOpacity={0.8}
                      disabled={sending}
                      onPress={() => send(item.prompt)}>
                      <Text style={styles.quickChipText}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Conversation */}
            {messages.map((msg, index) =>
              msg.role === 'ai' ? (
                <View key={`ai-${index}`} style={styles.aiRow}>
                  <View style={styles.avatar}>
                    <Icon name="cpu" size={wp(3.6)} color={darkTextPrimaryColor} />
                  </View>
                  <View style={styles.aiBubble}>
                    <CopilotMessageContent content={msg.text} />
                  </View>
                </View>
              ) : (
                <View key={`me-${index}`} style={styles.userRow}>
                  <View style={styles.userBubble}>
                    <Text style={styles.userText}>{msg.text}</Text>
                  </View>
                </View>
              ),
            )}

            {sending ? (
              <View style={styles.aiRow}>
                <View style={styles.avatar}>
                  <Icon name="cpu" size={wp(3.6)} color={darkTextPrimaryColor} />
                </View>
                <View style={[styles.aiBubble, styles.thinkingBubble]}>
                  <TypingDots />
                  <Text style={styles.thinkingText}>{COPILOT_THINKING}</Text>
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Input */}
          <View style={styles.footer}>
            <View style={styles.inputWrap}>
              <Icon name="cpu" size={wp(4)} color={PURPLE} />
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder={COPILOT_EMPTY_INPUT_PLACEHOLDER}
                placeholderTextColor={darkPlaceholderColor}
                multiline
                editable={!sending}
                onFocus={() => scrollToBottom(true)}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!input.trim() || sending) && styles.sendButtonDisabled,
                ]}
                disabled={!input.trim() || sending}
                onPress={() => send(input)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Send message">
                {sending ? (
                  <ActivityIndicator size="small" color={darkTextPrimaryColor} />
                ) : (
                  <Icon name="send" size={wp(4)} color={darkTextPrimaryColor} />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.disclaimer}>{COPILOT_DISCLAIMER}</Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default AiCopilotScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#06091a',
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(2),
    marginHorizontal: wp(4),
    marginTop: hp(1.2),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    flex: 1,
  },
  statusIcon: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    marginTop: hp(0.3),
  },
  liveDot: {
    width: wp(1.6),
    height: wp(1.6),
    borderRadius: wp(1),
    backgroundColor: '#3DDC84',
  },
  statusCaption: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    flexShrink: 1,
  },
  capabilitiesToggle: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(155, 89, 182, 0.14)',
  },
  capabilitiesCard: {
    marginHorizontal: wp(4),
    marginTop: hp(1),
    padding: wp(3.5),
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    gap: hp(1),
  },
  capabilitiesTitle: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    letterSpacing: 0.8,
  },
  capabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
  },
  capabilityText: {
    ...style.fontSizeSmall2x,
    color: '#a8b5d1',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    marginHorizontal: wp(4),
    marginTop: hp(1),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
    backgroundColor: 'rgba(245, 197, 66, 0.1)',
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: 'rgba(245, 197, 66, 0.3)',
  },
  warningText: {
    flex: 1,
    ...style.fontSizeSmall1x,
    color: '#F5C542',
  },
  scrollContent: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1.6),
    paddingBottom: hp(2),
    gap: hp(1.6),
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2.5),
  },
  avatar: {
    width: wp(7.5),
    height: wp(7.5),
    borderRadius: wp(3.75),
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(0.3),
  },
  aiBubble: {
    flex: 1,
    backgroundColor: darkElevatedColor,
    borderRadius: wp(3),
    borderTopLeftRadius: wp(1),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.3),
  },
  greetingText: {
    ...style.fontSizeNormal,
    color: '#e2e8f7',
    lineHeight: hp(2.5),
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  userBubble: {
    maxWidth: '85%',
    backgroundColor: PURPLE,
    borderRadius: wp(3),
    borderTopRightRadius: wp(1),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
  },
  userText: {
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
    lineHeight: hp(2.4),
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    flex: 0,
    alignSelf: 'flex-start',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.2),
  },
  typingDot: {
    width: wp(1.8),
    height: wp(1.8),
    borderRadius: wp(1),
    backgroundColor: 'rgba(155, 89, 182, 0.35)',
  },
  typingDotActive: {
    backgroundColor: PURPLE,
  },
  thinkingText: {
    ...style.fontSizeSmall1x,
    color: darkTextSecondaryColor,
  },
  quickWrap: {
    gap: hp(1),
    paddingLeft: wp(10),
  },
  quickTitle: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
  quickChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
  },
  quickChip: {
    borderWidth: 1,
    borderColor: 'rgba(155, 89, 182, 0.35)',
    backgroundColor: 'rgba(155, 89, 182, 0.12)',
    borderRadius: wp(5),
    paddingHorizontal: wp(3.2),
    paddingVertical: hp(0.8),
  },
  quickChipText: {
    ...style.fontSizeSmall1x,
    color: '#d9c7ea',
  },
  footer: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1.2),
    paddingBottom: hp(1.6),
    borderTopWidth: 1,
    borderTopColor: darkBorderColor,
    backgroundColor: darkSurfaceColor,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    backgroundColor: darkInputBgColor,
    borderRadius: wp(5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingLeft: wp(3.5),
    paddingRight: wp(1.5),
    paddingVertical: hp(0.6),
  },
  input: {
    flex: 1,
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
    maxHeight: hp(12),
    paddingVertical: hp(1),
  },
  sendButton: {
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
  disclaimer: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    textAlign: 'center',
    marginTop: hp(0.8),
  },
});
