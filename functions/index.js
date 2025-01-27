const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

exports.sendNotificationOnMessage = onDocumentWritten(
    "chats/{chatId}",
    async (change, context) => {
      const chatId = context.params.chatId;
      const after = change.after.data();
      const lastMessage = after.messages[after.messages.length - 1];

      // Avoid sending notifications to the sender
      if (lastMessage.sentBy === lastMessage.receivedBy) {
        return null;
      }

      // Get recipient's FCM token
      const recipientDoc = await admin
          .firestore()
          .collection("users")
          .doc(lastMessage.receivedBy)
          .get();
      const recipientToken = recipientDoc.data().fcmToken;

      if (!recipientToken) {
        console.log("Recipient token not found.");
        return null;
      }

      // Send notification
      const payload = {
        notification: {
          title: "New Message",
          body: lastMessage.text || "You have a new message!",
        },
        data: {
          chatId, // Pass chat ID for navigation
        },
        token: recipientToken,
      };

      try {
        await admin.messaging().send(payload);
        console.log("Notification sent successfully.");
      } catch (error) {
        console.error("Error sending notification:", error);
      }
      return null;
    },
);
