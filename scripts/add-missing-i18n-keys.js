#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EN = path.join(ROOT, 'src/locales/en/translation.json');
const ZH = path.join(ROOT, 'src/locales/zh-TW/translation.json');

const FIXES = {
  en: {
    'common.errorLoading': 'Failed to load',
    'common.retry': 'Retry',
    'common.retrying': 'Retrying…',
    'common.retryIn': 'Retry in {{seconds}}s',
    'common.technicalDetails': 'Technical details',
    'common.errorCode': 'Error code',
    'common.timestamp': 'Timestamp',
    'common.context': 'Context',
    'common.originalMessage': 'Original message',
    'common.errorPrefix': 'Error:',
    'common.unknownError': 'Unknown error',
    'payment.loading.pricingData': 'Loading pricing…',
    'payment.error.pricingLoadFailed': 'Failed to load pricing',
    'payment.error.retry': 'Retry',
    'payment.warning.usingFallbackPricing': 'Showing fallback pricing — please refresh for latest',
    'payment.history.status.expired': 'Expired',
    'subscription.subscriptionPlans.loadError': 'Failed to load plans',
    'subscription.cancelError': 'Failed to cancel subscription',
    'subscription.unlimited': 'Unlimited',
    'redemption.actions.upgrade_to_plan': 'Upgrade to {{plan}}',
    'redemption.actions.upgrade_plan': 'Upgrade plan',
    'redemption.actions.view_history': 'View history',
    'redemption.actions.retry_input': 'Try another code',
    'redemption.actions.view_alternatives': 'See other options',
    'redemption.errors.plan_not_eligible': "This code isn't eligible for your current plan",
    'watchlist.categoryManager.title': 'Manage categories',
    'watchlist.categoryManager.createCategory': 'Create category',
    'watchlist.categoryManager.editCategory': 'Edit category',
    'watchlist.categoryManager.deleteCategory': 'Delete category',
    'watchlist.categoryManager.dragToReorder': 'Drag to reorder',
    'watchlist.stockCard.header.jpFlagAlt': 'Japan market flag',
    'watchlist.stockCard.header.cnFlagAlt': 'China market flag',
    'watchlist.stockCard.header.krFlagAlt': 'Korea market flag',
  },
  'zh-TW': {
    'common.errorLoading': '載入失敗',
    'common.retry': '重試',
    'common.retrying': '重試中…',
    'common.retryIn': '{{seconds}} 秒後重試',
    'common.technicalDetails': '技術細節',
    'common.errorCode': '錯誤代碼',
    'common.timestamp': '時間',
    'common.context': '內容',
    'common.originalMessage': '原始訊息',
    'common.errorPrefix': '錯誤:',
    'common.unknownError': '未知錯誤',
    'payment.loading.pricingData': '載入價格資訊…',
    'payment.error.pricingLoadFailed': '價格資訊載入失敗',
    'payment.error.retry': '重試',
    'payment.warning.usingFallbackPricing': '顯示備用價格,請重新整理以取得最新資訊',
    'payment.history.status.expired': '已過期',
    'subscription.subscriptionPlans.loadError': '方案載入失敗',
    'subscription.cancelError': '取消訂閱失敗',
    'subscription.unlimited': '無上限',
    'redemption.actions.upgrade_to_plan': '升級至 {{plan}}',
    'redemption.actions.upgrade_plan': '升級方案',
    'redemption.actions.view_history': '查看紀錄',
    'redemption.actions.retry_input': '重新輸入',
    'redemption.actions.view_alternatives': '查看其他方案',
    'redemption.errors.plan_not_eligible': '此兌換碼不適用於您目前的方案',
    'watchlist.categoryManager.title': '管理分類',
    'watchlist.categoryManager.createCategory': '新增分類',
    'watchlist.categoryManager.editCategory': '編輯分類',
    'watchlist.categoryManager.deleteCategory': '刪除分類',
    'watchlist.categoryManager.dragToReorder': '拖曳以重新排序',
    'watchlist.stockCard.header.jpFlagAlt': '日本國旗',
    'watchlist.stockCard.header.cnFlagAlt': '中國國旗',
    'watchlist.stockCard.header.krFlagAlt': '韓國國旗',
  },
};

function setKey(obj, parts, value) {
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] == null || typeof cur[p] !== 'object' || Array.isArray(cur[p])) {
      cur[p] = {};
    }
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function hasKey(obj, parts) {
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return false;
    if (!(p in cur)) return false;
    cur = cur[p];
  }
  return true;
}

for (const [lang, pairs] of Object.entries(FIXES)) {
  const file = lang === 'en' ? EN : ZH;
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  let added = 0;
  for (const [key, value] of Object.entries(pairs)) {
    const parts = key.split('.');
    if (hasKey(json, parts)) {
      console.log(`[${lang}] SKIP ${key} (already exists)`);
      continue;
    }
    setKey(json, parts, value);
    added++;
    console.log(`[${lang}] ADD  ${key} = ${JSON.stringify(value)}`);
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  console.log(`[${lang}] wrote ${added} new keys to ${path.relative(ROOT, file)}`);
}
