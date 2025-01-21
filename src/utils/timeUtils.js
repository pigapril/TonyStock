// 過濾數據的函數
export function filterDataByTimeRange(data, timeRange) {
  const endDate = new Date();
  let startDate;

  switch (timeRange) {
    case '1M':
      startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case '3M':
      startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 3);
      break;
    case '6M':
      startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 6);
      break;
    case '1Y':
      startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    case '2Y':
      startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 2);
      break;
    case '3Y':
      startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 3);
      break;
    case '5Y':
      startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 5);
      break;
    case '10Y':
      startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 10);
      break;
    case '20Y':
      startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 20);
      break;
    default:
      startDate = null;
      break;
  }

  if (startDate) {
    return data.filter((item) => item.date >= startDate && item.date <= endDate);
  } else {
    return data;
  }
} 