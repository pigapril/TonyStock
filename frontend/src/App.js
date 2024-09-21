import React, { useState } from 'react';
   import axios from 'axios';
   import { Line } from 'react-chartjs-2';
   import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

   ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

   function App() {
     const [stockCode, setStockCode] = useState('');
     const [years, setYears] = useState(3.5);
     const [chartData, setChartData] = useState(null);

     const handleSubmit = async (e) => {
       e.preventDefault();
       try {
         const response = await axios.get(`http://localhost:5000/api/stock-data?stockCode=${stockCode}&years=${years}`);
         const data = response.data;
         console.log('Response data:', data);
         setChartData({
           labels: data.dates,
           datasets: [
             {
               label: 'Price',
               data: data.prices,
               borderColor: 'blue',
               fill: false
             },
             {
               label: 'Trend Line',
               data: data.trendLine,
               borderColor: 'red',
               fill: false
             },
             {
               label: 'TL-2SD',
               data: data.tl_minus_2sd,
               borderColor: 'yellow',
               fill: false
             },
             {
               label: 'TL-SD',
               data: data.tl_minus_sd,
               borderColor: 'green',
               fill: false
             },
             {
               label: 'TL+SD',
               data: data.tl_plus_sd,
               borderColor: 'green',
               fill: false
             },
             {
               label: 'TL+2SD',
               data: data.tl_plus_2sd,
               borderColor: 'yellow',
               fill: false
             }
           ]
         });
       } catch (error) {
         console.error('Error fetching data:', error);
       }
     };

     return (
       <div className="App">
         <h1>Stock Analysis Tool</h1>
         <form onSubmit={handleSubmit}>
           <input
             type="text"
             value={stockCode}
             onChange={(e) => setStockCode(e.target.value)}
             placeholder="Enter stock code"
             required
           />
           <input
             type="number"
             value={years}
             onChange={(e) => setYears(e.target.value)}
             step="0.5"
             min="0.5"
             max="5"
             required
           />
           <button type="submit">Analyze</button>
         </form>
         {chartData && <Line 
           data={chartData} 
           options={{
             scales: {
               y: {
                 beginAtZero: false,
                 // 根据实际数据调整这些值
                 suggestedMin: Math.min(...chartData.datasets.flatMap(d => d.data)) * 0.9,
                 suggestedMax: Math.max(...chartData.datasets.flatMap(d => d.data)) * 1.1
               }
             }
           }}
         />}
       </div>
     );
   }

   export default App;