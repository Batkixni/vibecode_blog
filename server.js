const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');

// 載入環境變數
dotenv.config();

// 引入路由
const blogRoutes = require('./src/routes/blogRoutes');

// 初始化Express應用
const app = express();
const PORT = process.env.PORT || 3000;

// 中間件
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 設定靜態檔案目錄
app.use(express.static(path.join(__dirname, 'src/public')));

// 路由
app.use('/api/blogs', blogRoutes);

// 首頁路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/public/index.html'));
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`伺服器運行於 http://localhost:${PORT}`);
});