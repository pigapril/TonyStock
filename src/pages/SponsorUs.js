import React, { useState, useRef, useEffect } from 'react';
import './SponsorUs.css'; // 引入樣式表
import sponsorImage from '../assets/images/sponsor-us/sponsorus.png';
import jko_qrcode from '../assets/images/sponsor-us/jko_qrcode.jpg';
import jko_logo from '../assets/images/sponsor-us/jko_logo.png'; // 引入街口支付 Logo
import linepay_qrcode from '../assets/images/sponsor-us/linepay_qrcode.jpg';
import linepay_logo from '../assets/images/sponsor-us/linepay_logo.png'; // 引入 Line Pay Logo
import richart_qrcode from '../assets/images/sponsor-us/richart_qrcode.png'; // 引入 Richart QR Code (假設您有)
import richart_logo from '../assets/images/sponsor-us/richart_logo.png';   // 引入 Richart Logo (假設您有)
import cathay_qrcode from '../assets/images/sponsor-us/cathay_qrcode.jpg';
import cathay_logo from '../assets/images/sponsor-us/cathay_logo.jpg';
import { Helmet } from 'react-helmet-async';

const SponsorUs = () => {
  const [expandedCard, setExpandedCard] = useState(null);
  const [isCollapsing, setIsCollapsing] = useState(null); // 新增一個 state 來追蹤是否正在收合
  const cardRefs = useRef([]); // 使用 useRef 來儲存卡片的 ref

  const donationMethods = [
    // {
    //   name: '街口支付',
    //   logo: jko_logo,
    //   image: jko_qrcode,
    //   description: (
    //     <>
    //       <a href="https://service.jkopay.com/r/transfer?j=Transfer:900112965" target="_blank" rel="noopener noreferrer" style={{display: 'inline'}}>點此</a>
    //       開啟街口，或用街口掃描下方 QR Code
    //     </>
    //   ),
    // },
    // {
    //   name: 'Line Pay (iPass Money)',
    //   logo: linepay_logo, // Line Pay Logo 圖片路徑
    //   image: linepay_qrcode, // Line Pay QR Code 圖片路徑
    //   description: '用 Line Pay 掃描下方 QR Code',
    // },
    // {
    //   name: 'Richart (台新銀行)',
    //   logo: richart_logo, // Richart Logo 圖片路徑 (假設您有)
    //   image: richart_qrcode, // Richart QR Code 圖片路徑 (假設您有)
    //   description: (
    //     <>
    //       <a href="https://mobile.richart.tw/TSDIB_RichartWeb/RC04/RC040300?token=8E0E498D2E4392B5DD6EB5D452677114" target="_blank" rel="noopener noreferrer" style={{display: 'inline'}}>點此</a>
    //       開啟 Richart，或是掃描下方 QR Code 自動帶入帳號資訊，也可以手動輸入底下帳戶資訊
    //     </>
    //   ), // 您可以根據實際情況修改描述
    // },
    // {
    //   name: '國泰世華銀行',
    //   logo: cathay_logo, // cathay Logo 圖片路徑 (假設您有)
    //   image: cathay_qrcode, // cathay QR Code 圖片路徑 (假設您有)
    //   description: '用銀行 App 掃描下方 QRcode 可以自動帶入，或是手動輸入底下帳戶資訊',
    // },
    // 可以繼續添加其他的收款方式
  ];

  const handleCardClick = (index) => {
    const cardElement = cardRefs.current[index];
    if (cardElement) {
      cardElement.classList.add('overlay-active'); // 添加 overlay-active 類別
      setTimeout(() => {
        cardElement.classList.remove('overlay-active'); // 移除 overlay-active 類別
      }, 1000); // 1 秒後移除覆蓋層
    }

    if (expandedCard === index) {
      // 如果點擊的是已展開的卡片，則開始收合動畫
      setIsCollapsing(index);
      setTimeout(() => {
        setExpandedCard(null);
        setIsCollapsing(null);
      }, 400); // 等待收合動畫結束後，再將 expandedCard 設為 null
    } else {
      // 如果點擊的是未展開的卡片，則展開
      setExpandedCard(index);
      setIsCollapsing(null);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (expandedCard !== null) {
        const cardElement = cardRefs.current[expandedCard];
        if (cardElement && !cardElement.contains(event.target)) {
          // 如果點擊事件發生在卡片之外，則關閉卡片
          setIsCollapsing(expandedCard);
          setTimeout(() => {
            setExpandedCard(null);
            setIsCollapsing(null);
          }, 400);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expandedCard, cardRefs, setIsCollapsing, setExpandedCard]);

  return (
    <div className="sponsor-us-page">
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "贊助我們",
            "description": "有你/妳的幫助，網站將能持續運作、提供簡單實用的投資工具，造福更多人。",
            "url": "https://sentimentinsideout.com/sponsor-us"
          })}
        </script>
      </Helmet>
      <div className="sponsor-us-container">
        {/* 主要圖片區塊 */}
        <div className="main-image-section">
          <img src={sponsorImage} alt="小豬撲滿" />
        </div>

        {/* 文字說明區塊 */}
        <div className="text-description-section">
          <h1>贊助網站，一起幫助更多人</h1>
          <p>
            Sentiment Inside Out 網站的建置、投資工具和內容創作、防範網路攻擊...等等，<br></br>
            背後其實只有一個人在維護。<br></br><br></br>
            我希望藉由分享這些免費、簡單的工具，<br></br>幫助更多人在投資上獲得超越大盤的回報。<br></br><br></br>
            但要維持網站的運作，<br></br>每一天都要付出一定的費用和時間，<br></br>長期下來其實也是不小的負擔。<br></br><br></br>
            因此我想誠摯地邀請你/妳，<br></br>一起和我幫助更多人，<br></br>讓這個網站能繼續營運下去;<br></br>
            或者就當作是請我喝個咖啡、吃個飯，<br></br>我也會非常感激。<br></br><br></br>
            不論有無贊助，<br></br>都祝福你/妳投資順利、一切都更好！
          </p>
        </div>

        {/* 多個小卡片展示收款方式 */}
        <div className="donation-methods-section">
          <h2>若有贊助意願，請私訊 Facebook 粉絲專頁</h2>
          <div className="donation-cards-container">
            {donationMethods.map((method, index) => (
              <div
                ref={(el) => (cardRefs.current[index] = el)}
                className={`donation-card ${expandedCard === index ? 'expanded' : ''} ${isCollapsing === index ? 'collapsing' : ''}`}
                key={index}
                onClick={() => handleCardClick(index)}
              >
                <div className="overlay"></div> {/* 添加覆蓋層 */}
                <div className="content">
                  {expandedCard !== index && method.logo && <img src={method.logo} alt={method.name} />}
                  {expandedCard === index && (
                    <>
                      <h3>{method.name}</h3>
                      <p>{method.description}</p>
                      {method.image && <img src={method.image} alt={method.name} />}
                      {method.link && <a href={method.link} target="_blank" rel="noopener noreferrer">前往贊助</a>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export { SponsorUs }; 