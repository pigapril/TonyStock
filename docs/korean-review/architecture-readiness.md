# ko-KR 導入架構準備與實際程式盤點

**狀態：ko-KR 已完成程式碼導入、SEO 資產與本機驗證；尚未部署公開。** 本文件反映 2026-11-20 的實際工作區狀態。這代表網站程式已可輸出韓文版本，不代表台灣法律審查、綠界正式商戶端交易實測或韓文原生母語校對已完成。

## 1. 已確認的來源範圍

- zh-TW：2,422 個可翻譯字串值，包含 2,265 個直接物件字串及 157 個巢狀陣列文字。
- zh-CN：2,422 個字串值，與 zh-TW 的路徑集合一致；本階段沒有重新翻譯或覆蓋 zh-CN。
- en：2,429 個字串值；目前 zh-TW 母本的 2,422 個字串均可由 en 直接或以完整 plural pair 回退。
- 英文多出的 8 個 key 是 plural／runtime-only 值，不是新的 zh-TW 母本項目：`momentumDashboard.assetCount_one/other`、`priceAnalysis.addToWatchlist.categoryTotal_one/other`、`priceAnalysis.addToWatchlist.stockCount_one/other`、`momentumDashboard.periodScore`、`errors.DEFAULT_ERROR`。

## 2. Partial locale 與 fallback 實際行為

- `scripts/generate-locale-resources.js` 使用 `buildLocaleResources()`。已翻譯的 key 才會進入對應 route bundle；缺少 key／group 不會偽造字串或複製中文內容。
- `createRouteLocaleLoader()` 依 locale 設定載入選定語系與 fallback chain；`ko-KR` 的 fallback 是 en，沒有翻譯的 key 不會回退到繁中或簡中。
- `localeKeyResolution.js` 具有 required-key resolver；一般 key 依 chain 查找，plural key 要求 `_one` 與 `_other` 都存在，並各自檢查 placeholder。
- `verify-i18n-keys.js` 已遞迴檢查物件和陣列索引，覆蓋完整 2,422 個字串值，不只靜態 `t()` 引用。
- 使用真實 i18next instance 驗證：Ko fallback 會取 en；不會取 zh-TW／zh-CN。只存在 `_one` 而缺 `_other` 時，count=2 會顯示原始 key，因此驗證器會將它判定為未完成。
- build-time SEO 與社群圖片產生器共用同一個 required fallback resolver；缺少 metadata 時會清楚失敗，不會生成 `undefined` 標題／描述。

## 3. Locale registry、路由及回跳

正式 registry 現在包含 `en`、`zh-TW`、`zh-CN`、`ko-KR`。韓文已加入 i18next、LanguageSwitcher、瀏覽器語言判斷、明確語系 URL 與 route-lazy resource loader。

| 項目 | 目前 ko-KR 行為 | 是否公開 |
|---|---|---|
| Browser language | `ko`／`ko-KR` 選擇 `ko-KR` | 已實作，部署後可用 |
| Canonical locale | `ko-KR` | 已註冊 |
| Locale resource chain | `['ko-KR', 'en']` | 已實作 |
| UI Intl formatting | `ko-KR` | 已實作 |
| Payment service locale | English；UI `returnLocale` 為 `ko-KR`，Email 語系獨立解析 | 已實作並有回歸測試 |
| Language switcher | 顯示 `한국어` | 已實作 |
| App route/resource registry | `/ko-KR/*` | 已實作，route groups lazy-loaded |
| SEO/sitemap/hreflang | 韓文頁面、文章詳細頁均使用真實 slug；sponsor 僅保留繁中 URL | 已產生並驗證 |

付款流程已把 `returnLocale`（前端介面／回跳語系）與 `language`（付款服務／ECPay 支援語系）分開。Ko 日後可以保留 Ko 結果頁，而 ECPay 仍使用 English。CardTrial/CardUpdate 亦傳遞獨立的 `returnLocale`；後端 model、migration、callback service 和 route allowlist 已有相應支援。舊綁卡資料沒有 `returnLocale` 時，保留舊 callback payload 結構與安全預設，不會假裝舊記錄有 Ko 語系。

## 4. 第三方與後端 locale fallback

