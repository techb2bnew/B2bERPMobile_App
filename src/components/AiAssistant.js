import React, { useState } from 'react';
import AiAssistantFab from './AiAssistantFab';
import AiAssistantModal from './Modal/AiAssistantModal';

const AiAssistant = ({ badgeCount = 4 }) => {
  const [visible, setVisible] = useState(false);

  return (
    <>
      {!visible ? (
        <AiAssistantFab onPress={() => setVisible(true)} badgeCount={badgeCount} />
      ) : null}
      <AiAssistantModal
        visible={visible}
        onClose={() => setVisible(false)}
        badgeCount={badgeCount}
      />
    </>
  );
};

export default AiAssistant;
