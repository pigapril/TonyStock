import React from 'react';
import { Link } from 'react-router-dom';
import { FaChartLine, FaList, FaHeartbeat, FaChevronDown } from 'react-icons/fa';
import './Home.css';

export const Home = () => {
  return (
    <div className="home-page">
      <div className="home-container">
        {/* Hero Section */}
        <section className="hero-section">
          <h1>掌握市場情緒</h1>
          <p className="hero-subtitle">
            用客觀數據，判斷市場當前是恐懼還是貪婪，克服人性弱點
          </p>
          
          <FaChevronDown 
            className="scroll-arrow" 
            onClick={() => {
              document.querySelector('.features-section').scrollIntoView({ 
                behavior: 'smooth' 
              });
            }}
          />
        </section>

        {/* Features Section */}
        <section className="features-section">
          <div className="feature-card">
            <div className="feature-icon">
              <FaChartLine />
            </div>
            <h2>價格趨勢分析</h2>
            <p>抓出ETF或是個股的長期價格趨勢，克服短線誘惑，提高進出場勝率</p>
            <Link to="/priceanalysis" className="feature-link">
              開始分析
              <span className="arrow">→</span>
            </Link>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <FaList />
            </div>
            <h2>我的追蹤清單</h2>
            <p>建立個人化的觀察清單，快速比較不同標的價格位階</p>
            <Link to="/watchlist" className="feature-link">
              開始追蹤
              <span className="arrow">→</span>
            </Link>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <FaHeartbeat />
            </div>
            <h2>市場情緒指標</h2>
            <p>解讀市場溫度，抓住別人恐懼我貪婪的入場時機</p>
            <Link to="/market-sentiment" className="feature-link">
              查看指標
              <span className="arrow">→</span>
            </Link>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <h2>準備好開始了嗎？</h2>
          <p>立即登入體驗完整功能</p>
          <button className="cta-button" onClick={() => {}}>
            免費註冊
          </button>
        </section>
      </div>
    </div>
  );
}; 