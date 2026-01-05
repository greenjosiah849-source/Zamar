const express = require('express');
const { WebSocketServer } = require('ws');

module.exports = (pool, redisClient) => {
  const router = express.Router();

  const wss = new WebSocketServer({ noServer: true });
  const chatConnections = new Map();

  wss.on('connection', (ws, req) => {
    const userId = req.user?.userId;
    
    if (!userId) {
      ws.close();
      return;
    }

    chatConnections.set(userId, ws);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data);
        
        await pool.query(
          'INSERT INTO chat_messages (id, sender_id, sender_username, content, chat_type, timestamp) VALUES ($1, $2, $3, $4, $5, $6)',
          [
            require('crypto').randomUUID(),
            message.senderId,
            message.senderUsername,
            message.content,
            message.chatType,
            new Date()
          ]
        );

        // Broadcast to all connected clients
        const responseMessage = JSON.stringify({
          messageId: require('crypto').randomUUID(),
          senderId: message.senderId,
          senderUsername: message.senderUsername,
          content: message.content,
          chatType: message.chatType,
          timestamp: new Date().toISOString()
        });

        wss.clients.forEach(client => {
          if (client.readyState === client.OPEN) {
            client.send(responseMessage);
          }
        });
      } catch (error) {
        console.error('Chat message error:', error);
      }
    });

    ws.on('close', () => {
      chatConnections.delete(userId);
    });
  });

  return router;
};
