import React from 'react';
import { useSubscription } from '../Subscription/SubscriptionContext';
import { useAdContext } from '../Common/InterstitialAdModal/AdContext';
import ProUserBadge from '../Common/ProUserBadge/ProUserBadge';
import './AdTest.css';

/**
 * 廣告測試組件 - 用於測試廣告阻擋功能
 */
export const AdTest = () => {
  const { userPlan } = useSubscription();
  const { requestAdDisplay, isProUser } = useAdContext();
  const isProUserLocal = userPlan?.type === 'pro' || userPlan?.type === 'premium';

  const handleInterstitialAdTest = () => {
    requestAdDisplay('test', 1, true); // 強制顯示插頁廣告進行測試
  };

  return (
    <div className="ad-test-container">
      <div className="ad-test-header">
        <h2>廣告顯示測試頁面</h2>
        <ProUserBadge showAdFreeMessage={true} />
      </div>
      
      <div className="user-status">
        <h3>用戶狀態</h3>
        <p>訂閱類型: {userPlan?.type || 'free'}</p>
        <p>是否為 Pro 用戶: {isProUserLocal ? '是' : '否'}</p>
        <p>預期廣告顯示: {isProUserLocal ? '隱藏' : '顯示'}</p>
      </div>

      <div className="ad-test-sections">
        <div className="ad-section">
          <h4>測試廣告 1 - 橫幅廣告</h4>
          <ins className="adsbygoogle"
               style={{display: 'inline-block', width: '728px', height: '90px'}}
               data-ad-client="ca-pub-9124378768777425"
               data-ad-slot="6690581177"></ins>
        </div>

        <div className="ad-section">
          <h4>測試廣告 2 - 方形廣告</h4>
          <ins className="adsbygoogle"
               style={{display: 'inline-block', width: '300px', height: '250px'}}
               data-ad-client="ca-pub-9124378768777425"
               data-ad-slot="2305447757"></ins>
        </div>

        <div className="ad-section">
          <h4>測試廣告 3 - 自適應廣告</h4>
          <ins className="adsbygoogle"
               style={{display: 'block'}}
               data-ad-client="ca-pub-9124378768777425"
               data-ad-slot="3736248809"
               data-ad-format="auto"
               data-full-width-responsive="true"></ins>
        </div>

        <div className="ad-section">
          <h4>測試廣告 4 - 插頁廣告</h4>
          <button 
            className="interstitial-ad-test-button"
            onClick={handleInterstitialAdTest}
            disabled={isProUserLocal}
          >
            {isProUserLocal ? '插頁廣告已為 Pro 用戶禁用' : '觸發插頁廣告'}
          </button>
        </div>
      </div>

      <div className="instructions">
        <h4>測試說明</h4>
        <ul>
          <li>Free 用戶應該能看到上方的橫幅廣告和方形廣告</li>
          <li>Free 用戶點擊「觸發插頁廣告」按鈕應該會看到彈出式廣告</li>
          <li>Pro 用戶應該看不到任何廣告，包括插頁廣告</li>
          <li>Pro 用戶的插頁廣告按鈕應該是禁用狀態</li>
          <li>切換訂閱狀態後，廣告顯示應該立即更新</li>
        </ul>
      </div>
    </div>
  );
};

export default AdTest;