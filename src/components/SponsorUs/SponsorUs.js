import React, { useState, useRef, useEffect, useMemo } from 'react';
import './SponsorUs.css'; // 引入樣式表
import sponsorImage from '../../assets/images/sponsor-us/sponsorus.png';
import mobile_payment_qrcode from '../../assets/images/sponsor-us/mobile_payment_qrcode.png';
import mobile_payment_logo from '../../assets/images/sponsor-us/mobile_payment_logo.png';
//import linepay_qrcode from '../../assets/images/sponsor-us/linepay_qrcode.jpg';
//import linepay_logo from '../../assets/images/sponsor-us/linepay_logo.png';
//import richart_qrcode from '../../assets/images/sponsor-us/richart_qrcode.png'; 
//import richart_logo from '../../assets/images/sponsor-us/richart_logo.png';  
//import cathay_qrcode from '../../assets/images/sponsor-us/cathay_qrcode.jpg';
//import cathay_logo from '../../assets/images/sponsor-us/cathay_logo.jpg';
//import ctb_logo from '../../assets/images/sponsor-us/ctbc_logo.png';  
import creditcard_logo from '../../assets/images/sponsor-us/creditcard_logo.jpg';
import creditcard_qrcode from '../../assets/images/sponsor-us/creditcard_qrcode.png';
import wiretransfer_logo from '../../assets/images/sponsor-us/wiretransfer_logo.png';
import wiretransfer_qrcode from '../../assets/images/sponsor-us/wiretransfer_qrcode.png';
import PageContainer from '../PageContainer/PageContainer';
import { useTranslation } from 'react-i18next';

