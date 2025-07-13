import React, { useState, useEffect, useRef } from 'react';
import './ChatWidget.css';
import { useAuth } from '../Auth/useAuth';
import { useDialog } from '../../components/Common/Dialog/useDialog';
import { Analytics } from '../../utils/analytics';
import { useMediaQuery } from 'react-responsive';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import apiClient from '../../api/apiClient'; // **新增：引入共用的 apiClient**

const ChatWidget = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const chatWidgetRef = useRef(null);
  const chatBodyRef = useRef(null);
  const [isComposing, setIsComposing] = useState(false);
  const { user } = useAuth();
  const { openDialog } = useDialog();
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });
  const inputRef = useRef(null);
  const [categorizedFaqs, setCategorizedFaqs] = useState({});
  const [initialQuickRepliesLoaded, setInitialQuickRepliesLoaded] = useState(false);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
        setInitialQuickRepliesLoaded(false);
    }
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

    // API 金鑰請從環境變數中獲取
    const apiKey = process.env.REACT_APP_AKASHCHAT_API_KEY || '';
    // **移除：不再需要手動讀取後端 URL**
    // const backendUrl = process.env.REACT_APP_API_BASE_URL || '';

    const currentLanguage = i18n.language || 'zh-TW';

    try {
      // **修改：使用 apiClient.post 取代 fetch**
      const response = await apiClient.post('/api/chatwidget/chat', 
        { // 請求主體 (body)
          messages: newMessages,
          language: currentLanguage
        }, 
        { // Axios 配置 (config)
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      
      // **修改：Axios 的回應資料在 response.data 中**
      const data = response.data;
      if (data.reply) {
        const reply = {role: 'assistant', content: data.reply};
        setMessages(prev => [...prev, reply]);
        if (isMobile && inputRef.current) {
          inputRef.current.blur();
        }
      } else {
        console.error("無回覆訊息", data);
      }
    } catch (error) {
      console.error("發送訊息錯誤：", error);
      const errorReply = { role: 'assistant', content: t('chatWidget.sendMessageError') };
      setMessages(prev => [...prev, errorReply]);
    }
  };

  const handleQuickReplyClick = (question, answer) => {
    const userMessage = { role: 'user', content: question };
    const assistantMessage = { role: 'assistant', content: answer };
    setMessages(prev => [...prev, userMessage, assistantMessage]);
  };

  const handleCategoryClick = (name, dataSlice) => {
    if (!dataSlice || typeof dataSlice !== 'object') return;

    const firstValue = Object.values(dataSlice)[0];
    const hasSubCategories = typeof firstValue === 'object' && firstValue !== null && !Array.isArray(firstValue);

    let newMessage;
    const messageTitle = name;

    if (hasSubCategories) {
      const subCategories = Object.keys(dataSlice);
      newMessage = {
        role: 'system',
        type: 'quick-replies',
        subType: 'categories',
        id: `qr-cat-${Date.now()}`,
        title: messageTitle,
        categories: subCategories.map(subCatName => ({
          name: subCatName,
          data: dataSlice[subCatName]
        }))
      };
    } else {
      const questions = Object.keys(dataSlice).map(q => ({
        question: q,
        answer: dataSlice[q]
      }));
      newMessage = {
        role: 'system',
        type: 'quick-replies',
        subType: 'questions',
        id: `qr-q-${Date.now()}`,
        title: messageTitle,
        questions: questions
      };
    }
    setMessages(prev => [...prev, newMessage]);
  };

  useEffect(() => {
    const fetchFaqAndSetInitialMessage = async () => {
      if (!isOpen || messages.length > 0 || initialQuickRepliesLoaded) {
        return;
      }

      const currentLanguage = i18n.language || 'zh-TW';
      // **移除：不再需要手動讀取後端 URL**
      // const backendUrl = process.env.REACT_APP_API_BASE_URL || '';
      try {
        // **修改：使用 apiClient.get 取代 fetch**
        const response = await apiClient.get(`/api/chatwidget/faq/${currentLanguage}`);
        
        // **修改：Axios 的回應資料在 response.data 中**
        const data = response.data;
        if (data && typeof data.faq === 'object' && Object.keys(data.faq).length > 0) {
          setCategorizedFaqs(data.faq);
          const topLevelCategories = Object.keys(data.faq);
          const filteredCategories = topLevelCategories.filter(categoryName => {
            const isFeedbackZh = categoryName === '其他建議與回饋';
            const isFeedbackEn = categoryName === 'Feedback & Suggestions';
            const isSponsorEn = categoryName === 'Sponsor Us';
            const shouldHideSponsor = currentLanguage !== 'zh-TW' && isSponsorEn;
            return !isFeedbackZh && !isFeedbackEn && !shouldHideSponsor;
          });
          const quickReplyMessage = {
            role: 'system',
            type: 'quick-replies',
            subType: 'categories',
            id: `qr-cat-initial-${Date.now()}`,
            title: t('chatWidget.quickReplyTitle'),
            categories: filteredCategories.map(catName => ({
              name: catName,
              data: data.faq[catName]
            }))
          };
          setMessages([quickReplyMessage]);
          setInitialQuickRepliesLoaded(true);
        } else {
          console.error("Invalid FAQ data structure received:", data);
        }
      } catch (error) {
        console.error('Error fetching FAQ data:', error);
      }
    };

    fetchFaqAndSetInitialMessage();
  }, [isOpen, i18n.language, initialQuickRepliesLoaded, t]);

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
        <div className={`chat-widget ${!isOpen ? 'closed' : ''} ${isMobile ? 'mobile-fullscreen' : ''}`} ref={chatWidgetRef}>
          <div className="chat-header">
            {t('chatWidget.headerTitle')}
            <button className="close-button" onClick={toggleChat}>{t('chatWidget.closeButton', '關閉')}</button>
          </div>
          <div className="chat-body" ref={chatBodyRef}>
            {(() => {
              return messages.map((msg, index) => {
                if (msg.type === 'quick-replies') {
                  return (
                    <div key={msg.id || index} className={`chat-message ${msg.role || 'system'} quick-replies-message-container`}>
                      {msg.title && (
                        <p
                          className="quick-replies-title"
                          {...(index === 0 && msg.title === t('chatWidget.quickReplyTitle')
                            ? { dangerouslySetInnerHTML: { __html: msg.title } }
                            : {})}
                        >
                          {index !== 0 || msg.title !== t('chatWidget.quickReplyTitle') ? msg.title : null}
                        </p>
                      )}
                      {msg.subType === 'categories' && msg.categories && (
                        <>
                          {msg.categories.map((categoryData) => (
                            <button
                              key={categoryData.name}
                              className="quick-reply-button-inline"
                              onClick={() => handleCategoryClick(categoryData.name, categoryData.data)}
                            >
                              {categoryData.name}
                            </button>
                          ))}
                        </>
                      )}
                      {msg.subType === 'questions' && msg.questions && (
                        <>
                          {msg.questions.map((q) => (
                            <button
                              key={q.question}
                              className="quick-reply-button-inline"
                              onClick={() => handleQuickReplyClick(q.question, q.answer)}
                            >
                              {q.question}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  );
                }
                else if (msg.role && msg.content) {
                  return (
                    <div key={msg.id || index} className={`chat-message ${msg.role}`}>
                      {msg.content}
                    </div>
                  );
                }
                return null;
              });
            })()}
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