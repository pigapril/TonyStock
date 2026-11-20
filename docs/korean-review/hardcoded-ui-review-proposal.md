# Korean hardcoded / non-JSON copy review

- Total entries: 296 (AST candidates 244; separately enumerated product/dynamic items 52).
- Editorial QA: completed across all 296 candidates.
- PlanCard feature-logic strings blocked pending stable feature IDs: 4.
- Placeholder mismatches: 0.
- Runtime status: not registered, not wired for ko-KR, and not released.

## Classification

- admin: 76
- user_action: 7
- admin_debug: 20
- public_shared: 2
- market_product_copy: 64
- dynamic_product_copy: 41
- subscription_product_copy: 34
- market-sentiment: 30
- unclassified: 22

## Key implementation cautions

- 80 AST entries are production-facing, 78 admin/preview-only, 41 dev/debug-only, and 45 orphan/non-Korean-branch or logic-token entries. Do not treat all AST literals as public UI.
- Four PlanCard strings are exact `feature.includes()` tokens, not labels. They remain blocked until the access logic uses stable feature IDs or all locale comparisons are made consistent.
- Korean branches are already present for redemption-formatting literals; the Chinese literals in that file are not to be blindly replaced.
- MarketPulse and the Taiwan MarketSentiment explainer currently resolve unsupported ko-KR copy to English. Their Korean candidates require explicit locale wiring in a separately approved implementation stage.

## Entries

### 1. src/components/Admin/AnnouncementManager/AnnouncementManager.js:31:1

- Korean: 설정을 불러오지 못했습니다
- Source: 載入配置失敗
- Context: throw new Error(response.data.message || '載入配置失敗');

### 2. src/components/Admin/AnnouncementManager/AnnouncementManager.js:34:2

- Korean: 공지 설정 로드 실패:
- Source: 載入公告配置失敗:
- Context: console.error('載入公告配置失敗:', err);

### 3. src/components/Admin/AnnouncementManager/AnnouncementManager.js:35:3

- Korean: 설정을 불러오지 못했습니다: 
- Source: 載入配置失敗: 
- Context: setError('載入配置失敗: ' + (err.response?.data?.message || err.message));

### 4. src/components/Admin/AnnouncementManager/AnnouncementManager.js:51:4

- Korean: 공지 설정이 성공적으로 업데이트되었습니다!
- Source: 公告配置已成功更新！
- Context: setSuccess('公告配置已成功更新！');

### 5. src/components/Admin/AnnouncementManager/AnnouncementManager.js:56:5

- Korean: 저장하지 못했습니다
- Source: 儲存失敗
- Context: throw new Error(response.data.message || '儲存失敗');

### 6. src/components/Admin/AnnouncementManager/AnnouncementManager.js:59:6

- Korean: 공지 설정 저장 실패:
- Source: 儲存公告配置失敗:
- Context: console.error('儲存公告配置失敗:', err);

### 7. src/components/Admin/AnnouncementManager/AnnouncementManager.js:60:7

- Korean: 저장하지 못했습니다: 
- Source: 儲存失敗: 
- Context: setError('儲存失敗: ' + (err.response?.data?.message || err.message));

### 8. src/components/Admin/AnnouncementManager/AnnouncementManager.js:75:8

- Korean: 미리보기를 생성하지 못했습니다
- Source: 預覽生成失敗
- Context: throw new Error(response.data.message || '預覽生成失敗');

### 9. src/components/Admin/AnnouncementManager/AnnouncementManager.js:78:9

- Korean: 미리보기 생성 실패:
- Source: 生成預覽失敗:
- Context: console.error('生成預覽失敗:', err);

### 10. src/components/Admin/AnnouncementManager/AnnouncementManager.js:79:10

- Korean: 미리보기에 실패했습니다: 
- Source: 預覽失敗: 
- Context: setError('預覽失敗: ' + (err.response?.data?.message || err.message));

### 11. src/components/Admin/AnnouncementManager/AnnouncementManager.js:86:11

- Korean: 불러오는 중...
- Source: 載入中...
- Context: <p>載入中...</p>

### 12. src/components/Admin/AnnouncementManager/AnnouncementManager.js:94:12

- Korean: 공지 관리
- Source: 公告管理
- Context: <h1>公告管理</h1>

### 13. src/components/Admin/AnnouncementManager/AnnouncementManager.js:95:13

- Korean: 웹사이트 상단 공지 배너 관리
- Source: 管理網站頂部的公告欄內容
- Context: <p className="subtitle">管理網站頂部的公告欄內容</p>

### 14. src/components/Admin/AnnouncementManager/AnnouncementManager.js:144:14

- Korean: 설정 정보
- Source: 配置資訊
- Context: <h3>配置資訊</h3>

### 15. src/components/Admin/AnnouncementManager/AnnouncementManager.js:147:15

- Korean: 마지막 업데이트:
- Source: 最後更新:
- Context: <label>最後更新:</label>

### 16. src/components/Admin/AnnouncementManager/AnnouncementManager.js:151:16

- Korean: 업데이트한 사용자:
- Source: 更新者:
- Context: <label>更新者:</label>

### 17. src/components/Admin/AnnouncementManager/AnnouncementManager.js:155:17

- Korean: 설정 버전:
- Source: 配置版本:
- Context: <label>配置版本:</label>

### 18. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:43:18

- Korean: 중국어 메시지 글자 수 제한 초과 ({{messageLength_zh}}/{{maxLength}})
- Source: 中文訊息長度超過限制 ({{messageLength_zh}}/{{maxLength}})
- Context: errors.push(`中文訊息長度超過限制 (${messageLength_zh}/${maxLength})`);

### 19. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:47:19

- Korean: 영어 메시지 글자 수 제한 초과 ({{messageLength_en}}/{{maxLength}})
- Source: 英文訊息長度超過限制 ({{messageLength_en}}/{{maxLength}})
- Context: errors.push(`英文訊息長度超過限制 (${messageLength_en}/${maxLength})`);

### 20. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:51:20

- Korean: 공지를 활성화하려면 최소 한 가지 언어의 메시지를 입력해야 합니다
- Source: 啟用公告時必須至少提供一種語言的訊息內容
- Context: errors.push('啟用公告時必須至少提供一種語言的訊息內容');

### 21. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:55:21

- Korean: 자동 숨김 시간은 1~30초 사이여야 합니다
- Source: 自動隱藏時間必須在 1-30 秒之間
- Context: errors.push('自動隱藏時間必須在 1-30 秒之間');

### 22. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:98:22

- Korean: 공지 수정
- Source: 編輯公告
- Context: <h2>編輯公告</h2>

### 23. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:111:23

- Korean: 공지가 활성화되었습니다
- Source: 公告已啟用
- Context: {formData.enabled ? '公告已啟用' : '公告已停用'}

### 24. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:111:24

- Korean: 공지가 비활성화되었습니다
- Source: 公告已停用
- Context: {formData.enabled ? '公告已啟用' : '公告已停用'}

### 25. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:118:25

- Korean: 공지 메시지 (중국어)
- Source: 公告訊息 (中文)
- Context: <label htmlFor="message_zh">

### 26. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:120:26

- Korean: 🇹🇼 번체 중국어
- Source: 🇹🇼 繁體中文
- Context: <span className="language-badge">🇹🇼 繁體中文</span>

### 27. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:126:27

- Korean: 중국어 공지 내용을 입력하세요...
- Source: 輸入中文公告內容...
- Context: placeholder="輸入中文公告內容..."

### 28. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:135:28

- Korean: 글자 수 제한 초과
- Source: 超過字數限制
- Context: <span className="announcement-editor-error-text">超過字數限制</span>

### 29. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:142:29

- Korean: 공지 메시지 (영어)
- Source: 公告訊息 (英文)
- Context: <label htmlFor="message_en">

### 30. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:159:30

- Korean: 글자 수 제한 초과
- Source: 超過字數限制
- Context: <span className="announcement-editor-error-text">超過字數限制</span>

### 31. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:174:31

- Korean: 공지 자동 숨김
- Source: 自動隱藏公告
- Context: <span className="toggle-text">自動隱藏公告</span>

### 32. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:181:32

- Korean: 자동 숨김 시간 (초)
- Source: 自動隱藏時間 (秒)
- Context: <label htmlFor="autoHideDelay">自動隱藏時間 (秒)</label>

### 33. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:192:33

- Korean: 초
- Source: 秒
- Context: <span className="announcement-editor-delay-value">{formData.autoHideDelay / 1000}秒</span>

### 34. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:216:34

- Korean: 미리보기
- Source: 預覽效果
- Context: >

### 35. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:226:35

- Korean: 저장 중...
- Source: 儲存中...
- Context: {saving ? '儲存中...' : '儲存設定'}

### 36. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:226:36

- Korean: 설정 저장
- Source: 儲存設定
- Context: {saving ? '儲存中...' : '儲存設定'}

### 37. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:232:37

- Korean: 사용 안내
- Source: 使用提示
- Context: <h4>使用提示</h4>

### 38. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:234:38

- Korean: 공지는 웹사이트 상단에 표시되며 이모지를 지원합니다
- Source: 公告會顯示在網站頂部，支援 emoji 表情符號
- Context: <li>公告會顯示在網站頂部，支援 emoji 表情符號</li>

### 39. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:235:39

- Korean: 메시지 길이는 다음 글자 수 이내로 설정하는 것을 권장합니다: 
- Source: 建議訊息長度控制在
- Context: <li>建議訊息長度控制在 {maxLength} 字元以內</li>

### 40. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:235:40

- Korean: 자 이내
- Source: 字元以內
- Context: <li>建議訊息長度控制在 {maxLength} 字元以內</li>

### 41. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:236:41

- Korean: 시스템은 사용자의 언어 설정에 따라 해당 언어의 공지를 자동으로 표시합니다
- Source: 系統會根據使用者的語言設定自動顯示對應的公告內容
- Context: <li>系統會根據使用者的語言設定自動顯示對應的公告內容</li>

### 42. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:237:42