const SponsorUs = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [expandedCard, setExpandedCard] = useState(null);
  const [isCollapsing, setIsCollapsing] = useState(null); // 新增一個 state 來追蹤是否正在收合
  const cardRefs = useRef([]); // 使用 useRef 來儲存卡片的 ref
  const [donors, setDonors] = useState(['wei', '吳＊叡', '末三碼984', '末三碼585']); // 初始化捐款人列表

  const donationMethods = [
    {
      name: t('sponsorUs.methodMobilePayment'),
      logo: mobile_payment_logo,
      image: mobile_payment_qrcode,
      description: t('sponsorUs.methodMobilePaymentDescription'),
    },
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
    /*
    {
      name: '中國信託銀行',
      logo: ctb_logo,
      description: (
        <>
          <p>
            請選擇有意贊助的金額，匯款至對應的專屬帳號。<br />
            如果有其他金額需求，請私訊粉絲專頁或者來信<br />
            <a href="mailto:support@sentimentinsideout.com">support@sentimentinsideout.com</a>
          </p>
          <p>
            匯款銀行：中國信託銀行 (822)
          </p>
          <div className="ctb-account-list">
            <div>
              贊助金額：100元<br />
              專屬帳號：9502300003632878
              <button className="copy-button" onClick={() => handleCopy('9502300003632878')}>複製帳號</button>
            </div>
            <div>
              贊助金額：500元<br />
              專屬帳號：9502300003640598
              <button className="copy-button" onClick={() => handleCopy('9502300003640598')}>複製帳號</button>
            </div>
            <div>
              贊助金額：1000元<br />
              專屬帳號：9502300003632894
              <button className="copy-button" onClick={() => handleCopy('9502300003632894')}>複製帳號</button>
            </div>
            <div>
              贊助金額：1500元<br />
              專屬帳號：9502300003632904
              <button className="copy-button" onClick={() => handleCopy('9502300003632904')}>複製帳號</button>
            </div>
          </div>
        </>
      ),
    },
    */
    
    {
      name: t('sponsorUs.methodCreditCard'),
      logo: creditcard_logo,
      image: creditcard_qrcode,
      description: (
        <span dangerouslySetInnerHTML={{ __html: t('sponsorUs.methodDescriptionHtml', { link: 'https://p.ecpay.com.tw/2820E78' }) }} />
      ),
      link: 'https://p.ecpay.com.tw/2820E78'
    },
    {
      name: t('sponsorUs.methodWireTransfer'),
      logo: wiretransfer_logo,
      image: wiretransfer_qrcode,
      description: (
        <span dangerouslySetInnerHTML={{ __html: t('sponsorUs.methodDescriptionHtml', { link: 'https://p.ecpay.com.tw/FBECD48' }) }} />
      ),
      link: 'https://p.ecpay.com.tw/FBECD48'
    },
  ];

  const handleCardClick = (index, event) => {
    event.stopPropagation();
    setExpandedCard(index);
    setIsCollapsing(null);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    alert(t('sponsorUs.copySuccessAlert', { text }));
  };

  // 新增一個函數來更新捐款人列表
  const addDonor = (donorName) => {
    setDonors((prevDonors) => [...prevDonors, donorName]);
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

  // 定義用於結構化數據的 JSON-LD (使用 useMemo)
  const sponsorUsJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "WebPage", // 或者更適合的類型如 FundingCampaign
    "name": t('sponsorUs.pageTitle'),
    "description": t('sponsorUs.pageDescription'),
    // 動態生成包含語言的 URL
    "url": `${window.location.origin}/${currentLang}/sponsor-us`,
    "inLanguage": currentLang, // 明確指定內容語言
    "potentialAction": {
      "@type": "DonateAction",
      "recipient": {
        "@type": "Organization",
        "name": "Sentiment Inside Out"
      }
      // DonateAction 通常不需要 target URL，但如果您的收款頁面有語言版本，可以考慮添加
    }
  }), [t, currentLang]); // 依賴 t 和 currentLang

  return (
    <PageContainer
      title={t('sponsorUs.pageTitle')}
      description={t('sponsorUs.pageDescription')}
      keywords={t('sponsorUs.keywords')}
      ogImage="/images/sponsor-og.png"
      ogType="website"
      twitterCard="summary_large_image"
      twitterImage="/images/sponsor-og.png"
      jsonLd={sponsorUsJsonLd} // 傳遞更新後的 JSON-LD
    >
      <div className="sponsor-us-page">
        <div className="sponsor-us-container">
          {/* 主要圖片區塊 */}
          <div className="main-image-section">
            <img src={sponsorImage} alt={t('sponsorUs.pageTitle')} />
          </div>

          {/* 文字說明區塊 */}
          <div className="text-description-section">
            <h1>{t('sponsorUs.heading')}</h1>
            <p>
              {t('sponsorUs.intro1')}<br />
              {t('sponsorUs.intro2')}<br /><br />
              {t('sponsorUs.intro3')}<br />
              {t('sponsorUs.intro4')}<br /><br />
              {t('sponsorUs.intro5')}<br />
              {t('sponsorUs.intro6')}<br />
              {t('sponsorUs.intro7')}<br /><br />
              {t('sponsorUs.intro8')}<br />
              {t('sponsorUs.intro9')}<br />
              {t('sponsorUs.intro10')}<br />
              {t('sponsorUs.intro11')}<br />
              {t('sponsorUs.intro12')}<br /><br />
              {t('sponsorUs.intro13')}<br />
              {t('sponsorUs.intro14')}
            </p>
          </div>

          {/* 捐款人公告區塊 */}
          {/*
          <div className="donor-announcement-section">
            <p>感謝近期溫暖的支持者</p>
            <ul className="donor-list">
              {donors.map((donor, index) => (
                <li key={index}>{donor}</li>
              ))}
            </ul>
          </div>

          {/* 多個小卡片展示收款方式 */}
          <div className="donation-methods-section">
            <h2>{t('sponsorUs.methodsHeading')}</h2>
            <div className="donation-cards-container">
              {donationMethods.map((method, index) => (
                <div className="donation-card-wrapper" key={index}>
                  <div
                    ref={(el) => (cardRefs.current[index] = el)}
                    className={`donation-card ${expandedCard === index ? 'expanded' : ''} ${isCollapsing === index ? 'collapsing' : ''}`}
                    onClick={(event) => handleCardClick(index, event)}
                  >
                    <div className="overlay"></div> {/* 添加覆蓋層 */}
                    <div className="content">
                      {expandedCard !== index && method.logo && <img src={method.logo} alt={method.name} />}
                      {expandedCard === index && (
                        <>
                          <h3>{method.name}</h3>
                          <p>{method.description}</p>
                          {method.image && <img src={method.image} alt={method.name} />}
                        </>
                      )}
                    </div>
                  </div>
                  {expandedCard !== index && (
                    <div className="donation-card-label">{method.name}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export { SponsorUs }; 