import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './FAQ.css';

const FAQ = () => {
  const { t } = useTranslation();
  const [openItems, setOpenItems] = useState(new Set());

  const toggleItem = (id) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  const faqData = [
    {
      category: t('marketSentiment.enhancedDescription.content.faq.category1'),
      items: [
        {
          id: 'q1',
          question: t('marketSentiment.enhancedDescription.content.faq.q1'),
          answer: t('marketSentiment.enhancedDescription.content.faq.a1')
        },
        {
          id: 'q2',
          question: t('marketSentiment.enhancedDescription.content.faq.q2'),
          answer: t('marketSentiment.enhancedDescription.content.faq.a2')
        },
        {
          id: 'q3',
          question: t('marketSentiment.enhancedDescription.content.faq.q3'),
          answer: t('marketSentiment.enhancedDescription.content.faq.a3')
        },
        {
          id: 'q4',
          question: t('marketSentiment.enhancedDescription.content.faq.q4'),
          answer: t('marketSentiment.enhancedDescription.content.faq.a4')
        }
      ]
    },
    {
      category: t('marketSentiment.enhancedDescription.content.faq.category2'),
      items: [
        {
          id: 'q8',
          question: t('marketSentiment.enhancedDescription.content.faq.q8'),
          answer: t('marketSentiment.enhancedDescription.content.faq.a8')
        },
        {
          id: 'q9',
          question: t('marketSentiment.enhancedDescription.content.faq.q9'),
          answer: t('marketSentiment.enhancedDescription.content.faq.a9')
        }
      ]
    },
    {
      category: t('marketSentiment.enhancedDescription.content.faq.category3'),
      items: [
        {
          id: 'q10',
          question: t('marketSentiment.enhancedDescription.content.faq.q10'),
          answer: t('marketSentiment.enhancedDescription.content.faq.a10')
        },
        {
          id: 'q5',
          question: t('marketSentiment.enhancedDescription.content.faq.q5'),
          answer: t('marketSentiment.enhancedDescription.content.faq.a5')
        }
      ]
    },
    {
      category: t('marketSentiment.enhancedDescription.content.faq.category4'),
      items: [
        {
          id: 'q6',
          question: t('marketSentiment.enhancedDescription.content.faq.q6'),
          answer: t('marketSentiment.enhancedDescription.content.faq.a6')
        },
        {
          id: 'q7',
          question: t('marketSentiment.enhancedDescription.content.faq.q7'),
          answer: t('marketSentiment.enhancedDescription.content.faq.a7')
        }
      ]
    }
  ];

  return (
    <div className="market-sentiment-faq-container">
      {faqData.map((category, categoryIndex) => (
        <div key={categoryIndex} className="market-sentiment-faq-category">
          <h3 className="market-sentiment-faq-category-title">{category.category}</h3>
          <div className="market-sentiment-faq-items">
            {category.items.map((item) => (
              <div key={item.id} className="market-sentiment-faq-item">
                <button
                  className={`market-sentiment-faq-question ${openItems.has(item.id) ? 'active' : ''}`}
                  onClick={() => toggleItem(item.id)}
                  aria-expanded={openItems.has(item.id)}
                >
                  <span className="market-sentiment-faq-question-text">{item.question}</span>
                  <span className="market-sentiment-faq-icon">
                    {openItems.has(item.id) ? '−' : '+'}
                  </span>
                </button>
                <div className={`market-sentiment-faq-answer ${openItems.has(item.id) ? 'open' : ''}`}>
                  <div className="market-sentiment-faq-answer-content">
                    <p>{item.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FAQ;