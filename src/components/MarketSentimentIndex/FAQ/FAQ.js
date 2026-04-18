import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './FAQ.css';

function FAQ({ activeIndicator = 'composite', faqKeyPrefix = 'marketSentiment.enhancedDescription.content.faq' }) {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState('q1');

  // Fallback to US FAQ keys when market-specific keys are missing, so we never render
  // a raw translation key if a TW key is ever removed.
  const tq = (id) => t(`${faqKeyPrefix}.${id}`, {
    defaultValue: t(`marketSentiment.enhancedDescription.content.faq.${id}`)
  });

  const items = useMemo(() => (
    Array.from({ length: 10 }, (_, index) => {
      const id = `q${index + 1}`;
      return {
        id,
        question: tq(id),
        answer: tq(`a${index + 1}`)
      };
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [t, faqKeyPrefix]);

  return (
    <div className="msiFaq">
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
