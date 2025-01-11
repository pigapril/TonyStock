// 新增：計算市場情緒的函數
export const getSentiment = (score) => {
  if (score <= 20) return '極度恐懼';
  if (score <= 40) return '恐懼';
  if (score <= 60) return '中性';
  if (score <= 80) return '貪婪';
  return '極度貪婪';
}; 