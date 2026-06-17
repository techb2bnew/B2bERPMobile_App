import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { whiteColor } from '../constants/Color';
import { style } from '../constants/Fonts';
import { useEmployeeProfileImage } from '../hooks/useEmployeeProfileImage';
import { getMemberInitial } from '../utils/projectUtils';
import { widthPercentageToDP as wp } from '../utils';

const PURPLE = '#9B59B6';

const UserAvatar = ({
  userId,
  name,
  imageUrl: imageUrlProp,
  size = wp(8.5),
  style: containerStyle,
  textStyle,
  backgroundColor = PURPLE,
}) => {
  const { user } = useAuth();
  const [imageError, setImageError] = useState(false);
  const resolvedUserId = userId || user?.id;
  const fetchedImageUrl = useEmployeeProfileImage(
    imageUrlProp !== undefined ? null : resolvedUserId,
  );
  const imageUrl = imageUrlProp !== undefined ? imageUrlProp : fetchedImageUrl;
  const displayName = (name || user?.name || 'User').trim();
  const initial = getMemberInitial(displayName);
  const radius = size / 2;
  const fontSize = Math.round(Math.max(11, size * 0.38));
  const showInitial = !imageUrl || imageError;

  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

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
      {showInitial ? (
        <Text style={[styles.text, { fontSize }, textStyle]}>{initial}</Text>
      ) : (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          onError={() => setImageError(true)}
        />
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
    ...style.fontWeightMedium1x,
    color: whiteColor,
  },
});
