import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './ExpandableDescription.css';
import '../global-styles.css';
export function ExpandableDescription({ 
  shortDescription,  // 簡短說明
  sections,          // 詳細說明的各個段落
  initialExpanded = false, // 是否預設展開
}) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const expandButtonText = t('expandableDescription.expand');
  const collapseButtonText = t('expandableDescription.collapse');

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div 
      className={`description-container ${isExpanded ? 'description-expanded' : ''}`}
      onClick={toggleExpand}
    >
      <div className="description-short">
        {shortDescription}
      </div>
      <div className="description-full">
        {sections.map((section, index) => (
          <div key={index} className="description-section">
            {section.title && <h4>{section.title}</h4>}
            {section.type === 'list' ? (
              <ul>
                {section.content.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>{section.content}</p>
            )}
          </div>
        ))}
      </div>
      <button 
        className={`description-toggle ${isExpanded ? 'expanded' : ''}`}
        aria-expanded={isExpanded}
      >
        {isExpanded ? collapseButtonText : expandButtonText}
      </button>
    </div>
  );
}