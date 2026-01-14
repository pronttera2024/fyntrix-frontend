import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'aris';
  timestamp: Date;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm ARIS, your intelligent trading assistant. How can I help you today? 🤖",
      sender: 'aris',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:8000/v1/chat', {
        message: userMessage.text,
        conversation_id: 'user-session', // Could be from user context
        session_id: 'user-session'
      });

      const arisMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.response || response.data.message || 'Sorry, I couldn\'t process that.',
        sender: 'aris',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, arisMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Oops! I\'m having trouble connecting. Please try again in a moment.',
        sender: 'aris',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 12,
        width: '90%',
        maxWidth: 400,
        height: '80%',
        maxHeight: 600,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18
            }}>
              🤖
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>ARIS Support</h3>
              <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>Always here to help</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: 24,
              cursor: 'pointer',
              padding: 4,
              borderRadius: 4,
              opacity: 0.7
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                alignSelf: message.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                padding: '12px 16px',
                borderRadius: message.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                backgroundColor: message.sender === 'user' ? '#667eea' : '#f3f4f6',
                color: message.sender === 'user' ? 'white' : '#374151',
                fontSize: 14,
                lineHeight: 1.4,
                wordWrap: 'break-word'
              }}
            >
              {message.text}
            </div>
          ))}
          {isLoading && (
            <div style={{
              alignSelf: 'flex-start',
              padding: '12px 16px',
              borderRadius: '18px 18px 18px 4px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              fontSize: 14
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div>ARIS is typing</div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <div style={{ width: 4, height: 4, backgroundColor: '#9ca3af', borderRadius: '50%', animation: 'bounce 1.4s ease-in-out infinite both' }}></div>
                  <div style={{ width: 4, height: 4, backgroundColor: '#9ca3af', borderRadius: '50%', animation: 'bounce 1.4s ease-in-out 0.16s infinite both' }}></div>
                  <div style={{ width: 4, height: 4, backgroundColor: '#9ca3af', borderRadius: '50%', animation: 'bounce 1.4s ease-in-out 0.32s infinite both' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: 12,
          alignItems: 'center'
        }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: 24,
              fontSize: 14,
              outline: 'none',
              backgroundColor: isLoading ? '#f9fafb' : 'white'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: 'none',
              backgroundColor: (!inputValue.trim() || isLoading) ? '#e5e7eb' : '#667eea',
              color: 'white',
              cursor: (!inputValue.trim() || isLoading) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16
            }}
          >
            ➤
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes bounce {
            0%, 80%, 100% {
              transform: scale(0);
            }
            40% {
              transform: scale(1);
            }
          }
        `}
      </style>
    </div>
  );
};
