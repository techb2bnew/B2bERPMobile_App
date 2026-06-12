import React, { useState } from 'react';
import AiAssistantFab from './AiAssistantFab';
// import AiAssistantModal from './Modal/AiAssistantModal';
import CallEmployeeModal from './Modal/CallEmployeeModal';
import QuickActionMenu from './QuickActionMenu';

const AiAssistant = ({ badgeCount = 4 }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [callModalVisible, setCallModalVisible] = useState(false);
  // const [chatVisible, setChatVisible] = useState(false);

  const handleFabPress = () => {
    setMenuVisible(true);
  };

  const handleCallEmployee = () => {
    setMenuVisible(false);
    setCallModalVisible(true);
  };

  const handleBroadcastMessage = () => {
    setMenuVisible(false);
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
        badgeCount={badgeCount}
      />

      <CallEmployeeModal
        visible={callModalVisible}
        onClose={() => setCallModalVisible(false)}
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
