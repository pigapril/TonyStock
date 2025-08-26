# Market Sentiment 功能圖片指南

## 圖片目錄結構

**正確的圖片位置**：
```
frontend/public/images/market-sentiment/
├── composition-feature.png          # 組成分析功能截圖 (你需要放置的主要圖片)
├── placeholder-composition.svg      # 佔位圖片 (已自動生成)
└── gauge-feature.png               # 儀表盤功能截圖 (可選)
```

**注意**: 圖片必須放在 `frontend/public/images/market-sentiment/` 目錄下，而不是 `src/assets/` 目錄。

## 圖片規格建議

### composition-feature.png (組成分析功能)
- **尺寸**: 800x600px 或更高解析度
- **格式**: PNG (支援透明背景) 或 JPG
- **內容**: Market Sentiment 組成分析頁面的完整截圖
- **建議包含**:
  - 各項指標的詳細列表
  - 權重分配圖表
  - 貢獻度分析
  - 相關性分析圖表

### gauge-feature.png (儀表盤功能)
- **尺寸**: 600x400px 或更高解析度
- **格式**: PNG 或 JPG
- **內容**: Market Sentiment 儀表盤的截圖
- **建議包含**:
  - 主要的情緒指數儀表盤
  - 當前數值顯示
  - 趨勢指示器

### historical-chart-feature.png (歷史圖表功能)
- **尺寸**: 1000x600px 或更高解析度
- **格式**: PNG 或 JPG
- **內容**: 歷史數據圖表的截圖
- **建議包含**:
  - 時間序列圖表
  - 多個時間範圍選項
  - 預測準確度標記

## 圖片準備步驟

1. **截圖準備**:
   - 使用 Pro 帳戶登入系統
   - 導航到 Market Sentiment 頁面
   - 確保所有功能都正常顯示
   - 使用高解析度螢幕進行截圖

2. **圖片處理**:
   - 裁剪掉不必要的瀏覽器邊框
   - 確保圖片清晰度
   - 可以適當調整亮度和對比度
   - 保存為 PNG 格式以獲得最佳品質

3. **檔案命名**:
   - 使用描述性的檔案名稱
   - 避免使用空格，使用連字符 `-` 分隔
   - 使用小寫字母

## 模糊效果實作

組件會自動對圖片應用以下效果：

- **模糊強度**: 8px backdrop-filter blur
- **覆蓋層**: 半透明白色覆蓋 (淺色模式) 或黑色覆蓋 (深色模式)
- **互動效果**: 滑鼠懸停時模糊效果會稍微減少
- **動畫**: 圖片載入時會有淡入動畫效果

## 錯誤處理

如果圖片載入失敗：
- 組件會自動隱藏圖片背景
- 回退到原本的模擬內容顯示
- 不會影響整體功能運作

## 使用方式

在 RestrictedCompositionView 組件中：

```jsx
<RestrictedCompositionView 
    onUpgradeClick={handleUpgrade}
    showFeatureImage={true}  // 控制是否顯示功能圖片
    indicatorCount={8}
/>
```

## 效能考量

- 圖片會在組件載入時異步載入
- 建議圖片檔案大小控制在 500KB 以內
- 可以考慮使用 WebP 格式以獲得更好的壓縮率
- 圖片會被瀏覽器快取，提升後續載入速度

## 測試建議

1. 測試圖片載入成功的情況
2. 測試圖片載入失敗的情況
3. 測試不同螢幕尺寸下的顯示效果
4. 測試深色模式下的視覺效果
5. 測試滑鼠懸停互動效果