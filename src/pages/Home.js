import React from 'react';
import { Link } from 'react-router-dom';
import { FaChevronDown } from 'react-icons/fa';
import './Home.css';
import { useDialog } from '../hooks/useDialog';
import { useAuth } from '../components/Auth/useAuth';
import { Helmet } from 'react-helmet-async';
import PageContainer from '../components/PageContainer';

export const Home = () => {
  const { openDialog } = useDialog();
  const { isAuthenticated } = useAuth();

  // 定義用於結構化數據的 JSON-LD
  const homeJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Sentiment Inside Out",
    "description": "用客觀數據，判斷市場當前情緒是恐懼還是貪婪，克服人性弱點。提供價格趨勢分析、我的追蹤清單、市場情緒指標等工具。",
    "url": "https://sentimentinsideout.com/"
  };

  return (
    <PageContainer 
      title="掌握市場情緒，克服投資人性弱點"
      description="用客觀數據，判斷市場當前情緒是恐懼還是貪婪，克服人性弱點。提供價格趨勢分析、我的追蹤清單、市場情緒指標等工具。"
      keywords="市場情緒,價格趨勢分析,追蹤清單,市場情緒指標,恐懼貪婪指數,台股,投資工具"
      ogImage="/home-og-image.png"
      ogUrl="https://sentimentinsideout.com/"
      jsonLd={homeJsonLd}
    >
      <div className="home-page">
        <div className="home-container">
          {/* 英雄區（Hero Section） */}
          <section className="hero-section">
            <h1>掌握市場情緒</h1>
            <p className="hero-subtitle">
              用客觀數據，<br /> 判斷市場當前是恐懼還是貪婪，<br /> 克服人性弱點
            </p>
            <FaChevronDown 
              className="scroll-arrow" 
              onClick={() => {
                document.querySelector('#features').scrollIntoView({ 
                  behavior: 'smooth' 
                });
              }}
            />
          </section>

          {/* 特點區段（Feature Sections） */}
          <section className="feature-section feature1" id="features">
            <div className="feature-container">
              <div className="feature-media">
                <img src="/images/home-feature1.png" alt="價格趨勢分析" />
              </div>
              <div className="feature-content">
                <h2>價格趨勢分析</h2>
                <p>運用五線譜價格位階，抓出ETF或是個股的價格趨勢，提高進出場勝率</p>
                <Link to="/priceanalysis" className="feature-link">
                  了解更多 <span className="arrow">→</span>
                </Link>
              </div>
            </div>
          </section>

          <section className="feature-section feature2">
            <div className="feature-container reverse">
              <div className="feature-media">
                <img src="/images/home-feature2.png" alt="我的追蹤清單" />
              </div>
              <div className="feature-content">
                <h2>我的追蹤清單</h2>
                <p>建立屬於你的個人清單，輕鬆查看多個標的五線譜價格位階</p>
                <Link
                  to="/watchlist"
                  className="feature-link"
                  onClick={(e) => {
                    if (!isAuthenticated) {
                      e.preventDefault(); // 阻止默認連結行為
                      openDialog('auth', { returnPath: '/watchlist' }); // 開啟登入對話框
                    }
                  }}
                >
                  了解更多 <span className="arrow">→</span>
                </Link>
              </div>
            </div>
          </section>

          <section className="feature-section feature3">
            <div className="feature-container">
              <div className="feature-media">
                <img src="/images/home-feature3.png" alt="市場情緒指標" />
              </div>
              <div className="feature-content">
                <h2>市場情緒指標</h2>
                <p>解讀市場情緒，克服人性弱點，抓住市場恐懼的入場時機</p>
                <Link to="/market-sentiment" className="feature-link">
                  了解更多 <span className="arrow">→</span>
                </Link>
              </div>
            </div>
          </section>

          {/* 行動呼籲區（CTA Section） - 只在未登入時顯示 */}
          {!isAuthenticated && (
            <section className="cta-section">
              <button className="cta-button" onClick={() => openDialog('auth')}>
                立即登入體驗完整功能
              </button>
            </section>
          )}
        </div>
      </div>
    </PageContainer>
  );
};