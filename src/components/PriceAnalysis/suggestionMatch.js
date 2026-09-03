// 使用者按 Enter 時，判斷他打的字是不是真的指向那筆被高亮的建議。
//
// 建議清單有 250ms debounce，打完整代碼（尤其是本地清單沒有的境外基金 ISIN）時，
// 畫面上高亮的往往是上一次輸入殘留的不相干標的。舊行為是「只要有高亮就攔截 Enter」，
// 使用者因此只能搶在建議出現前按 Enter，否則會分析到錯的標的。
//
// 規則：代號或名稱以使用者打的字開頭才算指向它。
//   打「台積」→「台積電」        算（保留簡稱搜尋的便利）
//   打「LU1929549753」→「台積電」不算（放行 Enter，送出原始輸入）
export const suggestionMatchesInput = (suggestion, rawInput) => {
  const input = (rawInput || '').trim().toUpperCase();
  if (!input) return false;

  const symbol = (suggestion?.symbol || '').toUpperCase();
  const name = (suggestion?.name || '').toUpperCase();

  return symbol.startsWith(input) || name.startsWith(input);
};
