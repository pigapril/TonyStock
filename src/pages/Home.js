import React from 'react';
import { Link } from 'react-router-dom';
import { FaChartLine, FaList, FaHeartbeat, FaChevronDown } from 'react-icons/fa';
import './Home.css';
import { useDialog } from '../hooks/useDialog';
import { useAuth } from '../components/Auth/useAuth'; // 更新為正確的路徑
import { Helmet } from 'react-helmet-async';

export const Home = () => {
  const { openDialog } = useDialog();
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-page">
        <Helmet>
            <script type="application/ld+json">
                {JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "WebSite",
                    "name": "Sentiment Inside Out",
                    "description": "用客觀數據，判斷市場當前情緒是恐懼還是貪婪，克服人性弱點。提供價格趨勢分析、我的追蹤清單、市場情緒指標等工具。",
                    "url": "https://sentimentinsideout.com/"
                })}
            </script>
        </Helmet>
      <div className="home-container">
        {/* Hero Section */}
        <section className="hero-section">
          <h1>掌握市場情緒</h1>
          <p className="hero-subtitle">
            用客觀數據，<br /> 判斷市場當前是恐懼還是貪婪，<br /> 克服人性弱點
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
            <div className="feature-card-header">
              <h2>價格趨勢分析</h2>
            </div>
            <div className="feature-card-footer">
              <p>運用五線譜價格位階，抓出ETF或是個股的價格趨勢，提高進出場勝率</p>
              <Link to="/priceanalysis" className="feature-link">
                了解更多 <span className="arrow">→</span>
              </Link>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-card-header">
              <h2>我的追蹤清單</h2>
            </div>
            <div className="feature-card-footer">
              <p>建立屬於你的個人清單，輕鬆查看多個標的五線譜價格位階</p>
              <Link to="/watchlist" className="feature-link">
                了解更多 <span className="arrow">→</span>
              </Link>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-card-header">
              <h2>市場情緒指標</h2>
            </div>
            <div className="feature-card-footer">
              <p>解讀市場情緒，克服人性弱點，抓住市場恐懼的入場時機</p>
              <Link to="/market-sentiment" className="feature-link">
                了解更多 <span className="arrow">→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section - 只在未登入時顯示 */}
        {!isAuthenticated && (
          <section className="cta-section">
            <button className="cta-button" onClick={() => openDialog('auth')}>
              立即登入體驗完整功能
            </button>
          </section>
        )}
      </div>
    </div>
  );
}; 