| 整合 | ko-KR 的處理 |
|---|---|
| Payment API／ECPay | EN service language；UI return locale 獨立保留 |
| Bound-card email／subscription notifications | EN／zh-TW／zh-CN／ko-KR；明確 Email 偏好優先，其次使用 UI `returnLocale`，最後才回退舊資料的 service locale |
| Customer-support ChatWidget／FAQ | 四語系各有獨立 FAQ（每語系 79 題）及 AI instructions |
| Announcements | 網站公告外框、管理者公告編輯器及預覽標籤有韓文；公告內容仍依公告本身的繁中／英文欄位顯示 |
| Price-analysis email notifications | 依使用者通知偏好／UI 語系選擇四語系模板，不會把 ECPay service locale 當成 Email 語系 |
| Invoice PDF | EN dates／content locale，不使用 zh-TW 日期格式 |

發票 PDF 的實際輸出目前是中英雙語底稿；Ko fallback 日期與 PDF 語系使用 English/Gregorian calendar。此為第三方文件 fallback，不是韓文發票翻譯。

## 5. 日期、數字與貨幣

付款、帳戶、訂閱、卡片更新、兌換與圖表格式使用 `ko-KR` Intl/date-fns locale。動態兌換格式器具有韓文相對時間、折扣、延長、倒數、方案名稱與金額格式；並已接入韓文語系。

## 6. SEO、分享圖、文章與法律文件

- `public/sitemap.xml` 有 89 個 URL records，其中 22 個 `ko-KR` 路由；Taiwan-only sponsor 頁只列繁中 URL，不列英文、簡中或韓文。
- SEO shell generator 已產生 91 個靜態輸出檔；coverage check 通過 89 個 sitemap URLs，並檢查 4 個語系公開路由、supported locales 與 alternate URL。
- 22 個韓文 sitemap URL 均有實際靜態 shell，包含韓文 canonical、`ko_KR` OG locale、`manifest.ko-KR.json` 及 reciprocal hreflang。
- 4 篇文章均有英文、繁中、簡中與韓文完整 Markdown 版本；各語系使用各自真實 slug，不再把韓文文章列表全部連到英文文章。
- 已產生 13 張韓文社群分享圖（9 張一般頁面圖及 4 張文章圖；不含 sponsor page）；韓文圖卡不重用繁中／英文介面截圖。PWA manifest 已建立。
- Legal component 已選用 `public/docs/T&C/ko-kr_T&C_20261008.md`，並以 `ko-KR` 標記文件語言。該條款尚需台灣法律專業人士審閱。
- Sponsor page 保持 Taiwan-only，沒有建立韓文 sitemap 或靜態 SEO shell。

## 7. 英文 fallback 舊缺口

先前盤點的 29 個英文同路徑 fallback 缺口，現行 en 資源已全數有值；現在 missing fallback 為 0。具體 key／EN 值／Ko 建議候選見 `notes/english-fallback-gap-audit.md` 與 `.json`。這 29 項也已包含在 2,422 字串主提案，不會因英文已補齊就省略韓文審稿。

## 8. 已完成的獨立準備修改

1. Partial resource generator 與 route lazy loader。
2. Fallback-aware required key resolver、雙 plural variant 完整性檢查、placeholder 比對。
3. 完整 2,422 字串值驗證（含 array leaves）。
4. SEO／social build-time fallback resolver。
5. `ko-KR` 正式 locale registry、Intl/date-fns 數字日期格式及 fallback。
6. Payment service locale 與 UI return locale 分離。
7. Card trial/update 回跳 locale 傳遞、model/migration/callback 相容。
8. ECPay 使用其支援的 EN／繁中 service locale；客戶訂閱通知及 ChatWidget／FAQ 使用獨立的四語系文案。Invoice PDF 仍僅支援英文／繁中底稿，需另行本地化。
9. Article/legal actual-content locale annotation and no-fake-hreflang behavior。
10. 市場、兌換、圖表、方案卡、公告管理與共用使用者動作中已審核的 production-visible 硬編碼文案已接入韓文；PlanCard 已改用穩定 feature ID，不以翻譯後文字決定 Free/Pro 權限。

## 9. 測試現況

