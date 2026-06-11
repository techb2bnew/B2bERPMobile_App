import React from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { LOGO_IMAGE } from '../assets/images';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
  whiteColor,
} from '../constants/Color';
import {
  COMMAND_CENTER_VERSION,
  ROLE_SELECTION_SUBTITLE,
  ROLE_SELECTION_TITLE,
  ROLES,
} from '../constants/roles';
import { style, spacings } from '../constants/Fonts';
import { AUTH_ROUTES } from '../navigation/routes';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../utils';

const CARD_GAP = wp(3);
const HORIZONTAL_PADDING = wp(5);
const CARD_WIDTH = (wp(100) - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

const RoleSelectionScreen = () => {
  const navigation = useNavigation();

  const handleRoleSelect = role => {
    navigation.navigate(AUTH_ROUTES.LOGIN, { selectedRole: role });
  };

  const renderRoleCard = ({ item }) => (
    <TouchableOpacity
      style={styles.roleCard}
      activeOpacity={0.85}
      onPress={() => handleRoleSelect(item)}>
      <View style={[styles.iconCircle, { backgroundColor: item.bgColor }]}>
        <Icon name={item.icon} size={wp(5.5)} color={whiteColor} />
      </View>
      <Text style={styles.roleTitle}>{item.title}</Text>
      <Text style={styles.roleDescription}>{item.description}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <FlatList
        data={ROLES}
        keyExtractor={item => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={
          <View style={styles.header}>
            <Image
              source={LOGO_IMAGE}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.versionText}>{COMMAND_CENTER_VERSION}</Text>
            <Text style={styles.title}>{ROLE_SELECTION_TITLE}</Text>
            <Text style={styles.subtitle}>{ROLE_SELECTION_SUBTITLE}</Text>
          </View>
        }
        renderItem={renderRoleCard}
      />
    </SafeAreaView>
  );
};

export default RoleSelectionScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: darkBackgroundColor,
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: hp(4),
  },
  header: {
    alignItems: 'center',
    paddingTop: hp(2),
    paddingBottom: hp(3),
  },
  logoImage: {
    width: wp(50),
    height: hp(6),
    marginBottom: spacings.normal,
  },
  versionText: {
    ...style.fontSizeSmall,
    ...style.fontWeightThin1x,
    color: darkTextSecondaryColor,
    letterSpacing: 1.5,
    marginBottom: hp(2.5),
  },
  title: {
    ...style.fontSizeLargeXX,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    marginBottom: spacings.small,
  },
  subtitle: {
    ...style.fontSizeNormal,
    ...style.fontWeightThin,
    color: darkTextSecondaryColor,
    textAlign: 'center',
    marginBottom: hp(1),
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },
  roleCard: {
    width: CARD_WIDTH,
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: spacings.large,
    paddingVertical: spacings.xLarge,
    minHeight: hp(16),
  },
  iconCircle: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(2.5),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacings.large,
  },
  roleTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
    marginBottom: spacings.xsmall,
  },
  roleDescription: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightThin,
    color: darkTextSecondaryColor,
    lineHeight: hp(2.2),
  },
});
