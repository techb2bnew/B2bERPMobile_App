import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { darkTextPrimaryColor } from '../constants/Color';
import { style } from '../constants/Fonts';
import { useEmployeeProfileImage } from '../hooks/useEmployeeProfileImage';
import { widthPercentageToDP as wp } from '../utils';

const PURPLE = '#9B59B6';

const UserAvatar = ({
  userId,
  name,
  size = wp(8.5),
  style: containerStyle,
  textStyle,
  backgroundColor = PURPLE,
}) => {
  const { user } = useAuth();
  const resolvedUserId = userId || user?.id;
  const imageUrl = useEmployeeProfileImage(resolvedUserId);
  const initial = (name || user?.name || 'U').charAt(0).toUpperCase();
  const radius = size / 2;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor,
        },
        containerStyle,
      ]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} />
      ) : (
        <Text style={[styles.text, textStyle]}>{initial}</Text>
      )}
    </View>
  );
};

export default UserAvatar;

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  text: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
});
