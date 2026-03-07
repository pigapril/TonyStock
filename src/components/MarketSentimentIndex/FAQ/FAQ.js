import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './FAQ.css';

function FAQ({ activeIndicator = 'composite' }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [openId, setOpenId] = useState('q1');

  const items = useMemo(() => ([
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
    },
    {
      id: 'q5',
      question: t('marketSentiment.enhancedDescription.content.faq.q5'),
      answer: t('marketSentiment.enhancedDescription.content.faq.a5')
    },
    {
      id: 'q6',
      question: t('marketSentiment.enhancedDescription.content.faq.q6'),
      answer: t('marketSentiment.enhancedDescription.content.faq.a6')
    },
    {
      id: 'q7',
      question: t('marketSentiment.enhancedDescription.content.faq.q7'),
      answer: t('marketSentiment.enhancedDescription.content.faq.a7')
    },
    {
      id: 'q8',
      question: t('marketSentiment.enhancedDescription.content.faq.q8'),
      answer: t('marketSentiment.enhancedDescription.content.faq.a8')
    },
    {
      id: 'q9',
      question: t('marketSentiment.enhancedDescription.content.faq.q9'),
      answer: t('marketSentiment.enhancedDescription.content.faq.a9')
    },
    {
      id: 'q10',
      question: t('marketSentiment.enhancedDescription.content.faq.q10'),
      answer: t('marketSentiment.enhancedDescription.content.faq.a10')
    }
  ]), [t]);

  const featuredIds = activeIndicator === 'composite'
    ? ['q1', 'q2', 'q4']
    : ['q3', 'q5', 'q10'];

  return (
    <div className="msiFaq">
      <div className="msiFaq__header">
        <span className="msiFaq__eyebrow">{currentLang === 'zh-TW' ? '熱門問題' : 'Popular questions'}</span>
        <div className="msiFaq__chips" role="tablist" aria-label={currentLang === 'zh-TW' ? '熱門 FAQ' : 'Popular FAQ'}>
          {featuredIds.map((id) => {
            const item = items.find((entry) => entry.id === id);
            if (!item) {
              return null;
            }

            return (
              <button
                key={id}
                type="button"
                className={`msiFaq__chip ${openId === id ? 'active' : ''}`}
                onClick={() => setOpenId(id)}
              >
                {item.question}
              </button>
            );
          })}
        </div>
      </div>

      <div className="msiFaq__list">
        {items.map((item) => {
          const isOpen = openId === item.id;

          return (
            <article key={item.id} className={`msiFaq__item ${isOpen ? 'is-open' : ''}`}>
              <button
                type="button"
                className="msiFaq__question"
                onClick={() => setOpenId(isOpen ? '' : item.id)}
                aria-expanded={isOpen}
              >
                <span className="msiFaq__questionText">{item.question}</span>
                <span className="msiFaq__icon" aria-hidden="true">{isOpen ? '−' : '+'}</span>
              </button>
              <div className={`msiFaq__answer ${isOpen ? 'is-open' : ''}`}>
                <p className="msiFaq__answerText">{item.answer}</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default FAQ;
