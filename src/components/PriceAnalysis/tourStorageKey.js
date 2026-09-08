// 導覽的「看過了」記號。單獨一個檔案是因為讀它的人（PriceAnalysis）跟寫它的人
// （PriceAnalysisTour）分屬不同 chunk——導覽是 lazy 載入的，不該為了讀一個字串
// 把整包拉進主 bundle。以前兩邊各寫一份字面值，漏改一邊就會變成每次進站都跳導覽。
//
// 版本尾碼是給既有使用者再看一次用的：導覽的步驟或說法改了就升一版。
// v3：期長改成一排按鈕、訊號階梯上線後，第二、三步的說法都換了。
export const TOUR_STORAGE_KEY = 'sio.priceAnalysis.tourSeen.v3';