- `npm run precommit`：後端 150 suites／1,873 tests passed；前端 68 suites／581 tests passed；合計 218 suites／2,454 tests passed。
- 韓文 locale resource generation `--check`：passed；2,422 source leaves、placeholder mismatch 0。
- Full locale fallback validation：2,422 source values、0 unresolved、0 placeholder mismatch。
- SEO shell generation：91 files；sitemap 89 URLs、22 個韓文路由，supported locale、alternate URL 與 reciprocal hreflang coverage 通過。
- `frontend/package.json` 不再有會於 build 前執行 `npm install` 的 `prebuild`；根目錄 precommit 現在執行完整 regression，backend `check`／`precommit` 亦指向可執行的 CI 測試。
- 綁卡取消／退款 lifecycle 定向回歸包含 Authorized、To be captured、Captured、Operation canceled、TradeNo 復原、重試與人工升級。
- Production build：成功（Compiled with warnings）；保留既有 ESLint、Baseline/browser mapping 與舊版 browserslist 資料警告，無編譯錯誤。
- 全域 `git diff --check` 仍有一個既存且非本次修改的空白問題：`frontend/src/components/Common/Dialog/Dialog.js:112`；本次各自修改檔案的 whitespace check 通過。

## 10. 尚未完成的正式發布前事項

- 本次已依使用者委託完成 2,422 個主要資源字串與 296 個硬編碼／動態候選的語言及產品語意審核。主要字串狀態為 `reviewed_by_delegated_editor_not_released`；4 個 PlanCard 功能比對 token 保持阻擋，不可直接翻譯替換。
- 原先 171 項提案的精確歷史原文與逐項批准狀態仍無法從目前可存取的來源還原；不將現有其他候選稿冒充該 171 項。
- 法律文件仍需由熟悉台灣法的法律專業人士審閱。§9.4 的交叉引用已依實際章節修正為 §13（準據法與爭議解決）及 §14（其他事項）；§14.6 標題已修正為「電子契約之成立與效力」。這些是文件一致性修正，不代表法律專業審查已完成。
- `PlanCard` 的四個舊文案比對 token 不再用於邏輯判斷；功能限制改用穩定 semantic feature IDs。這四個 token 本身不是 UI 文案，仍保留不翻譯。
- Taiwan Legal Counsel 尚需審閱完整韓文條款、§9.4 survival-clause 範圍、§14.6 電子同意效力、NT$2 處理與消費者告知，以及隱私／跨境資料處理、責任限制、集體訴訟放棄與一年請求期間等條文。
- 綠界 `DoAction` 不支援測試環境的實際授權交易。正式商戶端仍需驗證授權放棄、取消關帳後放棄、已關帳退刷及失敗人工處理；退款亦可能受商店綠界餘額不足影響。程式會重試並送出 CRITICAL 人工處理警示，但本次沒有對正式商戶發出交易。
- 來源中的五項產品／數據主張仍需產品負責人提供證據或調整：CNN「最多人看」、COT 分類 mapping、SIO 與 CNN 比較準確性、Composite 約 10 讀數的歷史底部推論、Fear Breadth 極端訊號後 1 年表現。
- 4 篇文章詳情已提供四語系完整版本；韓文文章仍應由原生韓文編輯進行最終審校。
- Invoice PDF 仍只有英文／繁中雙語底稿，韓文使用英文版；第三方 ECPay 付款描述仍使用 English。Email 與 ChatWidget／FAQ 已有四語系文案，但正式 SMTP 寄送仍需外部測試。
- 本輪完成本機驗證但未部署；正式公開前仍需完成上述法律／付款確認及韓文原生母語最終校對。

**本文件記錄已完成的程式實作及本機驗證，不代表法律文件或產品主張已核准，也不代表網站已部署公開。** 詳細翻譯 QA 見 `notes/translation-qa-final.md`。

本輪修正後執行 `scripts/add-ko-sitemap-locale.js` 與 `scripts/generate-seo-shells.js`：產生 91 個靜態輸出檔，sitemap 89 個 URL（22 個 ko-KR）；unsupported locale route、alternate URL 與 reciprocal hreflang coverage 通過。第 4 篇文章四語系統一使用 11.56 million／1,156 萬樣本量，繁中舊 slug 以 301 轉址至新 slug。
