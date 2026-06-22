import React, { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import AiAssistantFab from './AiAssistantFab';
// import AiAssistantModal from './Modal/AiAssistantModal';
import CallEmployeeModal from './Modal/CallEmployeeModal';
import CabinAlertModal from './Modal/CabinAlertModal';
import QuickActionMenu from './QuickActionMenu';
import { MAIN_ROUTES } from '../navigation/routes';
import { useAuth } from '../context/AuthContext';
import { isReviewerUser } from '../constants/roles';

const AiAssistant = ({ badgeCount = 4 }) => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [cabinAlertVisible, setCabinAlertVisible] = useState(false);
  // const [chatVisible, setChatVisible] = useState(false);

  const showCabinAlert = useMemo(() => isReviewerUser(user), [user]);

  const handleFabPress = () => {
    setMenuVisible(true);
  };

  const handleCallEmployee = () => {
    setMenuVisible(false);
    setCallModalVisible(true);
  };

  const handleBroadcastMessage = () => {
    setMenuVisible(false);
    navigation.navigate(MAIN_ROUTES.CHAT);
  };

  const handleCabinAlert = () => {
    setMenuVisible(false);
    setCabinAlertVisible(true);
  };

  return (
    <>
      {!menuVisible ? (
        <AiAssistantFab onPress={handleFabPress} badgeCount={badgeCount} />
      ) : null}

      <QuickActionMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onCallEmployee={handleCallEmployee}
        onBroadcastMessage={handleBroadcastMessage}
        onCabinAlert={handleCabinAlert}
        showCabinAlert={showCabinAlert}
        badgeCount={badgeCount}
      />

      <CallEmployeeModal
        visible={callModalVisible}
        onClose={() => setCallModalVisible(false)}
      />

      <CabinAlertModal
        visible={cabinAlertVisible}
        onClose={() => setCabinAlertVisible(false)}
      />

      {/* Chat / assignment modal — disabled for now, keep code for later use
      <AiAssistantModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        badgeCount={badgeCount}
      />
      */}
    </>
  );
};

export default AiAssistant;