- Korean: 한 가지 언어만 입력하면 해당 언어가 모든 사용자에게 기본 공지로 표시됩니다
- Source: 如果只填寫一種語言，該語言將作為所有使用者的預設公告
- Context: <li>如果只填寫一種語言，該語言將作為所有使用者的預設公告</li>

### 43. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:238:43

- Korean: 자동 숨김 기능을 사용하면 공지가 사용자 이용을 지나치게 방해하지 않습니다
- Source: 自動隱藏功能可以避免公告過於干擾用戶
- Context: <li>自動隱藏功能可以避免公告過於干擾用戶</li>

### 44. src/components/Admin/AnnouncementManager/components/AnnouncementEditor.js:239:44

- Korean: 변경 사항은 즉시 적용되며 웹사이트를 다시 배포할 필요가 없습니다
- Source: 修改後會立即生效，無需重新部署網站
- Context: <li>修改後會立即生效，無需重新部署網站</li>

### 45. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:59:45

- Korean: 실시간 미리보기
- Source: 即時預覽
- Context: <h2>即時預覽</h2>

### 46. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:65:46

- Korean: 중국어 버전 미리보기
- Source: 預覽中文版本
- Context: title="預覽中文版本"

### 47. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:66:47

- Korean: 🇹🇼 중국어
- Source: 🇹🇼 中文
- Context: >

### 48. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:72:48

- Korean: 영어 버전 미리보기
- Source: 預覽英文版本
- Context: title="預覽英文版本"

### 49. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:80:49

- Korean: 미리보기 새로고침
- Source: 重新載入預覽
- Context: title="重新載入預覽"

### 50. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:94:50

- Korean: 홈
- Source: 首頁
- Context: <span>首頁</span>

### 51. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:95:51

- Korean: 분석
- Source: 分析
- Context: <span>分析</span>

### 52. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:96:52

- Korean: 구독
- Source: 訂閱
- Context: <span>訂閱</span>

### 53. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:113:53

- Korean: 공지가 닫혔습니다 (새로고침 버튼을 눌러 확인하세요)
- Source: 公告已關閉 (點擊重新載入按鈕查看)
- Context: <p>公告已關閉 (點擊重新載入按鈕查看)</p>

### 54. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:115:54

- Korean: 공지가 비활성화되었습니다
- Source: 公告已停用
- Context: <p>公告已停用</p>

### 55. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:124:55

- Korean: 주식 시장 심리 분석
- Source: 股市情緒分析
- Context: <h3>股市情緒分析</h3>

### 56. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:125:56

- Korean: 여기는 웹사이트의 주요 콘텐츠 영역입니다...
- Source: 這裡是網站的主要內容區域...
- Context: <p>這裡是網站的主要內容區域...</p>

### 57. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:134:57

- Korean: 미리보기 정보
- Source: 預覽資訊
- Context: <h4>預覽資訊</h4>

### 58. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:137:58

- Korean: 상태:
- Source: 狀態:
- Context: <span className="announcement-preview-info-label">狀態:</span>

### 59. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:139:59

- Korean: 활성화됨
- Source: 已啟用
- Context: {previewConfig.enabled ? '已啟用' : '已停用'}

### 60. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:139:60

- Korean: 비활성화됨
- Source: 已停用
- Context: {previewConfig.enabled ? '已啟用' : '已停用'}

### 61. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:143:61

- Korean: 현재 언어:
- Source: 當前語言:
- Context: <span className="announcement-preview-info-label">當前語言:</span>

### 62. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:144:62

- Korean: 번체 중국어
- Source: 繁體中文
- Context: <span className="announcement-preview-info-value">{previewLanguage === 'zh-TW' ? '繁體中文' : 'English'}</span>

### 63. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:147:63

- Korean: 메시지 길이:
- Source: 訊息長度:
- Context: <span className="announcement-preview-info-label">訊息長度:</span>

### 64. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:148:64

- Korean: 자
- Source: 字元
- Context: <span className="announcement-preview-info-value">{getPreviewMessage()?.length || 0} 字元</span>

### 65. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:151:65

- Korean: 자동 숨김:
- Source: 自動隱藏:
- Context: <span className="announcement-preview-info-label">自動隱藏:</span>

### 66. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:153:66

- Korean: {{previewConfig.autoHideDelay / 1000}}초 후
- Source: {{previewConfig.autoHideDelay / 1000}}秒後
- Context: {previewConfig.autoHide ? `${previewConfig.autoHideDelay / 1000}秒後` : '關閉'}

### 67. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:153:67

- Korean: 닫힘
- Source: 關閉
- Context: {previewConfig.autoHide ? `${previewConfig.autoHideDelay / 1000}秒後` : '關閉'}

### 68. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:163:68

- Korean: 검증 결과
- Source: 驗證結果
- Context: <h4>驗證結果</h4>

### 69. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:169:69

- Korean: 설정이 유효합니다
- Source: 配置有效
- Context: {previewData.validation.isValid ? '配置有效' : '配置無效'}

### 70. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:169:70

- Korean: 설정이 유효하지 않습니다
- Source: 配置無效
- Context: {previewData.validation.isValid ? '配置有效' : '配置無效'}

### 71. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:173:71

- Korean: 글자 수:
- Source: 字元數:
- Context: <span>字元數: {previewData.validation.messageLength}/{previewData.validation.maxLength}</span>

### 72. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:181:72

- Korean: 미리보기 안내
- Source: 預覽說明
- Context: <h4>預覽說明</h4>

### 73. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:183:73

- Korean: 미리보기에는 설정 변경 사항이 실시간으로 반영됩니다
- Source: 預覽會即時反映您的設定變更
- Context: <li>預覽會即時反映您的設定變更</li>

### 74. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:184:74

- Korean: 미리보기에서도 자동 숨김 기능이 정상적으로 작동합니다
- Source: 自動隱藏功能在預覽中正常運作
- Context: <li>自動隱藏功能在預覽中正常運作</li>

### 75. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:185:75

- Korean: 🔄 버튼을 누르면 미리보기를 새로고침할 수 있습니다
- Source: 點擊 🔄 按鈕可以重新載入預覽
- Context: <li>點擊 🔄 按鈕可以重新載入預覽</li>

### 76. src/components/Admin/AnnouncementManager/components/AnnouncementPreview.js:186:76

- Korean: 실제 표시 결과는 브라우저에 따라 다소 다를 수 있습니다
- Source: 實際效果可能因瀏覽器而略有差異
- Context: <li>實際效果可能因瀏覽器而略有差異</li>

### 77. src/components/Common/AnnouncementBar/AnnouncementBarPreview.js:197:77

- Korean: 공지 닫기
- Source: 關閉公告
- Context: aria-label="關閉公告"

### 78. src/components/Common/AnnouncementBar/AnnouncementBarPreview.js:198:78

- Korean: 공지 닫기
- Source: 關閉公告
- Context: title="關閉公告"

### 79. src/components/Common/AnnouncementBar/AnnouncementDevTools.js:26:79

- Korean: 현재 공지 기록을 삭제했습니다!
- Source: 當前公告記錄已清除！
- Context: alert('當前公告記錄已清除！');

### 80. src/components/Common/AnnouncementBar/AnnouncementDevTools.js:33:80

- Korean: 모든 공지 기록을 삭제했습니다!
- Source: 所有公告記錄已清除！
- Context: alert('所有公告記錄已清除！');

### 81. src/components/Common/AnnouncementBar/AnnouncementDevTools.js:67:81

- Korean: 🔧 공지 개발 도구
- Source: 🔧 公告開發工具
- Context: <strong>🔧 公告開發工具</strong>

### 82. src/components/Common/AnnouncementBar/AnnouncementDevTools.js:74:82

- Korean: 현재 공지 통계:
- Source: 當前公告統計:
- Context: <strong>當前公告統計:</strong>

### 83. src/components/Common/AnnouncementBar/AnnouncementDevTools.js:77:83

- Korean: 닫은 횟수:
- Source: 關閉次數:
- Context: <div>關閉次數: {stats.dismissCount}</div>

### 84. src/components/Common/AnnouncementBar/AnnouncementDevTools.js:78:84

- Korean: 마지막으로 닫은 시간:
- Source: 最後關閉:
- Context: <div>最後關閉: {stats.lastDismissed ? new Date(stats.lastDismissed).toLocaleString() : '無'}</div>

### 85. src/components/Common/AnnouncementBar/AnnouncementDevTools.js:78:85

- Korean: 없음
- Source: 無
- Context: <div>最後關閉: {stats.lastDismissed ? new Date(stats.lastDismissed).toLocaleString() : '無'}</div>

### 86. src/components/Common/AnnouncementBar/AnnouncementDevTools.js:79:86

- Korean: 다음 표시 시간:
- Source: 下次顯示:
- Context: <div>下次顯示: {stats.nextShowTime ? new Date(stats.nextShowTime).toLocaleString() : '無'}</div>

### 87. src/components/Common/AnnouncementBar/AnnouncementDevTools.js:79:87

- Korean: 없음
- Source: 無
- Context: <div>下次顯示: {stats.nextShowTime ? new Date(stats.nextShowTime).toLocaleString() : '無'}</div>

### 88. src/components/Common/AnnouncementBar/AnnouncementDevTools.js:80:88

- Korean: 쿨다운 중:
- Source: 冷卻中:
- Context: <div>冷卻中: {stats.isInCooldown ? '是' : '否'}</div>

### 89. src/components/Common/AnnouncementBar/AnnouncementDevTools.js:80:89

- Korean: 예
- Source: 是
- Context: <div>冷卻中: {stats.isInCooldown ? '是' : '否'}</div>

### 90. src/components/Common/AnnouncementBar/AnnouncementDevTools.js:80:90

- Korean: 아니요
- Source: 否
- Context: <div>冷卻中: {stats.isInCooldown ? '是' : '否'}</div>

### 91. src/components/Common/AnnouncementBar/AnnouncementDevTools.js:88:91

- Korean: 데이터 없음
- Source: 無資料
- Context: <div style={{ marginLeft: '10px', color: '#ccc' }}>無資料</div>

### 92. src/components/Common/AnnouncementBar/AnnouncementDevTools.js:93:92

- Korean: 쿨다운 기간 설정:
- Source: 冷卻期設定:
- Context: <strong>冷卻期設定:</strong>

