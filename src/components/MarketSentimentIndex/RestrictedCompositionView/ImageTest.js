import React, { useState } from 'react';

const ImageTest = () => {
    const [imageStatus, setImageStatus] = useState({});
    
    const testPaths = [
        '/images/market-sentiment/composition-feature.png',
        '/images/market-sentiment/placeholder-composition.svg',
        '/logo.png'
    ];

    const handleImageLoad = (path) => {
        console.log(`✅ Image loaded: ${path}`);
        setImageStatus(prev => ({ ...prev, [path]: 'loaded' }));
    };

    const handleImageError = (path) => {
        console.log(`❌ Image failed: ${path}`);
        setImageStatus(prev => ({ ...prev, [path]: 'error' }));
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h2>圖片載入測試</h2>
            
            {testPaths.map((path, index) => (
                <div key={path} style={{ 
                    marginBottom: '20px', 
                    border: '1px solid #ccc', 
                    borderRadius: '8px',
                    padding: '16px'
                }}>
                    <h3>測試 {index + 1}: {path}</h3>
                    
                    <div style={{ 
                        position: 'relative',
                        width: '300px', 
                        height: '200px', 
                        border: '2px solid #ddd',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        marginBottom: '10px'
                    }}>
                        <img 
                            src={path}
                            alt={`Test ${index + 1}`}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                            }}
                            onLoad={() => handleImageLoad(path)}
                            onError={() => handleImageError(path)}
                        />
                        
                        {/* 模糊覆蓋層 */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            background: 'rgba(255, 255, 255, 0.1)'
                        }} />
                        
                        {/* 內容覆蓋層 */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: 'rgba(255, 255, 255, 0.9)',
                            padding: '10px',
                            borderRadius: '8px',
                            textAlign: 'center'
                        }}>
                            <div>🔒</div>
                            <div>功能已鎖定</div>
                        </div>
                    </div>
                    
                    <div style={{
                        padding: '8px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: imageStatus[path] === 'loaded' ? '#d4edda' : 
                                       imageStatus[path] === 'error' ? '#f8d7da' : '#e2e3e5',
                        color: imageStatus[path] === 'loaded' ? '#155724' : 
                               imageStatus[path] === 'error' ? '#721c24' : '#383d41'
                    }}>
                        狀態: {imageStatus[path] === 'loaded' ? '✅ 載入成功' : 
                               imageStatus[path] === 'error' ? '❌ 載入失敗' : '⏳ 載入中...'}
                    </div>
                </div>
            ))}
            
            <div style={{ 
                marginTop: '20px', 
                padding: '16px', 
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
            }}>
                <h3>使用說明</h3>
                <p>1. 確保你的圖片 <code>composition-feature.png</code> 已放在 <code>frontend/public/images/market-sentiment/</code> 目錄下</p>
                <p>2. 如果測試 1 顯示 "載入成功"，表示你的圖片路徑正確</p>
                <p>3. 如果測試 2 顯示 "載入成功"，表示佔位圖片正常</p>
                <p>4. 如果測試 3 顯示 "載入成功"，表示基本的圖片載入功能正常</p>
            </div>
        </div>
    );
};

export default ImageTest;