import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './RestrictedCompositionView.css';

const RestrictedCompositionViewDebug = ({ onUpgradeClick, indicatorCount = 8, showFeatureImage = true }) => {
    const { t } = useTranslation();
    const [imageStatus, setImageStatus] = useState('loading');
    const [currentSrc, setCurrentSrc] = useState('');

    // 測試多個可能的圖片路徑
    const imagePaths = [
        '/images/market-sentiment/composition-feature.png',
        '/assets/images/market-sentiment/composition-feature.png',
        `${process.env.PUBLIC_URL}/images/market-sentiment/composition-feature.png`,
        `${process.env.PUBLIC_URL}/assets/images/market-sentiment/composition-feature.png`,
        '/images/market-sentiment/placeholder-composition.svg',
        `${process.env.PUBLIC_URL}/images/market-sentiment/placeholder-composition.svg`,
        // 使用一個肯定存在的圖片作為測試
        '/logo.png'
    ];

    const [currentPathIndex, setCurrentPathIndex] = useState(0);

    const handleImageError = (e) => {
        console.log(`Image failed to load: ${e.target.src}`);
        setImageStatus('error');
        
        // 嘗試下一個路徑
        if (currentPathIndex < imagePaths.length - 1) {
            const nextIndex = currentPathIndex + 1;
            setCurrentPathIndex(nextIndex);
            setCurrentSrc(imagePaths[nextIndex]);
            console.log(`Trying next path: ${imagePaths[nextIndex]}`);
        } else {
            console.log('All image paths failed');
            setImageStatus('all-failed');
        }
    };

    const handleImageLoad = (e) => {
        console.log(`Image loaded successfully: ${e.target.src}`);
        setImageStatus('loaded');
    };

    React.useEffect(() => {
        if (showFeatureImage && imagePaths.length > 0) {
            setCurrentSrc(imagePaths[0]);
            setCurrentPathIndex(0);
        }
    }, [showFeatureImage]);

    return (
        <div className="restricted-composition-container">
            {/* 調試信息 */}
            <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '12px',
                zIndex: 1000,
                maxWidth: '300px'
            }}>
                <div>Image Status: {imageStatus}</div>
                <div>Current Path: {currentSrc}</div>
                <div>Path Index: {currentPathIndex}/{imagePaths.length - 1}</div>
                <div>Show Feature Image: {showFeatureImage ? 'true' : 'false'}</div>
                <div>PUBLIC_URL: {process.env.PUBLIC_URL || 'undefined'}</div>
            </div>

            {/* 功能圖片背景 */}
            {showFeatureImage && currentSrc && (
                <div className="feature-image-background" style={{
                    border: '2px solid red', // 調試邊框
                    zIndex: 1
                }}>
                    <img 
                        src={currentSrc}
                        alt="Market Sentiment Composition Feature"
                        className="feature-image"
                        onError={handleImageError}
                        onLoad={handleImageLoad}
                        style={{
                            border: '2px solid blue' // 調試邊框
                        }}
                    />
                    <div className="feature-image-blur-overlay" style={{
                        border: '2px solid green' // 調試邊框
                    }}></div>
                </div>
            )}
            
            {/* 簡化的模擬內容 */}
            <div className="composition-blur-overlay" style={{ zIndex: 2 }}>
                <div className="blurred-composition" style={{
                    background: 'rgba(255, 0, 0, 0.1)', // 調試背景
                    padding: '20px'
                }}>
                    <div style={{ color: '#333', fontSize: '16px' }}>
                        模擬內容區域 - 這裡應該顯示模糊的功能預覽
                    </div>
                </div>
                
                {/* 模糊效果 */}
                <div className="composition-blur-filter"></div>
            </div>
            
            {/* 限制覆蓋層 */}
            <div className="composition-restriction-overlay" style={{ zIndex: 10 }}>
                <div className="composition-restriction-content">
                    <div className="composition-lock-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                            <path 
                                d="M12 2C13.1 2 14 2.9 14 4V6H16C17.1 6 18 6.9 18 8V20C18 21.1 17.1 22 16 22H8C6.9 22 6 21.1 6 20V8C6 6.9 6.9 6 8 6H10V4C10 2.9 10.9 2 12 2ZM12 4C11.4 4 11 4.4 11 5V6H13V5C13 4.4 12.6 4 12 4ZM12 13C13.1 13 14 13.9 14 15S13.1 17 12 17 10 16.1 10 15 10.9 13 12 13Z" 
                                fill="currentColor"
                            />
                        </svg>
                    </div>
                    
                    <h3 className="composition-restriction-title">
                        調試版本 - 解鎖完整市場情緒分析
                    </h3>
                    
                    <p className="composition-restriction-description">
                        這是調試版本，用來檢查圖片載入問題。
                    </p>
                    
                    <button 
                        className="composition-upgrade-button"
                        onClick={() => {
                            console.log('Debug info:', {
                                imageStatus,
                                currentSrc,
                                currentPathIndex,
                                showFeatureImage,
                                PUBLIC_URL: process.env.PUBLIC_URL
                            });
                            if (onUpgradeClick) onUpgradeClick();
                        }}
                    >
                        <span className="button-icon">🔍</span>
                        調試升級按鈕
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RestrictedCompositionViewDebug;