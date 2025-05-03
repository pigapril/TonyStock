import React, { useState, useEffect, useRef } from 'react';
import './ChatWidget.css';
import { useAuth } from '../Auth/useAuth';
import { useDialog } from '../../components/Common/Dialog/useDialog';
import { Analytics } from '../../utils/analytics'; // 引入 Analytics
import { useMediaQuery } from 'react-responsive';
import { useTranslation } from 'react-i18next'; // 1. 引入 useTranslation
import i18n from '../../i18n'; // **新增：直接引入 i18n 實例**

const ChatWidget = () => {
  const { t } = useTranslation(); // 2. 使用 hook
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
        message: t('chatWidget.loginRequired')
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

    // **取得當前語言**
    const currentLanguage = i18n.language || 'zh-TW'; // 從 i18n 實例取得，設定預設值

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}` //如果後端需要驗證，才需要這個
      },
      body: JSON.stringify({
        messages: newMessages, // 將先前的對話紀錄也傳給後端
        language: currentLanguage // **新增：將語言代碼傳給後端**
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
      // **考慮：這裡也可以加入多語言錯誤訊息**
      // const errorReply = { role: 'assistant', content: t('chatWidget.sendMessageError') };
      // setMessages(prev => [...prev, errorReply]);
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
            {t('chatWidget.headerTitle')}
            <button className="close-button" onClick={toggleChat}>{t('chatWidget.closeButton')}</button>
          </div>
          <div className="chat-body" ref={chatBodyRef}>
            {messages.length === 0 && (
              <div
                className="welcome-message"
                dangerouslySetInnerHTML={{ __html: t('chatWidget.welcomeMessage') }}
              />
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
              placeholder={t('chatWidget.inputPlaceholder')}
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
            <button onClick={sendMessage} className="send-button" aria-label={t('chatWidget.sendButton')}>
            </button>
          </div>
        </div>
      )}
      <button className="chat-toggle-button" onClick={toggleChat} aria-label={t('chatWidget.headerTitle')}>
        
      </button>
    </>
  );
};

export default ChatWidget; 