import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {
  setNotificationListener,
  handleNotificationClick,
} from '../services/notificationHandlerService';
import {
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
  darkAccentGreenColor,
} from '../constants/Color';
import { style } from '../constants/Fonts';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../utils';

const NotificationBanner = () => {
  const [notification, setNotification] = useState(null);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-150)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef(null);

  const dismissNotification = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNotification(null);
    });
  }, [slideAnim, opacityAnim]);

  useEffect(() => {
    setNotificationListener(({ title, body, data }) => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setNotification({ title, body, data });

      // Animate in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: insets.top > 0 ? insets.top + 8 : 16,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide after 4 seconds
      timeoutRef.current = setTimeout(() => {
        dismissNotification();
      }, 4000);
    });

    return () => {
      setNotificationListener(null);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [insets.top, slideAnim, opacityAnim, dismissNotification]);

  const handleBannerPress = () => {
    if (notification) {
      handleNotificationClick({
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data,
      });
      dismissNotification();
    }
  };

  if (!notification) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleBannerPress}
        style={styles.innerContainer}
      >
        <View style={styles.iconContainer}>
          <Icon name="message-square" size={wp(5)} color={darkAccentGreenColor} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {notification.body}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={dismissNotification}
        >
          <Icon name="x" size={wp(4.5)} color={darkTextSecondaryColor} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default NotificationBanner;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: wp(4),
    right: wp(4),
    zIndex: 9999,
    alignItems: 'center',
  },
  innerContainer: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderLeftWidth: 4,
    borderLeftColor: darkAccentGreenColor,
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(4),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  iconContainer: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    backgroundColor: 'rgba(61, 220, 132, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
  },
  textContainer: {
    flex: 1,
    marginRight: wp(2),
  },
  title: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
    marginBottom: hp(0.2),
  },
  body: {
    ...style.fontSizeSmall1x,
    ...style.fontWeightThin,
    color: darkTextSecondaryColor,
    lineHeight: hp(2),
  },
  closeButton: {
    padding: wp(1),
  },
});
