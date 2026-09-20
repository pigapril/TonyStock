# Frontend design context

- 主要使用者是長期投資人，主動交易者居次。
- 產品應先呈現理性、可信與清楚，再呈現現代感與創新感。
- 重要數字、狀態與操作必須能立即辨識，不依賴複雜的視覺解碼。
- 優先重用既有 button、badge、dialog、surface 與其他 shared primitives。
- 以間距、排版與表面層次建立對比，避免無語意的額外色彩。
- 升級、付款與 gated-feature 畫面應維持同一套 premium 視覺語言。
- 避免傳統券商後台、灰色企業 dashboard、密集表格、強烈分隔線與吵雜 KPI 牆。
- 資料緊急時仍維持冷靜、可讀與可信的介面。
- 新增或修改使用者可見文案時，使用既有畫面術語並執行 `frontend/src/locales/__tests__/copy-hygiene.test.js` 的相關測試。
