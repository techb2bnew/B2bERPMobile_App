import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LOGO_IMAGE } from '../assets/images';
import {
  darkBackgroundColor,
  darkTextSecondaryColor,
  whiteColor,
} from '../constants/Color';
import { style } from '../constants/Fonts';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../utils';

const SplashScreen = () => {
  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sequence/Parallel animations for professional feel
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(footerOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [logoOpacity, logoScale, textOpacity, footerOpacity]);

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor={darkBackgroundColor}
        barStyle="light-content"
        translucent
      />
      
      {/* Decorative background glow elements for premium look */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.centerContent}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}>
          <Image source={LOGO_IMAGE} style={styles.logo} resizeMode="contain" />
        </Animated.View>

        <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
          <Text style={styles.appTitle}>ERP SYSTEM</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
        <Text style={styles.footerText}>Secure Enterprise Portal</Text>
        <View style={styles.loadingBarContainer}>
          <View style={styles.loadingBarPulse} />
        </View>
      </Animated.View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkBackgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowTop: {
    position: 'absolute',
    top: -hp(20),
    left: -wp(20),
    width: wp(80),
    height: wp(80),
    borderRadius: wp(40),
    backgroundColor: 'rgba(59, 105, 129, 0.1)', // Subtle primary blue glow
    blurRadius: 100,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -hp(20),
    right: -wp(20),
    width: wp(90),
    height: wp(90),
    borderRadius: wp(45),
    backgroundColor: 'rgba(192, 130, 97, 0.08)', // Subtle primary warm orange glow
    blurRadius: 100,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: wp(80),
    height: hp(15),
    justifyContent: 'center',
    alignItems: 'center',
    // marginBottom: hp(3),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(0.5),
  },
  brandBase: {
    ...style.fontSizeLarge2x,
    ...style.fontWeightBold,
    color: whiteColor,
    letterSpacing: 2,
  },
  brandMiddle: {
    ...style.fontSizeLarge2x,
    ...style.fontWeightBold,
    color: '#FF5733', // Orange/red color accent
    marginHorizontal: 2,
  },
  brandSuffix: {
    ...style.fontSizeLarge2x,
    ...style.fontWeightBold,
    color: '#C08261', // Beige/brown accent
    letterSpacing: 2,
  },
  appTitle: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextSecondaryColor,
    letterSpacing: 6,
    marginTop: hp(0.5),
  },
  footer: {
    position: 'absolute',
    bottom: hp(6),
    alignItems: 'center',
  },
  footerText: {
    ...style.fontSizeSmall1x,
    color: darkTextSecondaryColor,
    letterSpacing: 1.5,
    marginBottom: hp(1.5),
  },
  loadingBarContainer: {
    width: wp(40),
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  loadingBarPulse: {
    width: '40%',
    height: '100%',
    backgroundColor: '#C08261',
    borderRadius: 1.5,
  },
});