### 93. src/components/Common/AnnouncementBar/AnnouncementDevTools.js:96:93

- Korean: 제
- Source: 第
- Context: <div key={index}>第{index + 1}次: {period}</div>

### 94. src/components/Common/AnnouncementBar/AnnouncementDevTools.js:96:94

- Korean: 회:
- Source: 次:
- Context: <div key={index}>第{index + 1}次: {period}</div>

### 95. src/components/Common/AnnouncementBar/AnnouncementDevTools.js:113:95

- Korean: 현재 항목 삭제
- Source: 清除當前
- Context: >

### 96. src/components/Common/AnnouncementBar/AnnouncementDevTools.js:127:96

- Korean: 전체 삭제
- Source: 清除全部
- Context: >

### 97. src/components/Common/AnnouncementBar/AnnouncementDevTools.js:141:97

- Korean: 새로고침
- Source: 重新整理
- Context: >

### 98. src/components/Common/AnnouncementBar/AnnouncementDevTools.js:152:98

- Korean: 💡 수동 검증 스크립트는 `frontend/scripts/verification/announcementCooldownVerification.js`로 이동했습니다
- Source: 💡 手動驗證腳本已搬到 `frontend/scripts/verification/announcementCooldownVerification.js`
- Context: }}>

### 99. src/components/Common/Footer/Footer.js:80:99

- Korean: 본 웹사이트에서 제공하는 정보 링크는 자유롭게 공유하실 수 있습니다. 콘텐츠를 재게시하려면 반드시 웹사이트의 사전 동의를 받아야 합니다. 문의 이메일:
- Source: 歡迎分享本網站提供之資訊連結，如需轉載內容務必經由本網站同意。聯絡信箱：
- Context: <Trans i18nKey="footer.disclaimer2">

### 100. src/components/Redemption/RedemptionConfirmationModal.js:237:100

- Korean: 읽고 동의했습니다
- Source: 我已閱讀並同意
- Context: <span className="redemption-confirmation-checkbox-text">

### 101. src/components/Redemption/RedemptionConfirmationModal.js:244:101

- Korean: 서비스 이용약관 및 개인정보 처리방침
- Source: 服務條款和隱私政策
- Context: >

### 102. src/components/FloatingSponsorButton/FloatingSponsorButton.js:18:102

- Korean: 후원하기
- Source: 贊助我們
- Context: <img src={sponsorIcon} alt="贊助我們" />

### 103. src/components/MarketSentimentIndex/MarketSentimentIndex.js:50:103

- Korean: 최근 참고
- Source: 近期參考
- Context: : (currentLang === 'zh-TW' ? '近期參考' : currentLang === 'zh-CN' ? '近期参考' : 'Recent Reference')}

### 104. src/components/MarketSentimentIndex/MarketSentimentIndex.js:50:104

- Korean: 최근 참고
- Source: 近期参考
- Context: : (currentLang === 'zh-TW' ? '近期參考' : currentLang === 'zh-CN' ? '近期参考' : 'Recent Reference')}

### 105. src/components/MarketSentimentIndex/MarketSentimentIndex.js:861:105

- Korean: 과거 극단적 공포 구간의 저점
- Source: 過往極端恐懼低點
- Context: label: currentLang === 'zh-TW' ? '過往極端恐懼低點' : currentLang === 'zh-CN' ? '历史极度恐惧低点' : 'Past extreme fear lows',

### 106. src/components/MarketSentimentIndex/MarketSentimentIndex.js:861:106

- Korean: 과거 극단적 공포 구간의 저점
- Source: 历史极度恐惧低点
- Context: label: currentLang === 'zh-TW' ? '過往極端恐懼低點' : currentLang === 'zh-CN' ? '历史极度恐惧低点' : 'Past extreme fear lows',

### 107. src/components/MarketSentimentIndex/MarketSentimentIndex.js:1080:107

