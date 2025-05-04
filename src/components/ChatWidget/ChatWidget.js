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
  const [categorizedFaqs, setCategorizedFaqs] = useState({}); // **修改：儲存分類化的 FAQ 資料**
  const [initialQuickRepliesLoaded, setInitialQuickRepliesLoaded] = useState(false);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
        setInitialQuickRepliesLoaded(false);
        // setMessages([]); // 選擇性：關閉時清空對話
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
      const errorReply = { role: 'assistant', content: t('chatWidget.sendMessageError') };
      setMessages(prev => [...prev, errorReply]);
    }
  };

  const handleQuickReplyClick = (question, answer) => {
    const userMessage = { role: 'user', content: question };
    const assistantMessage = { role: 'assistant', content: answer };
    setMessages(prev => [...prev, userMessage, assistantMessage]);
  };

  // **修改：處理分類點擊，支援巢狀結構**
  const handleCategoryClick = (name, dataSlice) => {
    if (!dataSlice || typeof dataSlice !== 'object') return;

    // 檢查 dataSlice 的第一個 value 是否為 object，判斷是子分類還是問題列表
    const firstValue = Object.values(dataSlice)[0];
    // 確保 firstValue 是物件且不是 null 或陣列 (FAQ 答案是字串)
    const hasSubCategories = typeof firstValue === 'object' && firstValue !== null && !Array.isArray(firstValue);

    let newMessage;
    const messageTitle = name; // 使用點擊的分類名稱作為標題

    if (hasSubCategories) {
      // 包含子分類：顯示子分類按鈕
      const subCategories = Object.keys(dataSlice);
      newMessage = {
        role: 'system',
        type: 'quick-replies',
        subType: 'categories',
        id: `qr-cat-${Date.now()}`,
        title: messageTitle, // **新增：設定標題**
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
        title: messageTitle, // **新增：設定標題**
        questions: questions
      };
    }
    setMessages(prev => [...prev, newMessage]);
  };

  // **修改：useEffect 加入初始標題**
  useEffect(() => {
    const fetchFaqAndSetInitialMessage = async () => {
      if (!isOpen || messages.length > 0 || initialQuickRepliesLoaded) {
        return;
      }

      const currentLanguage = i18n.language || 'zh-TW';
      const backendUrl = process.env.REACT_APP_API_BASE_URL || '';
      try {
        const response = await fetch(`${backendUrl}/api/chatwidget/faq/${currentLanguage}`);
        const data = await response.json();
        if (data && typeof data.faq === 'object' && Object.keys(data.faq).length > 0) {
          setCategorizedFaqs(data.faq);
          const topLevelCategories = Object.keys(data.faq);
          // **修改：根據語言過濾分類**
          const filteredCategories = topLevelCategories.filter(categoryName => {
            const isFeedbackZh = categoryName === '其他建議與回饋';
            const isFeedbackEn = categoryName === 'Feedback & Suggestions';
            const isSponsorEn = categoryName === 'Sponsor Us';
            // 如果語言不是 zh-TW 且分類是 'Sponsor Us'，則隱藏
            const shouldHideSponsor = currentLanguage !== 'zh-TW' && isSponsorEn;
            // 總是隱藏回饋分類，並根據條件隱藏贊助分類
            return !isFeedbackZh && !isFeedbackEn && !shouldHideSponsor;
          });
          const quickReplyMessage = {
            role: 'system',
            type: 'quick-replies',
            subType: 'categories',
            id: `qr-cat-initial-${Date.now()}`,
            title: t('chatWidget.quickReplyTitle'), // **新增：設定初始標題**
            // **修改：使用過濾後的分類列表**
            categories: filteredCategories.map(catName => ({
              name: catName,
              data: data.faq[catName]
            }))
          };
          setMessages([quickReplyMessage]);
          setInitialQuickRepliesLoaded(true);
        } else {
          console.error("Invalid FAQ data structure received:", data);
          // 可以考慮顯示錯誤訊息給使用者
        }
      } catch (error) {
        console.error('Error fetching FAQ data:', error);
        // 可以考慮顯示錯誤訊息給使用者
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
            <button className="close-button" onClick={toggleChat}>{t('chatWidget.closeButton', '關閉')}</button> {/* 提供預設值 */}
          </div>
          <div className="chat-body" ref={chatBodyRef}>
            {(() => {
              return messages.map((msg, index) => {
                if (msg.type === 'quick-replies') {
                  // **修改：總是顯示標題 (如果存在)**
                  return (
                    <div key={msg.id || index} className={`chat-message ${msg.role || 'system'} quick-replies-message-container`}>
                      {/* 檢查 msg.title 是否存在，並顯示 */}
                      {msg.title && (
                        <p
                          className="quick-replies-title"
                          // 初始標題可能包含 HTML，其他層級標題是純文字
                          {...(index === 0 && msg.title === t('chatWidget.quickReplyTitle') // 假設初始標題總是第一個訊息
                            ? { dangerouslySetInnerHTML: { __html: msg.title } }
                            : {})}
                        >
                          {/* 如果不是初始標題，直接顯示文字 */}
                          {index !== 0 || msg.title !== t('chatWidget.quickReplyTitle') ? msg.title : null}
                        </p>
                      )}

                      {/* 情況一：顯示分類或子分類按鈕 */}
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
                      {/* 情況二：顯示問題按鈕 */}
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
                // 渲染一般使用者或助理訊息
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