import { format } from 'date-fns';

// 圖表的 x 軸用 date-fns adapter，但 displayFormats 一度沿用 moment 的寫法。
// moment 用 [] 跳脫字面文字、date-fns 用單引號，所以 'yyyy/[Q]Q' 會被 date-fns
// 讀成「[ + 季 + ] + 季」，2025 年第四季就印成 2025/[4]4。
// Chart.js 的月刻度落在季底時會改用 quarter 的格式，所以選「中期」才看得到。
const DISPLAY_FORMATS = {
  day: 'MM/dd',
  week: 'MM/dd',
  month: 'yyyy/MM',
  quarter: "yyyy/'Q'Q",
  year: 'yyyy'
};

describe('圖表 x 軸的日期格式', () => {
  const day = new Date(2025, 10, 15);   // 2025-11-15，第四季

  it('季度刻度顯示成 2025/Q4，不是 2025/[4]4', () => {
    expect(format(day, DISPLAY_FORMATS.quarter)).toBe('2025/Q4');
  });

  it('其餘刻度格式維持原樣', () => {
    expect(format(day, DISPLAY_FORMATS.day)).toBe('11/15');
    expect(format(day, DISPLAY_FORMATS.month)).toBe('2025/11');
    expect(format(day, DISPLAY_FORMATS.year)).toBe('2025');
  });

  it('沒有任何格式字串用 moment 的方括號跳脫', () => {
    Object.values(DISPLAY_FORMATS).forEach((fmt) => {
      expect(fmt).not.toMatch(/\[|\]/);
    });
  });
});
