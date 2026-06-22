import { capitalizeName } from '../utils';
import {
  findOrCreateDirectChannel,
  sendChannelMessage,
} from './chatService';
import { sendPushToUser } from './pushNotificationService';

export const sendCabinAlertToEmployee = async ({
  senderId,
  senderName,
  recipientId,
  recipientName,
  message,
}) => {
  const channel = await findOrCreateDirectChannel({
    userId: senderId,
    peerId: recipientId,
    peerName: recipientName,
    currentUserName: senderName,
  });

  const chatMessage = await sendChannelMessage({
    channelId: channel.id,
    senderId,
    senderName: capitalizeName(senderName),
    content: message,
    messageType: 'text',
    isBroadcast: false,
  });

  try {
    await sendPushToUser({
      recipientUserId: recipientId,
      title: capitalizeName(senderName),
      body: message,
      data: {
        type: 'cabin_call',
        senderId: String(senderId),
        senderName: capitalizeName(senderName),
        channelId: String(channel.id),
      },
    });
  } catch {
    // Chat message is already saved; push can fail if edge function is not deployed yet.
  }

  return chatMessage;
};

export const sendCabinAlertsToEmployees = async ({
  senderId,
  senderName,
  recipients,
  message,
}) => {
  const results = await Promise.allSettled(
    recipients.map(recipient =>
      sendCabinAlertToEmployee({
        senderId,
        senderName,
        recipientId: recipient.id,
        recipientName: recipient.name,
        message,
      }),
    ),
  );

  const failed = results.filter(result => result.status === 'rejected');

  if (failed.length === results.length) {
    throw failed[0]?.reason || new Error('Unable to send cabin alert');
  }

  return {
    sentCount: results.length - failed.length,
    failedCount: failed.length,
  };
};
