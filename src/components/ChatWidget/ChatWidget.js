import React, { useState, useEffect, useRef } from 'react';
import './ChatWidget.css';
import { useAuth } from '../Auth/useAuth';
import { useDialog } from '../../components/Common/Dialog/useDialog';
import { Analytics } from '../../utils/analytics'; // 引入 Analytics
import { useMediaQuery } from 'react-responsive';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const chatWidgetRef = useRef(null);
  const chatBodyRef = useRef(null);
  const [isComposing, setIsComposing] = useState(false);
  const { user } = useAuth();
  const { openDialog } = useDialog();
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' }); // 判斷是否為行動裝置
  const inputRef = useRef(null); // 建立 input 元素的 ref

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    if (!user) {
      Analytics.auth.loginRequired({
        from: 'chat_widget'
      });
      openDialog('auth', {
        message: '需要登入才能使用客服功能'
      });
      return;
    }
    
    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');

    // API 金鑰請從環境變數中獲取，避免前端暴露金鑰
    const apiKey = process.env.REACT_APP_AKASHCHAT_API_KEY || ''
    const backendUrl = process.env.REACT_APP_API_BASE_URL || ''; // 從環境變數讀取後端 URL

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}` //如果後端需要驗證，才需要這個
      },
      body: JSON.stringify({
        messages: newMessages // 將先前的對話紀錄也傳給後端
      })
    };

    try {
      // 修改為呼叫您的後端 API，路徑調整為 /api/chatwidget/chat
      const response = await fetch(`${backendUrl}/api/chatwidget/chat`, requestOptions);
      const data = await response.json();
      if (data.reply) {
        const reply = {role: 'assistant', content: data.reply};
        setMessages(prev => [...prev, reply]);
        if (isMobile && inputRef.current) {
          inputRef.current.blur(); // 讓 input 失去焦點，收起鍵盤 (僅限行動裝置)
        }
      } else {
        console.error("無回覆訊息", data);
      }
    } catch (error) {
      console.error("發送訊息錯誤：", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && chatWidgetRef.current && !chatWidgetRef.current.contains(event.target) && !event.target.classList.contains('chat-toggle-button')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, chatWidgetRef]);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      if (!isMobile) {
        inputRef.current.focus();
      }
    }
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div className={`chat-widget ${!isOpen ? 'closed' : ''} ${isMobile ? 'mobile-fullscreen' : ''}`} ref={chatWidgetRef} /* onClick={toggleChat} */>
          <div className="chat-header">
            小豬客服
            <button className="close-button" onClick={toggleChat}>✖</button>
          </div>
          <div className="chat-body" ref={chatBodyRef}>
            {messages.length === 0 && (
              <div className="welcome-message">
                你好~<br />對網站功能有疑問嗎？<br />由小豬客服解答！
              </div>
            )}
            {messages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.role}`}>
                {msg.content}
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input 
              type="text"
              placeholder="輸入訊息..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!isComposing) {
                    sendMessage();
                  }
                }
              }}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              ref={inputRef}
            />
            <button onClick={sendMessage} className="send-button">
            </button>
          </div>
        </div>
      )}
      <button className="chat-toggle-button" onClick={toggleChat}>
        
      </button>
    </>
  );
};

export default ChatWidget; 