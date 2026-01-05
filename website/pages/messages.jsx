import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/store';
import Navigation from '../components/Navigation';

export default function Messages() {
  const { user, token } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, token]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/messages/${conversationId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: selectedConversation.id,
          message: newMessage,
        }),
      });
      setNewMessage('');
      fetchMessages(selectedConversation.id);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Navigation />
        <div className="text-center pt-20">Please login to view messages</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8 h-[calc(100vh-120px)]">
        <div className="flex gap-4 h-full">
          {/* Conversations List */}
          <div className="w-64 bg-slate-900 rounded-lg overflow-y-auto">
            <div className="p-4 border-b border-slate-800">
              <h2 className="text-lg font-bold">Messages</h2>
            </div>
            {loading ? (
              <div className="p-4 text-gray-400">Loading...</div>
            ) : (
              <div>
                {conversations.length === 0 ? (
                  <div className="p-4 text-gray-400">No conversations</div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full text-left px-4 py-3 border-b border-slate-800 hover:bg-slate-800 transition ${
                        selectedConversation?.id === conv.id ? 'bg-slate-800' : ''
                      }`}
                    >
                      <p className="font-semibold">{conv.other_user}</p>
                      <p className="text-sm text-gray-400 truncate">{conv.last_message}</p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Chat Area */}
          <div className="flex-1 bg-slate-900 rounded-lg flex flex-col">
            {selectedConversation ? (
              <>
                <div className="p-4 border-b border-slate-800">
                  <h3 className="text-lg font-bold">{selectedConversation.other_user}</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          msg.sender_id === user.id
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-800 text-gray-100'
                        }`}
                      >
                        <p>{msg.message}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 bg-slate-800 text-white px-4 py-2 rounded focus:outline-none focus:border-cyan-500 border-2 border-transparent"
                  />
                  <button
                    type="submit"
                    className="bg-cyan-600 hover:bg-cyan-700 px-6 py-2 rounded font-bold transition"
                  >
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Select a conversation to start messaging
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
