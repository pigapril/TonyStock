// 修改：計算市場情緒的函數，返回翻譯鍵
export const getSentiment = (score) => {
  if (score === null || score === undefined) return 'sentiment.notAvailable';
  if (score <= 20) return 'sentiment.extremeFear';
  if (score <= 40) return 'sentiment.fear';
  if (score <= 60) return 'sentiment.neutral';
  if (score <= 80) return 'sentiment.greed';
  return 'sentiment.extremeGreed';
}; 