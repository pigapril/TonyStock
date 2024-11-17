export const Legal = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* 隱私權政策部分 */}
      <h1 className="text-3xl font-bold mb-6">隱私權政策與服務條款</h1>
      
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">隱私權政策</h2>
        
        <section className="mb-8">
          <h3 className="text-xl font-semibold mb-4">1. 資料收集</h3>
          <p>我們只收集必要的用戶資料：</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Google 帳號基本資料（用戶名稱）</li>
            <li>電子郵件地址</li>
            <li>個人資料照片</li>
          </ul>
        </section>

        <section className="mb-8">
          <h3 className="text-xl font-semibold mb-4">2. 資料使用目的</h3>
          <p>我們使用這些資料來：</p>
          <ul className="list-disc pl-6 mb-4">
            <li>未來提供個人化的服務：如股票代碼追蹤</li>
            <li>發送重要通知</li>
            <li>改善用戶體驗</li>
          </ul>
        </section>

        <section className="mb-8">
          <h3 className="text-xl font-semibold mb-4">3. 資料保護</h3>
          <p>我們採取以下措施保護您的資料：</p>
          <ul className="list-disc pl-6 mb-4">
            <li>使用加密技術保護資料傳輸</li>
            <li>定期進行安全性檢查</li>
            <li>嚴格控制資料存取權限</li>
          </ul>
        </section>

        <section className="mb-8">
          <h3 className="text-xl font-semibold mb-4">4. 用戶權利</h3>
          <p>您擁有以下權利：</p>
          <ul className="list-disc pl-6 mb-4">
            <li>查看您的個人資料</li>
            <li>更新或修正您的資料</li>
            <li>要求刪除您的帳號和資料</li>
            <li>隨時撤銷授權</li>
          </ul>
        </section>
      </div>

      {/* 服務條款部分 */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">服務條款</h2>

        <section className="mb-8">
          <h3 className="text-xl font-semibold mb-4">1. 服務說明</h3>
          <p>Niku-Stock 提供：</p>
          <ul className="list-disc pl-6 mb-4">
            <li>股市資訊追蹤</li>
            <li>市場分析工具</li>
          </ul>
        </section>

        <section className="mb-8">
          <h3 className="text-xl font-semibold mb-4">2. 使用規範</h3>
          <p>用戶須同意：</p>
          <ul className="list-disc pl-6 mb-4">
            <li>提供真實且準確的資訊</li>
            <li>保護帳號安全</li>
            <li>遵守相關法律規定</li>
            <li>不進行任何惡意行為</li>
          </ul>
        </section>

        <section className="mb-8">
          <h3 className="text-xl font-semibold mb-4">3. 免責聲明</h3>
          <p>本服務：</p>
          <ul className="list-disc pl-6 mb-4">
            <li>不提供投資建議</li>
            <li>不保證資訊即時性和準確性</li>
            <li>不對投資損失負責</li>
          </ul>
        </section>
      </div>

      {/* 聯絡資訊 */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">聯絡方式</h2>
        <p>如有任何問題，請聯絡：</p>
        <p>Email: pigapril@gmail.com</p>
      </div>
    </div>
  );
}; 