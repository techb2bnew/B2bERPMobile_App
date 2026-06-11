import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const widthPercentageToDP = (percentage: number): number =>
  (width * percentage) / 100;

export const heightPercentageToDP = (percentage: number): number =>
  (height * percentage) / 100;

export const noop = () => {};

export const capitalizeName = (name = '') => {
  const trimmed = name.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

export const getFirstName = (name = '') => {
  const firstName = name.trim().split(' ')[0];
  return firstName ? capitalizeName(firstName) : '';
};
