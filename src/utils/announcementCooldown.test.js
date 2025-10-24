/**
 * 公告冷卻期管理器測試
 * 用於驗證中文字符編碼和基本功能
 */

import announcementCooldownManager from './announcementCooldown';

// 測試用的公告配置
const testConfigs = [
  {
    message: "系統維護通知：今晚23:00-01:00進行維護",
    enabled: true,
    lastUpdated: "2024-01-15T10:00:00Z"
  },
  {
    message: "🎉 新功能上線！歡迎體驗我們的市場情緒分析功能",
    enabled: true,
    lastUpdated: "2024-01-15T11:00:00Z"
  },
  {
    message: "Hello World! This is an English announcement.",
    enabled: true,
    lastUpdated: "2024-01-15T12:00:00Z"
  }
];

// 測試函數
function testAnnouncementCooldown() {
  console.log('🧪 開始測試公告冷卻期管理器...');
  
  // 清除所有記錄
  announcementCooldownManager.clearAllAnnouncementData();
  
  testConfigs.forEach((config, index) => {
    console.log(`\n📝 測試公告 ${index + 1}: "${config.message.substring(0, 30)}..."`);
    
    try {
      // 測試 ID 生成
      const id = announcementCooldownManager.generateAnnouncementId(config);
      console.log(`✅ ID 生成成功: ${id}`);
      
      // 測試首次顯示
      const shouldShow1 = announcementCooldownManager.shouldShowAnnouncement(config);
      console.log(`✅ 首次顯示檢查: ${shouldShow1 ? '應該顯示' : '不應該顯示'}`);
      
      // 測試關閉記錄
      announcementCooldownManager.dismissAnnouncement(config);
      console.log(`✅ 關閉記錄成功`);
      
      // 測試冷卻期檢查
      const shouldShow2 = announcementCooldownManager.shouldShowAnnouncement(config);
      console.log(`✅ 冷卻期檢查: ${shouldShow2 ? '應該顯示' : '不應該顯示'}`);
      
      // 測試統計資訊
      const stats = announcementCooldownManager.getAnnouncementStats(config);
      console.log(`✅ 統計資訊:`, {
        dismissCount: stats.dismissCount,
        isInCooldown: stats.isInCooldown,
        nextShowTime: stats.nextShowTime ? new Date(stats.nextShowTime).toLocaleString() : null
      });
      
    } catch (error) {
      console.error(`❌ 測試失敗:`, error);
    }
  });
  
  console.log('\n🎯 測試完成！');
  
  // 顯示冷卻期設定
  console.log('\n⏰ 冷卻期設定:', announcementCooldownManager.getCooldownPeriods());
}

// 如果在瀏覽器環境中，將測試函數掛載到 window 對象
if (typeof window !== 'undefined') {
  window.testAnnouncementCooldown = testAnnouncementCooldown;
  console.log('💡 在瀏覽器控制台中執行 testAnnouncementCooldown() 來測試功能');
}

export { testAnnouncementCooldown };