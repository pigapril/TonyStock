import React from 'react';
import { FaEnvelope } from 'react-icons/fa';
import aboutImage from '../assets/images/aboutme.jpg';
import './About.css';
import PageContainer from '../components/PageContainer';

export const About = () => {
  // 定義 JSON-LD 結構化數據
  const aboutJsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "關於 Sentiment Inside Out",
    "description": "了解 Sentiment Inside Out 網站的理念，以及如何使用簡單的分析工具，將市場當前的情緒轉化爲重要的投資指標，幫助大家克服自身的恐懼與貪婪心態。",
    "url": "https://sentimentinsideout.com/about",
    "mainEntity": {
      "@type": "Organization",
      "name": "Sentiment Inside Out",
      "email": "support@sentimentinsideout.com"
    }
  };

  return (
    <PageContainer
      title="關於本站"
      description="了解 Sentiment Inside Out 網站的理念，以及如何使用簡單的分析工具，將市場當前的情緒轉化為重要的投資指標，幫助投資者克服恐懼與貪婪心態。"
      keywords="市場情緒,投資心理,恐懼與貪婪,投資指標,情緒分析,投資策略"
      ogImage="/images/about-og.png"
      ogUrl="https://sentimentinsideout.com/about"
      ogType="website"
      ogTitle="關於 Sentiment Inside Out - 市場情緒分析平台"
      twitterCard="summary_large_image"
      twitterImage="/images/about-og.png"
      jsonLd={aboutJsonLd}
    >
      <div className="about-page">
        <div className="about-container">
          <div className="about-image">
            <img src={aboutImage} alt="About Sentiment Inside Out" />
          </div>
          
          <div className="about-content">
            <h1 className="about-title">關於 Sentiment Inside Out</h1>
            
            <div className="about-text">
              <section className="about-section">
                <h2>行情=資金＋心理</h2>
                <p>
                  這是【一個投機者的告白】作者科斯托蘭尼的名言。資金=基本面=總體經濟，心理=投資人情緒＝人性。
                  我相信循環來自於人的不理性，造就了經濟和股市的波峰與谷底。
                </p>
              </section>

              <section className="about-section">
                <h2>恐懼與貪婪</h2>
                <p>
                  經濟數據和公司財報變化需要以月、季來看待，但資本市場卻可以在短時間內大幅上下波動，
                  可見情緒對價格的影響不亞於基本面，有人擔心貴了所以賣出；有人害怕錯過所以買進。
                  身為市場參與者，應該要了解市場當前是處於恐懼或是貪婪。
                </p>
              </section>

              <section className="about-section">
                <h2>克服自己的人性</h2>
                <p>
                  我認為股價除了反應基本面，也有同樣的比重在反應市場的情緒，創立網站的初衷就是要用簡單的圖表和數據，
                  將市場當前的情緒轉化爲重要的投資指標，幫助大家克服自身的不理性，避免跟著情緒追高殺低。
                </p>
              </section>

              <section className="contact-section">
                <h2>聯絡我</h2>
                <div className="contact-info">
                  <FaEnvelope className="contact-icon" />
                  <a href="mailto:support@sentimentinsideout.com">
                  support@sentimentinsideout.com
                  </a>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}; 