- Korean: 과거 극단적 공포 구간의 저점
- Source: 過往極端恐懼低點
- Context: if (tooltipItem.dataset.label === (currentLang === 'zh-TW' ? '過往極端恐懼低點' : currentLang === 'zh-CN' ? '历史极度恐惧低点' : 'Past extreme fear lows')) {

### 108. src/components/MarketSentimentIndex/MarketSentimentIndex.js:1080:108

- Korean: 과거 극단적 공포 구간의 저점
- Source: 历史极度恐惧低点
- Context: if (tooltipItem.dataset.label === (currentLang === 'zh-TW' ? '過往極端恐懼低點' : currentLang === 'zh-CN' ? '历史极度恐惧低点' : 'Past extreme fear lows')) {

### 109. src/components/MarketSentimentIndex/MarketSentimentIndex.js:1320:109

- Korean: 이 지표는 시장 심리를 다른 관점에서 살펴볼 수 있도록 합니다. 핵심은 단순히 수치가 높거나 낮은지가 아니라, 시장의 낙관이나 비관이 지나치게 한쪽으로 쏠렸는지를 확인하는 것입니다.
- Source: 這個指標提供另一個觀察市場情緒的角度，重點不是單看高低，而是看它是否已經反映出市場過度一致的樂觀或悲觀。
- Context: return '這個指標提供另一個觀察市場情緒的角度，重點不是單看高低，而是看它是否已經反映出市場過度一致的樂觀或悲觀。';

### 110. src/components/MarketSentimentIndex/MarketSentimentIndex.js:1323:110

- Korean: 이 지표는 시장 심리를 다른 관점에서 살펴볼 수 있도록 합니다. 핵심은 단순히 수치가 높거나 낮은지가 아니라, 시장의 낙관이나 비관이 지나치게 한쪽으로 쏠렸는지를 확인하는 것입니다.
- Source: 这个指标提供了另一个观察市场情绪的角度。重点不只是数值高低，而是看它是否反映出市场已经过度一致地乐观或悲观。
- Context: return '这个指标提供了另一个观察市场情绪的角度。重点不只是数值高低，而是看它是否反映出市场已经过度一致地乐观或悲观。';

### 111. src/components/MarketSentimentIndex/MarketSentimentIndex.js:1629:111

- Korean: 종합 시장 심리 보기 전환
- Source: 綜合情緒視角切換
- Context: aria-label={currentLang === 'zh-TW' ? '綜合情緒視角切換' : currentLang === 'zh-CN' ? '综合情绪视角切换' : 'Composite sentiment views'}

### 112. src/components/MarketSentimentIndex/MarketSentimentIndex.js:1629:112

- Korean: 종합 시장 심리 보기 전환
- Source: 综合情绪视角切换
- Context: aria-label={currentLang === 'zh-TW' ? '綜合情緒視角切換' : currentLang === 'zh-CN' ? '综合情绪视角切换' : 'Composite sentiment views'}

### 113. src/components/MarketSentimentIndex/MarketSentimentIndex.js:1637:113

- Korean: 최신 시장 심리
- Source: 最新市場情緒
- Context: {currentLang === 'zh-TW' ? '最新市場情緒' : currentLang === 'zh-CN' ? '最新市场情绪' : 'Latest market sentiment'}

### 114. src/components/MarketSentimentIndex/MarketSentimentIndex.js:1637:114

- Korean: 최신 시장 심리
- Source: 最新市场情绪
- Context: {currentLang === 'zh-TW' ? '最新市場情緒' : currentLang === 'zh-CN' ? '最新市场情绪' : 'Latest market sentiment'}

### 115. src/components/MarketSentimentIndex/MarketSentimentIndex.js:1648:115

- Korean: 과거 추이
- Source: 歷史趨勢
- Context: {currentLang === 'zh-TW' ? '歷史趨勢' : currentLang === 'zh-CN' ? '历史趋势' : 'History'}

### 116. src/components/MarketSentimentIndex/MarketSentimentIndex.js:1648:116

- Korean: 과거 추이
- Source: 历史趋势
- Context: {currentLang === 'zh-TW' ? '歷史趨勢' : currentLang === 'zh-CN' ? '历史趋势' : 'History'}

### 117. src/components/MarketSentimentIndex/MarketSentimentIndex.js:1902:117

- Korean: 지표 상세 닫기
- Source: 關閉指標詳情
- Context: aria-label={currentLang === 'zh-TW' ? '關閉指標詳情' : currentLang === 'zh-CN' ? '关闭指标详情' : 'Close indicator detail'}

### 118. src/components/MarketSentimentIndex/MarketSentimentIndex.js:1902:118

- Korean: 지표 상세 닫기
- Source: 关闭指标详情
- Context: aria-label={currentLang === 'zh-TW' ? '關閉指標詳情' : currentLang === 'zh-CN' ? '关闭指标详情' : 'Close indicator detail'}

### 119. src/components/MarketSentimentIndex/marketConfigs.js:4:119

- Korean: 대만 주식시장 공포·탐욕 지수 소개
- Source: 關於台股恐懼貪婪指標
- Context: title: '關於台股恐懼貪婪指標',

### 120. src/components/MarketSentimentIndex/marketConfigs.js:5:120

- Korean: 현재 종합 점수는 {{currentCompositeScore ?? '-'}}점이며, 전반적으로 「{{currentCompositeSentimentLabel}}」 쪽에 가깝습니다. 대만 시장의 9개 신호를 0~100점으로 종합해 전체 심리를 먼저 파악하고 그 배경의 변화를 살펴볼 수 있습니다.
- Source: 本次綜合分數為 {{currentCompositeScore ?? '-'}}，整體偏向「{{currentCompositeSentimentLabel}}」。九項台股訊號合成 0 到 100 分，讓你先看整體情緒，再找出背後的變化。
- Context: subtitle: `本次綜合分數為 ${currentCompositeScore ?? '-'}，整體偏向「${currentCompositeSentimentLabel}」。九項台股訊號合成 0 到 100 分，讓你先看整體情緒，再找出背後的變化。`,

### 121. src/components/MarketSentimentIndex/marketConfigs.js:8:121

- Korean: 1. 대만 시장의 다양한 심리 신호 통합
- Source: 1. 整合台股多面向情緒訊號
- Context: title: '1. 整合台股多面向情緒訊號',

### 122. src/components/MarketSentimentIndex/marketConfigs.js:9:122

- Korean: 옵션, 신용융자·대주, 외국인 선물 포지션부터 환율, 모멘텀, 시장 참여도까지 함께 살펴 대만 시장의 위험 선호도를 파악합니다. 신호마다 서로 다른 방향으로 움직일 수 있으므로 종합 점수로 전체적인 흐름을 먼저 확인할 수 있습니다.
- Source: 從選擇權、融資融券、外資期貨部位到匯率、動能與市場參與度，合併觀察台股的風險偏好。不同訊號可能各走各的，綜合分數讓你先掌握整體傾向。
- Context: body: '從選擇權、融資融券、外資期貨部位到匯率、動能與市場參與度，合併觀察台股的風險偏好。不同訊號可能各走各的，綜合分數讓你先掌握整體傾向。'

### 123. src/components/MarketSentimentIndex/marketConfigs.js:12:123

- Korean: 2. 심리가 극단에 이르렀는지 확인
- Source: 2. 留意情緒是否走到極端
- Context: title: '2. 留意情緒是否走到極端',

### 124. src/components/MarketSentimentIndex/marketConfigs.js:13:124

- Korean: 점수가 낮으면 종합 결과가 공포 쪽에, 높으면 탐욕 쪽에 치우쳐 있음을 의미합니다. 극단적인 수치가 나타나면 각 지표를 열어 어떤 신호가 점수에 영향을 주었는지 확인한 뒤 가권지수 흐름과 비교해 보세요.
- Source: 低分代表合成後偏向恐懼，高分代表偏向貪婪。遇到極端讀數，打開各項指標，確認哪些訊號推動分數，再對照加權指數走勢。
- Context: body: '低分代表合成後偏向恐懼，高分代表偏向貪婪。遇到極端讀數，打開各項指標，確認哪些訊號推動分數，再對照加權指數走勢。'

### 125. src/components/MarketSentimentIndex/marketConfigs.js:16:125

- Korean: 3. 데이터로 고점 추격과 투매 충동 점검
- Source: 3. 用數據檢查追高與殺低的衝動
- Context: title: '3. 用數據檢查追高與殺低的衝動',

### 126. src/components/MarketSentimentIndex/marketConfigs.js:17:126

- Korean: 급락할 때 매도하고 싶거나 급등할 때 기회를 놓칠까 걱정될 때는 먼저 데이터로 돌아가 보세요. 심리 점수, 지표 구성, 과거 위치를 비교한 뒤 기존 포트폴리오 구성을 조정할지 판단할 수 있습니다.
- Source: 大跌時想出場、急漲時怕錯過，都可以先回到數據。比較情緒分數、指標組成與歷史位置，再決定是否調整原本的配置。
- Context: body: '大跌時想出場、急漲時怕錯過，都可以先回到數據。比較情緒分數、指標組成與歷史位置，再決定是否調整原本的配置。'

### 127. src/components/MarketSentimentIndex/marketConfigs.js:25:127

- Korean: 대만 주식시장 공포·탐욕 지수 소개
- Source: 关于台湾股市恐惧与贪婪指数
- Context: title: '关于台湾股市恐惧与贪婪指数',

### 128. src/components/MarketSentimentIndex/marketConfigs.js:26:128

- Korean: 현재 종합 점수는 {{currentCompositeScore ?? '-'}}점이며, 전반적으로 「{{currentCompositeSentimentLabel}}」 쪽에 가깝습니다. 대만 시장의 9개 신호를 0~100점으로 종합해 전체 심리를 먼저 파악하고 그 배경의 변화를 살펴볼 수 있습니다.
- Source: 本次综合得分为 {{currentCompositeScore ?? '-'}}，整体偏向「{{currentCompositeSentimentLabel}}」。九项台湾股市信号合成为 0 到 100 分，让你先了解整体情绪，再查看背后的变化。
- Context: subtitle: `本次综合得分为 ${currentCompositeScore ?? '-'}，整体偏向「${currentCompositeSentimentLabel}」。九项台湾股市信号合成为 0 到 100 分，让你先了解整体情绪，再查看背后的变化。`,

### 129. src/components/MarketSentimentIndex/marketConfigs.js:29:129

- Korean: 1. 대만 시장의 다양한 심리 신호 통합
- Source: 1. 整合台湾股市多个维度的情绪信号
- Context: title: '1. 整合台湾股市多个维度的情绪信号',

### 130. src/components/MarketSentimentIndex/marketConfigs.js:30:130

- Korean: 옵션, 신용융자·대주, 외국인 선물 포지션부터 환율, 모멘텀, 시장 참여도까지 함께 살펴 대만 시장의 위험 선호도를 파악합니다. 신호마다 서로 다른 방향으로 움직일 수 있으므로 종합 점수로 전체적인 흐름을 먼저 확인할 수 있습니다.
- Source: 从期权、融资融券、外资期货持仓到汇率、动能与市场参与度，综合观察台湾股市的风险偏好。不同信号可能各有表现，综合得分帮助你先掌握整体倾向。
- Context: body: '从期权、融资融券、外资期货持仓到汇率、动能与市场参与度，综合观察台湾股市的风险偏好。不同信号可能各有表现，综合得分帮助你先掌握整体倾向。'

### 131. src/components/MarketSentimentIndex/marketConfigs.js:33:131

- Korean: 2. 심리가 극단에 이르렀는지 확인
- Source: 2. 留意情绪是否走向极端
- Context: title: '2. 留意情绪是否走向极端',

### 132. src/components/MarketSentimentIndex/marketConfigs.js:34:132

- Korean: 점수가 낮으면 종합 결과가 공포 쪽에, 높으면 탐욕 쪽에 치우쳐 있음을 의미합니다. 극단적인 수치가 나타나면 각 지표를 열어 어떤 신호가 점수에 영향을 주었는지 확인한 뒤 가권지수 흐름과 비교해 보세요.
- Source: 低分代表综合结果偏向恐惧，高分代表偏向贪婪。遇到极端读数时，可以打开各项指标，确认哪些信号推动了得分，再对照加权指数走势。
- Context: body: '低分代表综合结果偏向恐惧，高分代表偏向贪婪。遇到极端读数时，可以打开各项指标，确认哪些信号推动了得分，再对照加权指数走势。'

### 133. src/components/MarketSentimentIndex/marketConfigs.js:37:133

- Korean: 3. 데이터로 고점 추격과 투매 충동 점검
- Source: 3. 用数据检查追涨与杀跌的冲动
- Context: title: '3. 用数据检查追涨与杀跌的冲动',

### 134. src/components/MarketSentimentIndex/marketConfigs.js:38:134

- Korean: 급락할 때 매도하고 싶거나 급등할 때 기회를 놓칠까 걱정될 때는 먼저 데이터로 돌아가 보세요. 심리 점수, 지표 구성, 과거 위치를 비교한 뒤 기존 포트폴리오 구성을 조정할지 판단할 수 있습니다.
- Source: 大跌时想离场、急涨时怕错过，都可以先回到数据。比较情绪得分、指标组成与历史位置，再决定是否调整原有配置。
- Context: body: '大跌时想离场、急涨时怕错过，都可以先回到数据。比较情绪得分、指标组成与历史位置，再决定是否调整原有配置。'

### 135. src/components/MarketSentimentIndex/marketConfigs.js:76:135

- Korean: 현재 미국 시장 심리
- Source: 當前美股市場情緒
- Context: currentGaugeHeadlineZh: '當前美股市場情緒',

### 136. src/components/MarketSentimentIndex/marketConfigs.js:77:136

- Korean: 현재 미국 시장 심리
- Source: 当前美股市场情绪
- Context: currentGaugeHeadlineZhCn: '当前美股市场情绪',

### 137. src/components/MarketSentimentIndex/marketConfigs.js:82:137

- Korean: 미국 시장 공포·탐욕 지수
- Source: 美股恐懼貪婪指標
- Context: 'zh-TW': '美股恐懼貪婪指標',

### 138. src/components/MarketSentimentIndex/marketConfigs.js:83:138

- Korean: 미국 시장 공포·탐욕 지수
- Source: 美股恐惧与贪婪指数
- Context: 'zh-CN': '美股恐惧与贪婪指数',

### 139. src/components/MarketSentimentIndex/marketConfigs.js:108:139

- Korean: 현재 대만 시장 심리
- Source: 當前台股市場情緒
- Context: currentGaugeHeadlineZh: '當前台股市場情緒',

### 140. src/components/MarketSentimentIndex/marketConfigs.js:109:140

- Korean: 현재 대만 시장 심리
- Source: 当前台湾股市情绪
- Context: currentGaugeHeadlineZhCn: '当前台湾股市情绪',

### 141. src/components/MarketSentimentIndex/marketConfigs.js:113:141

- Korean: {{formattedRestrictionCutoffDate}} 기준 대만 시장 심리
- Source: {{formattedRestrictionCutoffDate}} 的台股市場情緒
- Context: ? `${formattedRestrictionCutoffDate} 的台股市場情緒`

### 142. src/components/MarketSentimentIndex/marketConfigs.js:115:142

- Korean: {{formattedRestrictionCutoffDate}} 기준 대만 시장 심리
- Source: {{formattedRestrictionCutoffDate}} 的台湾股市情绪
- Context: ? `${formattedRestrictionCutoffDate} 的台湾股市情绪`

### 143. src/components/MarketSentimentIndex/marketConfigs.js:119:143

- Korean: 대만 가권지수
- Source: 台股加權指數
- Context: 'zh-TW': '台股加權指數',

### 144. src/components/MarketSentimentIndex/marketConfigs.js:120:144

- Korean: 대만 가권지수
- Source: 台湾加权指数
- Context: 'zh-CN': '台湾加权指数',

### 145. src/components/MarketSentimentIndex/marketConfigs.js:125:145

- Korean: 대만 시장 공포·탐욕 지수
- Source: 台股恐懼貪婪指標
- Context: 'zh-TW': '台股恐懼貪婪指標',

### 146. src/components/MarketSentimentIndex/marketConfigs.js:126:146

- Korean: 대만 시장 공포·탐욕 지수
- Source: 台湾股市恐惧与贪婪指数
- Context: 'zh-CN': '台湾股市恐惧与贪婪指数',

### 147. src/components/MarketSentimentIndex/SharedSentimentHistoryChart.js:63:147

- Korean: 과거 극단적 공포 구간의 저점
- Source: 過往極端恐懼低點
- Context: label: currentLang === 'zh-TW' ? '過往極端恐懼低點' : currentLang === 'zh-CN' ? '历史极度恐惧低点' : 'Past extreme fear lows',

### 148. src/components/MarketSentimentIndex/SharedSentimentHistoryChart.js:63:148

- Korean: 과거 극단적 공포 구간의 저점
- Source: 历史极度恐惧低点
- Context: label: currentLang === 'zh-TW' ? '過往極端恐懼低點' : currentLang === 'zh-CN' ? '历史极度恐惧低点' : 'Past extreme fear lows',

### 149. src/components/MarketSentimentIndex/MarketSentimentGauge/MarketSentimentGauge.js:255:149

- Korean: 현재 미국 시장 심리
- Source: 當前美股市場情緒
- Context: {headlineText || (currentLang === 'zh-TW' ? '當前美股市場情緒' : currentLang === 'zh-CN' ? '当前美股市场情绪' : 'Current US market sentiment')}

### 150. src/components/MarketSentimentIndex/MarketSentimentGauge/MarketSentimentGauge.js:255:150

- Korean: 현재 미국 시장 심리
- Source: 当前美股市场情绪
- Context: {headlineText || (currentLang === 'zh-TW' ? '當前美股市場情緒' : currentLang === 'zh-CN' ? '当前美股市场情绪' : 'Current US market sentiment')}

### 151. src/components/MarketPulse/MarketPulse.js:9:151

- Korean: S&P 500
- Source: 标普 500
- Context: { id: 'sp500', zh: 'S&P 500', zhCN: '标普 500', en: 'S&P 500' },

### 152. src/components/MarketPulse/MarketPulse.js:10:152

- Korean: 나스닥 100
- Source: 纳斯达克 100
- Context: { id: 'nasdaq100', zh: 'NASDAQ 100', zhCN: '纳斯达克 100', en: 'Nasdaq 100' },

### 153. src/components/MarketPulse/MarketPulse.js:11:153

- Korean: 다우존스 산업평균지수
- Source: 道瓊工業
- Context: { id: 'dow', zh: '道瓊工業', zhCN: '道琼斯工业指数', en: 'Dow Jones' },

### 154. src/components/MarketPulse/MarketPulse.js:11:154

- Korean: 다우존스 산업평균지수
- Source: 道琼斯工业指数
- Context: { id: 'dow', zh: '道瓊工業', zhCN: '道琼斯工业指数', en: 'Dow Jones' },

### 155. src/components/MarketPulse/MarketPulse.js:12:155

- Korean: 대만 가권지수
- Source: 台灣加權
- Context: { id: 'taiwan', zh: '台灣加權', zhCN: '台湾加权指数', en: 'TAIEX' },

### 156. src/components/MarketPulse/MarketPulse.js:12:156

- Korean: 대만 가권지수
- Source: 台湾加权指数
- Context: { id: 'taiwan', zh: '台灣加權', zhCN: '台湾加权指数', en: 'TAIEX' },

### 157. src/components/MarketPulse/MarketPulse.js:13:157

- Korean: 닛케이 225
- Source: 日經 225
- Context: { id: 'nikkei', zh: '日經 225', zhCN: '日经 225', en: 'Nikkei 225' },

### 158. src/components/MarketPulse/MarketPulse.js:13:158

- Korean: 닛케이 225
- Source: 日经 225
- Context: { id: 'nikkei', zh: '日經 225', zhCN: '日经 225', en: 'Nikkei 225' },

### 159. src/components/MarketPulse/MarketPulse.js:14:159

- Korean: 상하이 종합지수
- Source: 上證指數
- Context: { id: 'shanghai', zh: '上證指數', zhCN: '上证指数', en: 'Shanghai Composite' },

### 160. src/components/MarketPulse/MarketPulse.js:14:160

- Korean: 상하이 종합지수
- Source: 上证指数
- Context: { id: 'shanghai', zh: '上證指數', zhCN: '上证指数', en: 'Shanghai Composite' },

### 161. src/components/MarketPulse/MarketPulse.js:15:161

- Korean: 코스피
- Source: 韓國綜合
- Context: { id: 'kospi', zh: '韓國綜合', zhCN: '韩国综合指数', en: 'KOSPI' },

### 162. src/components/MarketPulse/MarketPulse.js:15:162

- Korean: 코스피
- Source: 韩国综合指数
- Context: { id: 'kospi', zh: '韓國綜合', zhCN: '韩国综合指数', en: 'KOSPI' },

### 163. src/components/MarketPulse/MarketPulse.js:16:163

- Korean: 항셍지수
- Source: 恆生指數
- Context: { id: 'hangseng', zh: '恆生指數', zhCN: '恒生指数', en: 'Hang Seng' },

### 164. src/components/MarketPulse/MarketPulse.js:16:164

- Korean: 항셍지수
- Source: 恒生指数
- Context: { id: 'hangseng', zh: '恆生指數', zhCN: '恒生指数', en: 'Hang Seng' },

### 165. src/components/MarketPulse/MarketPulse.js:17:165

- Korean: FTSE 100
- Source: 富時 100
- Context: { id: 'ftse100', zh: '富時 100', zhCN: '富时 100', en: 'FTSE 100' }

### 166. src/components/MarketPulse/MarketPulse.js:17:166

- Korean: FTSE 100
- Source: 富时 100
- Context: { id: 'ftse100', zh: '富時 100', zhCN: '富时 100', en: 'FTSE 100' }

### 167. src/utils/redemptionFormatting.js:260:167

- Korean: {{diffHours}}시간 전
- Source: {{diffHours}} 小时前
- Context: return diffHours > 0 ? `${diffHours} 小时前` : '刚刚';

### 168. src/utils/redemptionFormatting.js:260:168

- Korean: 방금
- Source: 刚刚
- Context: return diffHours > 0 ? `${diffHours} 小时前` : '刚刚';

### 169. src/utils/redemptionFormatting.js:263:169

- Korean: {{diffHours}}시간 전
- Source: {{diffHours}} 小時前
- Context: return diffHours > 0 ? `${diffHours} 小時前` : '剛剛';

### 170. src/utils/redemptionFormatting.js:263:170

- Korean: 방금
- Source: 剛剛
- Context: return diffHours > 0 ? `${diffHours} 小時前` : '剛剛';

### 171. src/utils/redemptionFormatting.js:283:171

- Korean: 일
- Source: 天
- Context: 'day': '天',

### 172. src/utils/redemptionFormatting.js:284:172

- Korean: 개월
- Source: 个月
- Context: 'month': currentLocale === 'zh-CN' ? '个月' : '個月',

### 173. src/utils/redemptionFormatting.js:284:173

- Korean: 개월
- Source: 個月
- Context: 'month': currentLocale === 'zh-CN' ? '个月' : '個月',

### 174. src/utils/redemptionFormatting.js:285:174

- Korean: 년
- Source: 年
- Context: 'year': '年'

### 175. src/utils/redemptionFormatting.js:315:175

- Korean: 구독 기간 {{duration}}{{pluralizedUnit}} 연장
- Source: 延長 {{duration}} {{pluralizedUnit}}
- Context: return `延長 ${duration} ${pluralizedUnit}`;

### 176. src/utils/redemptionFormatting.js:317:176

- Korean: 구독 기간 {{duration}}{{pluralizedUnit}} 연장
- Source: 延长 {{duration}} {{pluralizedUnit}}
- Context: return `延长 ${duration} ${pluralizedUnit}`;

### 177. src/utils/redemptionFormatting.js:341:177

- Korean: {{percentage}}% 할인
- Source: {{percentage}}% 折扣
- Context: return `${percentage}% 折扣`;

### 178. src/utils/redemptionFormatting.js:349:178

- Korean: {{formattedAmount}} 할인
- Source: {{formattedAmount}} 折扣
- Context: return `${formattedAmount} 折扣`;

### 179. src/utils/redemptionFormatting.js:374:179

- Korean: 할인 적용
- Source: 折扣優惠
- Context: title: currentLocale === 'zh-TW' ? '折扣優惠' : currentLocale === 'zh-CN' ? '折扣优惠' : 'Discount Applied',

### 180. src/utils/redemptionFormatting.js:374:180

- Korean: 할인 적용
- Source: 折扣优惠
- Context: title: currentLocale === 'zh-TW' ? '折扣優惠' : currentLocale === 'zh-CN' ? '折扣优惠' : 'Discount Applied',

### 181. src/utils/redemptionFormatting.js:388:181

- Korean: 구독 기간 연장
- Source: 訂閱延長
- Context: title: currentLocale === 'zh-TW' ? '訂閱延長' : currentLocale === 'zh-CN' ? '订阅延期' : 'Subscription Extended',

### 182. src/utils/redemptionFormatting.js:388:182

- Korean: 구독 기간 연장
- Source: 订阅延期
- Context: title: currentLocale === 'zh-TW' ? '訂閱延長' : currentLocale === 'zh-CN' ? '订阅延期' : 'Subscription Extended',

### 183. src/utils/redemptionFormatting.js:398:183

- Korean: 요금제 업그레이드
- Source: 套餐升级
- Context: title: currentLocale === 'zh-CN' ? '套餐升级' : '方案升級',

### 184. src/utils/redemptionFormatting.js:398:184

- Korean: 요금제 업그레이드
- Source: 方案升級
- Context: title: currentLocale === 'zh-CN' ? '套餐升级' : '方案升級',

### 185. src/utils/redemptionFormatting.js:399:185

- Korean: {{planName}}로 업그레이드
- Source: 升级至 {{planName}}
- Context: description: currentLocale === 'zh-CN' ? `升级至 ${planName}` : `升級至 ${planName}`,
- Disposition: revised_after_context_review
- Review note: getLocalizedPlanName already includes 요금제; avoid literal particle notation (으) 사용자에게 노출되는 표기가 아님.

### 186. src/utils/redemptionFormatting.js:399:186

- Korean: {{planName}}로 업그레이드
- Source: 升級至 {{planName}}
- Context: description: currentLocale === 'zh-CN' ? `升级至 ${planName}` : `升級至 ${planName}`,
- Disposition: revised_after_context_review
- Review note: getLocalizedPlanName already includes 요금제; avoid literal particle notation (으) 사용자에게 노출되는 표기가 아님.

### 187. src/utils/redemptionFormatting.js:414:187

- Korean: 특별 혜택
- Source: 特殊優惠
- Context: title: currentLocale === 'zh-TW' ? '特殊優惠' : currentLocale === 'zh-CN' ? '特别优惠' : 'Special Benefits',

### 188. src/utils/redemptionFormatting.js:414:188

- Korean: 특별 혜택
- Source: 特别优惠
- Context: title: currentLocale === 'zh-TW' ? '特殊優惠' : currentLocale === 'zh-CN' ? '特别优惠' : 'Special Benefits',

### 189. src/utils/redemptionFormatting.js:415:189

- Korean: 특별 혜택이 제공됩니다.
- Source: 您將獲得特殊促銷優惠
- Context: description: currentLocale === 'zh-TW' ? '您將獲得特殊促銷優惠' : currentLocale === 'zh-CN' ? '您将获得特别促销优惠' : 'You will receive special promotional benefits',

### 190. src/utils/redemptionFormatting.js:415:190

- Korean: 특별 혜택이 제공됩니다.
- Source: 您将获得特别促销优惠
- Context: description: currentLocale === 'zh-TW' ? '您將獲得特殊促銷優惠' : currentLocale === 'zh-CN' ? '您将获得特别促销优惠' : 'You will receive special promotional benefits',

### 191. src/utils/redemptionFormatting.js:417:191

- Korean: 프리미엄 이용 권한
- Source: 高級權限
- Context: highlight: currentLocale === 'zh-TW' ? '高級權限' : currentLocale === 'zh-CN' ? '高级权限' : 'Premium Access'

### 192. src/utils/redemptionFormatting.js:417:192

- Korean: 프리미엄 이용 권한
- Source: 高级权限
- Context: highlight: currentLocale === 'zh-TW' ? '高級權限' : currentLocale === 'zh-CN' ? '高级权限' : 'Premium Access'

### 193. src/utils/redemptionFormatting.js:436:193

- Korean: 남은 기간
- Source: 剩余
- Context: const remaining = currentLocale === 'zh-CN' ? '剩余' : '剩餘';

### 194. src/utils/redemptionFormatting.js:436:194

- Korean: 남은 기간
- Source: 剩餘
- Context: const remaining = currentLocale === 'zh-CN' ? '剩余' : '剩餘';

### 195. src/utils/redemptionFormatting.js:437:195

- Korean: 시간
- Source: 小时
- Context: const hour = currentLocale === 'zh-CN' ? '小时' : '小時';

### 196. src/utils/redemptionFormatting.js:437:196

- Korean: 시간
- Source: 小時
- Context: const hour = currentLocale === 'zh-CN' ? '小时' : '小時';

### 197. src/utils/redemptionFormatting.js:438:197

- Korean: 분
- Source: 分钟
- Context: const minute = currentLocale === 'zh-CN' ? '分钟' : '分鐘';

### 198. src/utils/redemptionFormatting.js:438:198

- Korean: 분
- Source: 分鐘
- Context: const minute = currentLocale === 'zh-CN' ? '分钟' : '分鐘';

### 199. src/utils/redemptionFormatting.js:440:199

- Korean: {{remaining}} {{days}}일 {{hours}}{{hour}}
- Source: {{remaining}} {{days}} 天 {{hours}} {{hour}}
- Context: return `${remaining} ${days} 天 ${hours} ${hour}`;

### 200. src/utils/redemptionFormatting.js:533:200

- Korean: Free 요금제
- Source: 免費方案
- Context: 'free': '免費方案',

### 201. src/utils/redemptionFormatting.js:534:201

- Korean: Pro 요금제
- Source: Pro 方案
- Context: 'pro': 'Pro 方案',

### 202. src/utils/redemptionFormatting.js:535:202

- Korean: Premium 요금제
- Source: 高級方案
- Context: 'premium': '高級方案'

### 203. src/utils/redemptionFormatting.js:538:203

- Korean: Free 요금제
- Source: 免费套餐
- Context: 'free': '免费套餐',

### 204. src/utils/redemptionFormatting.js:539:204

- Korean: Pro 요금제
- Source: Pro 套餐
- Context: 'pro': 'Pro 套餐',

### 205. src/utils/redemptionFormatting.js:540:205

- Korean: Premium 요금제
- Source: 高级套餐
- Context: 'premium': '高级套餐'

### 206. src/utils/redemptionFormatting.js:564:206

- Korean: 예상 혜택 금액: {{formattedAmount}}
- Source: 預估價值：{{formattedAmount}}
- Context: return `預估價值：${formattedAmount}`;

### 207. src/utils/redemptionFormatting.js:566:207

- Korean: 예상 혜택 금액: {{formattedAmount}}
- Source: 预估价值：{{formattedAmount}}
- Context: return `预估价值：${formattedAmount}`;

### 208. src/components/Subscription/SubscriptionPlans/SubscriptionPlansPage.js:109:208

- Korean: 🔄 SubscriptionPlansPage: 플랜 데이터 로드 시작
- Source: 🔄 SubscriptionPlansPage: 開始載入方案資料
- Context: console.log('🔄 SubscriptionPlansPage: 開始載入方案資料');

### 209. src/components/Subscription/SubscriptionPlans/SubscriptionPlansPage.js:115:209

- Korean: ✅ SubscriptionPlansPage: 플랜 데이터 로드 성공
- Source: ✅ SubscriptionPlansPage: 方案資料載入成功
- Context: console.log('✅ SubscriptionPlansPage: 方案資料載入成功', plans);

### 210. src/components/Subscription/SubscriptionPlans/SubscriptionPlansPage.js:118:210

- Korean: ❌ SubscriptionPlansPage: 플랜 데이터 로드 실패
- Source: ❌ SubscriptionPlansPage: 方案資料載入失敗
- Context: console.error('❌ SubscriptionPlansPage: 方案資料載入失敗', error);

### 211. src/components/Subscription/SubscriptionPlans/SubscriptionPlansPage.js:197:211

- Korean: 🔧 결제 주기 변경으로 planAdjustments 재계산, 새 주기:
- Source: 🔧 計費週期改變，重新計算 planAdjustments，新週期:
- Context: console.log('🔧 計費週期改變，重新計算 planAdjustments，新週期:', period);

### 212. src/components/Subscription/SubscriptionPlans/SubscriptionPlansPage.js:215:212

- Korean: 🔧 redemptionData.benefits가 없어 planAdjustments 초기화
- Source: 🔧 沒有 redemptionData.benefits，清空 planAdjustments
- Context: console.log('🔧 沒有 redemptionData.benefits，清空 planAdjustments');

### 213. src/components/Subscription/SubscriptionPlans/SubscriptionPlansPage.js:226:213

- Korean: 🔧 planAdjustments 재계산, 결제 주기:
- Source: 🔧 重新計算 planAdjustments，計費週期:
- Context: console.log('🔧 重新計算 planAdjustments，計費週期:', currentBillingPeriod, '目標方案:', targetPlan);

### 214. src/components/Subscription/SubscriptionPlans/SubscriptionPlansPage.js:226:214

- Korean: 대상 플랜:
- Source: 目標方案:
- Context: console.log('🔧 重新計算 planAdjustments，計費週期:', currentBillingPeriod, '目標方案:', targetPlan);

### 215. src/components/Subscription/SubscriptionPlans/SubscriptionPlansPage.js:289:215

- Korean: 🔧 플랜 {{plan.id}} ({{currentBillingPeriod}}):
- Source: 🔧 方案 {{plan.id}} ({{currentBillingPeriod}}):
- Context: console.log(`🔧 方案 ${plan.id} (${currentBillingPeriod}):`, {

### 216. src/components/Subscription/SubscriptionPlans/SubscriptionPlansPage.js:296:216

- Korean: 🔧 새 planAdjustments 설정:
- Source: 🔧 設置新的 planAdjustments:
- Context: console.log('🔧 設置新的 planAdjustments:', adjustments);

### 217. src/components/Subscription/SubscriptionPlans/SubscriptionPlansPage.js:305:217

- Korean: 🔍 SubscriptionPlansPage.handleRedemptionPreview, 현재 결제 주기:
- Source: 🔍 SubscriptionPlansPage.handleRedemptionPreview，當前計費週期:
- Context: console.log('🔍 SubscriptionPlansPage.handleRedemptionPreview，當前計費週期:', billingPeriod);

### 218. src/components/Subscription/SubscriptionPlans/SubscriptionPlansPage.js:412:218

- Korean: 플랜 데이터를 불러오는 중...
- Source: 載入方案資料中...
- Context: {t('subscription.subscriptionPlans.loadingPlans', '載入方案資料中...')}

### 219. src/components/Subscription/SubscriptionPlans/SubscriptionPlansPage.js:418:219

- Korean: 플랜을 불러오지 못해 기본 데이터를 사용합니다
- Source: 載入方案失敗，使用預設資料
- Context: {t('subscription.subscriptionPlans.loadError', '載入方案失敗，使用預設資料')}

### 220. src/components/Subscription/SubscriptionPlans/SubscriptionPlansPage.js:493:220

- Korean: 무료 체험 안내
- Source: 免費試用通知
- Context: title={t('subscription.freeTrialDialog.title', '免費試用通知')}

### 221. src/components/Subscription/SubscriptionPlans/SubscriptionPlansPage.js:500:221

- Korean: 현재 모든 기능을 무료로 이용할 수 있습니다!
- Source: 目前所有功能免費開放！
- Context: {t('subscription.freeTrialDialog.heading', '目前所有功能免費開放！')}

### 222. src/components/Subscription/SubscriptionPlans/SubscriptionPlansPage.js:504:222

- Korean: 현재 기능 테스트를 진행 중이며, 모든 Pro 기능을 모든 사용자에게 무료로 제공하고 있습니다. 추후 유료화가 시작될 예정이니 기대해 주세요!
- Source: 我們正在進行功能測試，目前所有 Pro 功能都免費開放給所有用戶使用。未來我們將會開始收費，敬請期待！
- Context: '我們正在進行功能測試，目前所有 Pro 功能都免費開放給所有用戶使用。未來我們將會開始收費，敬請期待！'

### 223. src/components/Subscription/SubscriptionPlans/SubscriptionPlansPage.js:508:223

- Korean: 현재 무료로 제공되는 기능:
- Source: 目前免費開放的功能：
- Context: <h4>{t('subscription.freeTrialDialog.featuresTitle', '目前免費開放的功能：')}</h4>

### 224. src/components/Subscription/SubscriptionPlans/SubscriptionPlansPage.js:510:224

- Korean: 무제한 종목 조회
- Source: 無限制股票查詢
- Context: <li>✅ {t('subscription.freeTrialDialog.feature1', '無限制股票查詢')}</li>

### 225. src/components/Subscription/SubscriptionPlans/SubscriptionPlansPage.js:511:225

- Korean: 전체 시장 심리 분석
- Source: 完整市場情緒分析
- Context: <li>✅ {t('subscription.freeTrialDialog.feature2', '完整市場情緒分析')}</li>

### 226. src/components/Subscription/SubscriptionPlans/SubscriptionPlansPage.js:512:226

- Korean: 개인 맞춤형 포트폴리오 관리
- Source: 個人化投資組合管理
- Context: <li>✅ {t('subscription.freeTrialDialog.feature3', '個人化投資組合管理')}</li>

### 227. src/components/Subscription/SubscriptionPlans/SubscriptionPlansPage.js:521:227

- Korean: 확인
- Source: 我知道了
- Context: {t('subscription.freeTrialDialog.understood', '我知道了')}

### 228. src/components/Subscription/SubscriptionPlans/components/PlanCard.js:158:228

- Korean: 🔍 PlanCard: 취소했지만 아직 유효한 구독의 재구독 처리
- Source: 🔍 PlanCard 處理已取消但仍有效的訂閱重新訂閱
- Context: console.log('🔍 PlanCard 處理已取消但仍有效的訂閱重新訂閱');

### 229. src/components/Subscription/SubscriptionPlans/components/PlanCard.js:174:229

- Korean: 🔍 PlanCard: 재구독 할인 조건 확인:
- Source: 🔍 PlanCard 檢查折扣條件 (重新訂閱):
- Context: console.log('🔍 PlanCard 檢查折扣條件 (重新訂閱):', {

### 230. src/components/Subscription/SubscriptionPlans/components/PlanCard.js:200:230

- Korean: 🔍 PlanCard에서 PaymentPage로 전달하는 전체 매개변수 (재구독):
- Source: 🔍 PlanCard 傳遞給 PaymentPage 的完整參數 (重新訂閱):
- Context: console.log('🔍 PlanCard 傳遞給 PaymentPage 的完整參數 (重新訂閱):', {

### 231. src/components/Subscription/SubscriptionPlans/components/PlanCard.js:225:231

- Korean: 🔍 PlanCard: 할인 조건 확인:
- Source: 🔍 PlanCard 檢查折扣條件:
- Context: console.log('🔍 PlanCard 檢查折扣條件:', {

### 232. src/components/Subscription/SubscriptionPlans/components/PlanCard.js:251:232

- Korean: 🔍 PlanCard에서 PaymentPage로 전달하는 전체 매개변수:
- Source: 🔍 PlanCard 傳遞給 PaymentPage 的完整參數:
- Context: console.log('🔍 PlanCard 傳遞給 PaymentPage 的完整參數:', {

### 233. src/components/Subscription/SubscriptionPlans/components/PlanCard.js:316:233

- Korean: 🔍 PlanCard[{{plan.id}}]: planAdjustment가 없어 기존 pricingData 반환
- Source: 🔍 PlanCard[{{plan.id}}] 沒有 planAdjustment，返回原始 pricingData
- Context: console.log(`🔍 PlanCard[${plan.id}] 沒有 planAdjustment，返回原始 pricingData`);

### 234. src/components/Subscription/SubscriptionPlans/components/PlanCard.js:329:234

- Korean: 🔍 PlanCard[{{plan.id}}]: hasRedemptionDiscount 계산:
- Source: 🔍 PlanCard[{{plan.id}}] hasRedemptionDiscount 計算:
- Context: console.log(`🔍 PlanCard[${plan.id}] hasRedemptionDiscount 計算:`, !!(planAdjustment.discount && (planAdjustment.discount.value > 0 || planAdjustment.discount.amount > 0)));

### 235. src/components/Subscription/SubscriptionPlans/components/PlanCard.js:330:235

- Korean: 🔍 PlanCard[{{plan.id}}]: 조정된 pricing 반환:
- Source: 🔍 PlanCard[{{plan.id}}] 返回調整後的 pricing:
- Context: console.log(`🔍 PlanCard[${plan.id}] 返回調整後的 pricing:`, result);

### 236. src/components/Subscription/SubscriptionPlans/components/PlanCard.js:381:236

- Korean: 유료 플랜으로 업그레이드
- Source: 升級為付費方案
- Context: return t('subscription.subscriptionPlans.upgradeToFullPlan', '升級為付費方案');

### 237. src/components/Subscription/SubscriptionPlans/components/PlanCard.js:521:237

- Korean: 관심 종목 목록 기능
- Source: 追蹤清單功能
- Context: feature.includes('追蹤清單功能') ||
- Disposition: blocked_until_stable_feature_ids
- Review note: This string is consumed by feature.includes() as a logic token, not displayed UI. Do not replace with this Korean text until the access logic is migrated to stable feature IDs.

### 238. src/components/Subscription/SubscriptionPlans/components/PlanCard.js:522:238

- Korean: 광고 없는 이용 환경
- Source: 無廣告體驗
- Context: feature.includes('無廣告體驗') ||
- Disposition: blocked_until_stable_feature_ids
- Review note: This string is consumed by feature.includes() as a logic token, not displayed UI. Do not replace with this Korean text until the access logic is migrated to stable feature IDs.

### 239. src/components/Subscription/SubscriptionPlans/components/PlanCard.js:529:239

- Korean: 로하스 5선 차트
- Source: 樂活五線譜
- Context: feature.includes('樂活五線譜') ||
- Disposition: blocked_until_stable_feature_ids
- Review note: This string is consumed by feature.includes() as a logic token, not displayed UI. Do not replace with this Korean text until the access logic is migrated to stable feature IDs.

### 240. src/components/Subscription/SubscriptionPlans/components/PlanCard.js:530:240

- Korean: 시장 심리 분석
- Source: 市場情緒分析
- Context: feature.includes('市場情緒分析') ||
- Disposition: blocked_until_stable_feature_ids
- Review note: This string is consumed by feature.includes() as a logic token, not displayed UI. Do not replace with this Korean text until the access logic is migrated to stable feature IDs.

### 241. src/components/Subscription/SubscriptionPlans/components/PlanComparison.js:76:241

- Korean: NT${{plan.price.monthly}}/월
- Source: NT${{plan.price.monthly}}/月
- Context: : `NT$${plan.price.monthly}/月`

### 242. src/utils/announcementCooldown.js:145:242

- Korean: 공지 닫힘 ({{announcementData.dismissCount}}회)
- Source: 公告已關閉 (第{{announcementData.dismissCount}}次)
- Context: console.log(`公告已關閉 (第${announcementData.dismissCount}次)`, {

### 243. src/utils/announcementCooldown.js:159:243

- Korean: {{hours}}시간
- Source: {{hours}}小時
- Context: return `${hours}小時`;

### 244. src/utils/announcementCooldown.js:162:244

- Korean: {{days}}일
- Source: {{days}}天
- Context: return `${days}天`;

### 245. marketSentiment.recentReference

- Korean: 최근 비교 기준
- Source: 近期參考
- Context: Market sentiment gauge comparison block label.
- Disposition: revised_after_context_review
- Review note: This is the heading for a comparison strip showing previous-day, previous-week, previous-month and previous-quarter readings.

### 246. marketSentiment.historicalExtremeFearLow

- Korean: 과거 극단적 공포 저점
- Source: 過往極端恐懼低點
- Context: Historical extreme-fear low markers on the shared history chart and tooltip.

### 247. marketSentiment.fallbackIndicatorDetail

- Korean: 이 지표는 시장 심리를 살펴볼 수 있는 또 하나의 관점을 제공합니다. 중요한 것은 수치의 높고 낮음 자체가 아니라, 시장 참여자들의 낙관이나 비관이 한쪽으로 지나치게 쏠렸는지를 확인하는 것입니다.
- Source: 這個指標提供另一個觀察市場情緒的角度，重點不是單看高低，而是看它是否已經反映出市場過度一致的樂觀或悲觀。
- Context: Fallback detail summary when an indicator data record has no translation-key mapping.

### 248. marketSentiment.heroTabs.ariaLabel

- Korean: 종합 시장 심리 보기
- Source: 綜合情緒視角切換
- Context: ARIA label for the current/history tabs.

### 249. marketSentiment.heroTabs.current

- Korean: 최신 시장 심리
- Source: 最新市場情緒
- Context: Current sentiment tab label.

### 250. marketSentiment.heroTabs.history

- Korean: 과거 추이
- Source: 歷史趨勢
- Context: Historical chart tab label.

### 251. marketSentiment.mobileIndicator.close

- Korean: 지표 상세 닫기
- Source: 關閉指標詳情
- Context: ARIA label for mobile indicator detail sheet close button.

### 252. marketSentiment.usGaugeHeadline

- Korean: 현재 미국 주식시장 심리
- Source: 當前美股市場情緒
- Context: Fallback current US market gauge headline.

### 253. marketSentiment.twGaugeHeadline

- Korean: 현재 대만 주식시장 심리
- Source: 當前台股市場情緒
- Context: Current Taiwan market gauge headline.

### 254. marketSentiment.twGaugeSnapshotHeadline

- Korean: {{date}} 기준 대만 주식시장 심리
- Source: {{date}} 的台股市場情緒
- Context: Snapshot headline for the delayed/free preview; preserve {{date}} exactly.

### 255. marketSentiment.twBenchmarkAxis

- Korean: 대만 가권지수
- Source: 台股加權指數
- Context: Benchmark axis label in Taiwan sentiment chart.

### 256. marketSentiment.usTitleIndex

- Korean: 미국 주식 공포·탐욕 지수
- Source: 美股恐懼貪婪指標
- Context: Chart/page title index label.

### 257. marketSentiment.twTitleIndex

- Korean: 대만 주식 공포·탐욕 지수
- Source: 台股恐懼貪婪指標
- Context: Chart/page title index label.

### 258. marketPulse.sp500

- Korean: S&P 500
- Source: S&P 500
- Context: Market Pulse market name for sp500.

### 259. marketPulse.nasdaq100

- Korean: 나스닥 100
- Source: NASDAQ 100
- Context: Market Pulse market name for nasdaq100.

### 260. marketPulse.dow

- Korean: 다우존스 산업평균지수
- Source: 道瓊工業
- Context: Market Pulse market name for dow.

### 261. marketPulse.taiwan

- Korean: 대만 가권지수
- Source: 台灣加權
- Context: Market Pulse market name for taiwan.

### 262. marketPulse.nikkei

- Korean: 닛케이 225
- Source: 日經 225
- Context: Market Pulse market name for nikkei.

### 263. marketPulse.shanghai

- Korean: 상하이종합지수
- Source: 上證指數
- Context: Market Pulse market name for shanghai.

### 264. marketPulse.kospi

- Korean: 코스피
- Source: 韓國綜合
- Context: Market Pulse market name for kospi.

### 265. marketPulse.hangseng

- Korean: 항셍지수
- Source: 恆生指數
- Context: Market Pulse market name for hangseng.

### 266. marketPulse.ftse100

- Korean: FTSE 100
- Source: 富時 100
- Context: Market Pulse market name for ftse100.

### 267. twGaugeExplainer.title

- Korean: 대만 주식 공포·탐욕 지수란?
- Source: 關於台股恐懼貪婪指標
- Context: Hardcoded Traditional-Chinese Taiwan Fear & Greed explainer text in marketConfigs.js.

### 268. twGaugeExplainer.subtitle

- Korean: 이번 종합 점수는 {{score}}점으로, 전반적인 심리는 ‘{{sentiment}}’에 가깝습니다. 대만 주식시장의 9개 신호를 0~100점으로 종합해 전체적인 심리를 먼저 파악하고, 그 배경에 있는 변화를 살펴볼 수 있습니다.
- Source: 本次綜合分數為 {{score}}，整體偏向「{{sentiment}}」。九項台股訊號合成 0 到 100 分，讓你先看整體情緒，再找出背後的變化。
- Context: Hardcoded Traditional-Chinese Taiwan Fear & Greed explainer text in marketConfigs.js.

### 269. twGaugeExplainer.section1.title

- Korean: 1. 대만 주식시장의 다양한 심리 신호 종합
- Source: 1. 整合台股多面向情緒訊號
- Context: Hardcoded Traditional-Chinese Taiwan Fear & Greed explainer text in marketConfigs.js.

### 270. twGaugeExplainer.section1.body

- Korean: 옵션, 신용융자·대주, 외국인 선물 포지션부터 환율, 모멘텀, 시장 참여도까지 여러 측면의 데이터를 함께 살펴 대만 주식시장의 위험 선호를 파악합니다. 신호마다 서로 다른 방향을 가리킬 수 있으므로, 종합 점수로 전체적인 흐름을 먼저 파악할 수 있습니다.
- Source: 從選擇權、融資融券、外資期貨部位到匯率、動能與市場參與度，合併觀察台股的風險偏好。不同訊號可能各走各的，綜合分數讓你先掌握整體傾向。
- Context: Hardcoded Traditional-Chinese Taiwan Fear & Greed explainer text in marketConfigs.js.
- Disposition: revised_after_context_review
- Review note: 融資融券 explicitly covers both 신용융자 and 신용대주 in the Taiwan market context.

### 271. twGaugeExplainer.section2.title

- Korean: 2. 시장 심리가 극단에 이르렀는지 확인
- Source: 2. 留意情緒是否走到極端
- Context: Hardcoded Traditional-Chinese Taiwan Fear & Greed explainer text in marketConfigs.js.

### 272. twGaugeExplainer.section2.body

- Korean: 점수가 낮을수록 종합 심리가 공포 쪽에, 높을수록 탐욕 쪽에 치우쳐 있음을 뜻합니다. 수치가 극단적인 구간에 들어서면 각 지표를 열어 어떤 신호가 점수에 영향을 주었는지 확인하고, 가권지수 추이와 함께 살펴보세요.
- Source: 低分代表合成後偏向恐懼，高分代表偏向貪婪。遇到極端讀數，打開各項指標，確認哪些訊號推動分數，再對照加權指數走勢。
- Context: Hardcoded Traditional-Chinese Taiwan Fear & Greed explainer text in marketConfigs.js.

### 273. twGaugeExplainer.section3.title

- Korean: 3. 추격 매수와 투매 충동을 데이터로 점검
- Source: 3. 用數據檢查追高與殺低的衝動
- Context: Hardcoded Traditional-Chinese Taiwan Fear & Greed explainer text in marketConfigs.js.

### 274. twGaugeExplainer.section3.body

- Korean: 시장이 급락할 때 팔고 싶거나 급등할 때 뒤처질까 불안하다면, 먼저 데이터를 확인해 보세요. 심리 점수와 구성 지표, 과거 위치를 비교한 뒤 기존 투자 비중을 조정할지 판단할 수 있습니다.
- Source: 大跌時想出場、急漲時怕錯過，都可以先回到數據。比較情緒分數、指標組成與歷史位置，再決定是否調整原本的配置。
- Context: Hardcoded Traditional-Chinese Taiwan Fear & Greed explainer text in marketConfigs.js.

### 275. relativeTime.justNow

- Korean: 방금
- Source: 剛剛
- Context: Fallback relative time formatter when date-fns locale data is unavailable.

### 276. relativeTime.hoursAgo

- Korean: {{hours}}시간 전
- Source: {{hours}} 小時前
- Context: Fallback relative time formatter; preserve {{hours}}.

### 277. timeUnit.day

- Korean: 일
- Source: 天
- Context: Pluralized time unit; Korean uses the invariant unit 일.

### 278. timeUnit.month

- Korean: 개월
- Source: 個月
- Context: Pluralized time unit; Korean uses 개월.

### 279. timeUnit.year

- Korean: 년
- Source: 年
- Context: Pluralized time unit; Korean uses 년.

### 280. timeExtension.description

- Korean: {{duration}}{{unit}} 연장
- Source: 延長 {{duration}} {{unit}}
- Context: Benefit description shown for subscription extension; keep duration and localized unit.

### 281. discount.percentageDescription

- Korean: {{percentage}}% 할인
- Source: {{percentage}}% 折扣
- Context: Discount line; preserve percentage value and % sign.

### 282. discount.fixedDescription

- Korean: {{formattedAmount}} 할인
- Source: {{formattedAmount}} 折扣
- Context: Fixed-amount discount line; formattedAmount already includes currency.

### 283. benefit.discount.title

- Korean: 할인 혜택
- Source: 折扣優惠
- Context: Dynamic redemption benefit title.

### 284. benefit.extension.title

- Korean: 구독 기간 연장
- Source: 訂閱延長
- Context: Dynamic redemption benefit title.

### 285. benefit.upgrade.title

- Korean: 요금제 업그레이드
- Source: 方案升級
- Context: Dynamic redemption benefit title.

### 286. benefit.upgrade.description

- Korean: {{planName}}로 업그레이드
- Source: 升級至 {{planName}}
- Context: Dynamic plan upgrade sentence; preserve planName.
- Disposition: revised_after_context_review
- Review note: planName formatter already includes 요금제; do not duplicate it.

### 287. benefit.default.title

- Korean: 특별 혜택
- Source: 特殊優惠
- Context: Fallback benefit title when benefit type is unknown.

### 288. benefit.default.description

- Korean: 특별 프로모션 혜택이 제공됩니다
- Source: 您將獲得特殊促銷優惠
- Context: Fallback benefit description when benefit type is unknown.

### 289. benefit.default.highlight

- Korean: 프리미엄 이용 권한
- Source: 高級權限
- Context: Fallback benefit highlight; product meaning may be generic entitlement.

### 290. countdown.daysHours

- Korean: {{days}}일 {{hours}}시간 남음
- Source: 剩餘 {{days}} 天 {{hours}} 小時
- Context: Countdown with days and hours; preserve both parameters.

### 291. countdown.hoursMinutes

- Korean: {{hours}}시간 {{minutes}}분 남음
- Source: 剩餘 {{hours}} 小時 {{minutes}} 分鐘
- Context: Countdown with hours and minutes.

### 292. countdown.minutes

- Korean: {{minutes}}분 남음
- Source: 剩餘 {{minutes}} 分鐘
- Context: Countdown with minutes.

### 293. planName.free

- Korean: Free 요금제
- Source: 免費方案
- Context: Localized plan name; preserve the Free product tier name as agreed.
- Disposition: revised_after_context_review
- Review note: Preserve the product tier token Free; this same label is used by the plan-name helper.

### 294. planName.pro

- Korean: Pro 요금제
- Source: Pro 方案
- Context: Localized plan name; preserve Pro brand/tier token.

### 295. planName.premium

- Korean: 프리미엄 요금제
- Source: 高級方案
- Context: Localized plan name; confirm whether Premium is a live tier or legacy enum only.

### 296. estimatedValue.prefix

- Korean: 예상 혜택 금액: {{formattedAmount}}
- Source: 預估價值：{{formattedAmount}}
- Context: Estimated benefit amount label.
- Disposition: revised_after_context_review
- Review note: The amount is an estimated benefit amount, not an unqualified asset/value metric.
