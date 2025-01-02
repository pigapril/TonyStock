import React from 'react';
import { Link } from 'react-router-dom';
import aboutImage from '../assets/images/aboutme.jpg';
import './About.css';

export const About = () => {
  return (
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
          </div>
        </div>
      </div>
    </div>
  );
}; 