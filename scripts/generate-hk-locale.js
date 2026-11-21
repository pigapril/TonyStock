const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src/locales/zh-TW/translation.json');
const targetPath = path.join(root, 'src/locales/zh-HK/translation.json');
const check = process.argv.includes('--check');

// zh-HK is written Traditional Chinese, so the Taiwan resource is the
// semantic source. Apply a curated Hong Kong financial/product glossary;
// article copy is separately edited for native Hong Kong phrasing.
const replacements = [
  // Terms that need phrase-level handling must come before shorter terms.
  ['CBOE 買/賣權比例', 'CBOE 認沽／認購期權比率'],
  ['NAAIM 投資經理人曝險指數', 'NAAIM 投資經理股票持倉指數'],
  ['持有空頭倉位', '持有淡倉'],
  ['空頭倉位', '淡倉'],
  ['買/賣權比例', '認沽／認購期權比率'],
  ['買/賣權', '認沽／認購期權'],
  ['NAAIM 經理人曝險指數', 'NAAIM 投資經理股票持倉指數'],
  ['NAAIM 曝險指數', 'NAAIM 投資經理股票持倉指數'],
  ['投資經理人曝險指數', '投資經理股票持倉指數'],
  ['股票市場曝險水平', '股票市場持倉比重'],
  ['股票曝險', '股票持倉比重'],
  ['下檔保護需求與上檔曝險活動', '下行保護需求與上行方向持倉活動'],
  ['數值大小表示淨曝險規模', '數值大小反映淨持倉規模'],
  ['淨曝險', '淨持倉'],
  ['曝險水平', '持倉比重'],
  ['垃圾債殖利率差', '高孳息債券信貸息差'],
  ['垃圾債利差', '高孳息債券信貸息差'],
  ['垃圾債券', '高孳息債券'],
  ['垃圾債', '高孳息債券'],
  ['高收益公司債', '高孳息企業債券'],
  ['高收益債券', '高孳息債券'],
  ['高收益債', '高孳息債'],
  ['投資級公司債', '投資級別企業債券'],
  ['選擇權調整利差', '期權調整息差'],
  ['選擇權調整信用利差', '期權調整信貸息差'],
  ['信用利差', '信貸息差'],
  ['信用評級', '信貸評級'],
  ['執行價格', '行使價'],
  ['買權', '認購期權'],
  ['賣權', '認沽期權'],
  ['選擇權', '期權'],
  ['美國主動投資經理人協會', '美國主動投資經理協會'],
  ['投資經理人', '投資經理'],
  ['基金經理人', '基金經理'],
  ['經理人', '經理'],
  ['投資人', '投資者'],
  ['我的追蹤清單', '我的自選清單'],
  ['追蹤清單', '自選清單'],
  ['股票代碼', '股份代號'],
  ['訂閱方案', '訂閱計劃'],
  ['免費方案', '免費計劃'],
  ['Pro 方案', 'Pro 計劃'],
  ['方案升級', '計劃升級'],
  ['升級方案', '升級計劃'],
  ['檔股票', '隻股票'],
  ['檔 ETF', '隻 ETF'],
  ['檔ETF', '隻 ETF'],
  ['電子郵件', '電郵'],
  ['股價淨值比', '市賬率'],
  ['本益比', '市盈率'],
  ['看多', '看好'],
  ['看空', '看淡'],
  ['部位', '持倉'],
  ['倉位', '持倉'],
  ['波動率', '波幅'],
  ['波動度', '波幅'],
  ['獲利', '盈利'],
  ['營收', '收入'],
  ['財報', '業績報告'],
  ['配息', '派息'],
  ['下單', '落盤'],
  ['台幣', '新台幣'],
  ['公債', '國債'],
  ['產業與主題', '行業與主題'],
  ['強勢分類', '強勢板塊'],
  ['分類色塊', '板塊色塊'],
  ['曝險程度', '股票持倉比重'],
  ['成分股', '成份股'],
  ['收盤價', '收市價'],
  ['開盤價', '開市價'],
  ['收盤', '收市'],
  ['開盤', '開市'],
  ['漲跌幅', '升跌幅'],
  ['漲幅', '升幅'],
  ['漲跌', '升跌'],
  ['上漲', '上升'],
  ['均線', '移動平均線'],
  ['報酬率', '回報率'],
  ['報酬', '回報'],
  ['進場', '入市'],
  ['買進', '買入'],
  ['回檔', '回調'],
  ['網路', '網絡'],
  ['佈局', '部署'],
  ['大盤指數', '大市指數'],
  ['大盤', '大市'],
  ['高檔', '高位'],
  ['低檔', '低位'],
  ['曝險', '持倉比重'],
  ['殖利率', '孳息率'],
];

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const transform = value => {
  if (Array.isArray(value)) return value.map(transform);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, transform(child)]));
  }
  if (typeof value !== 'string') return value;
  return replacements.reduce((result, [from, to]) => result.split(from).join(to), value);
};

const target = transform(source);
const leaves = value => Object.entries(value).flatMap(([key, child]) => {
  if (typeof child === 'string') return [key];
  if (child && typeof child === 'object') return leaves(child).map(path => `${key}.${path}`);
  return [];
});
const sourceKeys = leaves(source).sort();
const targetKeys = leaves(target).sort();
if (JSON.stringify(sourceKeys) !== JSON.stringify(targetKeys)) {
  throw new Error('Hong Kong resource key coverage differs from zh-TW.');
}
const placeholders = value => [...String(value).matchAll(/{{\s*([^{}]+?)\s*}}/g)].map(match => match[1]).sort();
const checkValues = (left, right, prefix = '') => {
  for (const [key, value] of Object.entries(left)) {
    const pathName = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      if (JSON.stringify(placeholders(value)) !== JSON.stringify(placeholders(right[key]))) {
        throw new Error(`Placeholder mismatch for ${pathName}`);
      }
    } else if (value && typeof value === 'object') checkValues(value, right[key], pathName);
  }
};
checkValues(source, target);

const expected = `${JSON.stringify(target)}\n`;
if (check) {
  if (!fs.existsSync(targetPath) || fs.readFileSync(targetPath, 'utf8') !== expected) {
    throw new Error('Stale Hong Kong translation resource. Run scripts/generate-locale-resources.js.');
  }
} else {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, expected);
}
console.log(`Hong Kong Traditional Chinese ${check ? 'verified' : 'generated'}: ${targetKeys.length} source leaves, placeholders matched.`);
