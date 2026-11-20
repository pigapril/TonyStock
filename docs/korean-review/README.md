# ko-KR 韓文導入審閱資料

**狀態：韓文文案審核完成；尚未註冊、未對外啟用。** 使用者已委託編輯判斷，因此逐項文案由本次審核決定，不再要求使用者逐字確認。這不代表法律／產品風險已解除，也不代表已核准上線。本目錄內容不會被前端資源產生器載入，也不會變成 production UI 文案。

## 主要交付物

| 檔案 | 內容 |
|---|---|
| `ko-KR-review-proposal.json` | **完整逐字串 JSON**：2,422 筆來源字串值（2,265 個直接 key + 157 個巢狀陣列字串）；每筆含 zh-TW、zh-CN、EN、韓文候選、候選來源、替代版本、fallback 與 placeholder audit、批准狀態 |
| `ko-KR-review-proposal.md` | **完整逐項審閱文件**：每一個來源 key／陣列索引均列出原文、譯文候選、英文 fallback、來源與參數檢查 |
| `drafts/reviewed-overrides.ko-KR.json` | 本次審核選定的 35 個修訂字串；建置提案時優先套用，不覆蓋原始候選與替代版本 |
| `notes/translation-qa-final.md` | 全部 2,422 個字串、296 個硬編碼／動態候選和法律文件的完整審核結論、阻擋事項與驗證結果 |
| `hardcoded-ui-review-proposal.json` | 296 個非 JSON／硬編碼／動態文案候選（244 AST 候選 + 52 個另行盤點的市場及動態兌換文字） |
| `hardcoded-ui-review-proposal.md` | 296 個硬編碼候選逐項列表及使用情境分類 |
| `drafts/12-legal-terms.ko-KR.md` | 台灣服務條款與隱私政策完整韓文審閱稿 |
| `notes/12-legal-review.md` | 法律語意、條款交叉引用及審閱 checklist |
| `architecture-readiness.md` | 實際 locale/fallback、付款／通知／客服／SEO／靜態頁架構盤點及待辦 |
| `notes/english-fallback-gap-audit.md`／`.json` | 先前 29 個英文 fallback 缺口的處理紀錄與各項現行英文值 |
| `notes/12-legal-machine-check.json` | 法律稿標題、數字、金額、品牌、法院及法規名詞機器比對結果 |
| `notes/01-content-payments-style-check.md` | 9 段較長市場／品牌文案的韓文語體 gate 檢查紀錄 |
| `notes/01-site.md` 至 `notes/07-redemption-errors.md` | 各主要字串批次逐項覆核及具體修改理由 |
| `notes/08-indicator-pages-revised.md` | 指標專頁韓文修訂與金融語意風險清單 |
| `notes/09-hardcoded-ui.md` | AST 硬編碼字串的 production/admin/debug/orphan 可見性分類 |
| `notes/10-11-hardcoded-dynamic.md` | 市場及動態兌換文案的語意待確認事項 |
| `notes/13-nested-array-strings.md` | 157 個巢狀陣列字串逐項覆核結果 |

## 核心翻譯術語

- 市場情緒：**시장 심리**
- 投資人情緒：**투자자 심리**（僅在明確指投資人時）
- 恐懼與貪婪指數：**공포·탐욕 지수**
- 樂活五線譜：**LOHAS 5선 분석**
- 市場動能：**시장 모멘텀**
- 自選列表：**관심 종목**
- `SIO`、`LOHAS`、`Pro`、ETF、股票代碼、API／技術名稱與所有動態參數保持正確。

## 品質與批准狀態

- 母本：目前 `src/locales/zh-TW/translation.json` 的全部 **2,422 個字串值**。
- zh-CN：2,422/2,422 路徑對齊。
- English fallback：對 2,422 個母本字串全部可解析；先前 29 個缺值已補英文。
- 韓文主提案：2,422/2,422 有候選；空白 0；placeholder mismatch 0。
- 硬編碼／動態候選：296/296 有候選；空白 0；placeholder mismatch 0。
- 149 組存在不同候選稿的 key 會列出主要候選及替代版本，不會靜默覆蓋。
- **2,422 個資源字串已由受託編輯完成語言與語意審核**，逐筆狀態為 `reviewed_by_delegated_editor_not_released`。296 個硬編碼／動態候選亦已完成審核，僅保留應阻擋翻譯套用的邏輯識別字。
- **尚未註冊或發布。** 法律稿需台灣法律專業審閱；NT$2 綁卡驗證扣款告知、COT 分類、回測績效和指標比較等事實性主張需產品／資料負責人確認。

## 關於原先 171 項提案

保留了目前 workspace 可存取的 `docs/i18n/ko-KR-review/` 舊候選檔，並將可追溯的候選納入主表。現有可存取資料無法可靠重建「原始 171 項」的精確成員清單及逐項歷史批准狀態，因此主表不會謊稱某些項目一定屬於原 171 項或曾獲批准；目前統一標記本次編輯審核完成但尚未發布。此限制已在 JSON `legacy171Reconciliation` 欄位及總提案內明示。

## 正式啟用原則

本次已完成文案編輯審核，但在另行決定正式啟用前，仍不建立或註冊 `src/locales/ko-KR/translation.json`、不加入語言切換選單、不建立正式韓文路由／manifest／sitemap／hreflang／OG 分享圖，也不部署。正式啟用時需先排除 `notes/translation-qa-final.md` 所列的法律／產品資料阻擋事項，再執行完整整合、SEO 與 production build。
