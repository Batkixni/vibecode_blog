const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const blogController = require('./controllers/blogController');
const authController = require('./controllers/authController');
const favoriteController = require('./controllers/favoriteController');
const fs = require('fs');

const app = express();

// 中間件
app.use(express.json());
app.use(cookieParser());

// API 請求日誌中間件
app.use((req, res, next) => {
    // 僅記錄 API 請求
    if (req.path.startsWith('/api/')) {
        console.log(`API 請求: ${req.method} ${req.path}`);
        console.log('請求內容:', req.body);
        
        // 捕獲和記錄響應
        const originalSend = res.send;
        res.send = function(data) {
            console.log(`API 響應: ${res.statusCode} ${req.method} ${req.path}`);
            return originalSend.apply(res, arguments);
        };
    }
    next();
});

// 靜態文件服務
app.use(express.static(path.join(__dirname, 'public')));
app.use('/posts', express.static(path.join(__dirname, 'public/posts')));

// API 路由 - 公開
app.get('/api/blogs', blogController.getAllBlogs);
app.get('/api/blogs/:id', blogController.getBlogById);
app.get('/api/tags', blogController.getAllTags);
app.get('/api/auth/check', authController.checkAuth);

// 認證路由
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.post('/api/auth/logout', authController.logout);

// 標籤更新路由 - 完全分離，避免與博客路由衝突
app.put('/api/update-tags/:id', authController.isAuthenticated, (req, res) => {
    console.log('新標籤更新路由被觸發', req.params.id);
    blogController.updateBlogTags(req, res);
});

// API 路由 - 需要認證 (特定路由先定義)
// 標籤更新路由 - 需要先於一般更新路由定義，更具體的路由優先
app.put('/api/blogs/:id/tags', authController.isAuthenticated, (req, res) => {
    console.log('舊標籤更新路由被觸發, 但不建議使用此路由');
    blogController.updateBlogTags(req, res);
});

// 一般博客操作路由
app.post('/api/blogs', authController.isAuthenticated, blogController.saveBlog);
app.put('/api/blogs/:id', authController.isAuthenticated, blogController.updateBlog);
app.delete('/api/blogs/:id', authController.isAuthenticated, blogController.deleteBlog);

// 收藏路由
app.post('/api/favorites', authController.isAuthenticated, favoriteController.addFavorite);
app.delete('/api/favorites/:postId', authController.isAuthenticated, favoriteController.removeFavorite);
app.get('/api/favorites', authController.isAuthenticated, favoriteController.getFavorites);
app.get('/api/favorites/:postId', authController.isAuthenticated, favoriteController.isFavorite);

// 編輯器頁面路由
app.get(['/editor', '/editor.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public/editor.html'));
});

// 登錄頁面路由
app.get(['/login', '/login.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public/login.html'));
});

// 註冊頁面路由
app.get(['/register', '/register.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public/register.html'));
});

// 收藏頁面路由
app.get(['/favorites', '/favorites.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public/favorites.html'));
});

// About 頁面路由
app.get(['/about', '/about.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public/about.html'));
});

// 文章詳情頁面路由
app.get('/post/:id', (req, res) => {
    const htmlPath = path.join(__dirname, 'public/posts', `${req.params.id}.html`);
    console.log('嘗試訪問文章:', htmlPath);
    
    // 檢查文章HTML文件是否存在
    if (fs.existsSync(htmlPath)) {
        console.log('文章存在，發送文件');
        res.sendFile(htmlPath);
    } else {
        console.log('文章不存在，返回404頁面');
        res.status(404).sendFile(path.join(__dirname, 'public/404.html'));
    }
});

// 處理所有其他路由，返回首頁
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 啟動服務器的函數，允許從server.js調用
const startServer = () => {
    const PORT = process.env.PORT || 3000;
    return app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Public directory: ${path.join(__dirname, 'public')}`);
        console.log(`Posts directory: ${path.join(__dirname, 'public/posts')}`);
    });
};

// 如果直接運行此文件，則啟動服務器
if (require.main === module) {
    startServer();
}

// 導出app和啟動函數
module.exports = { app, startServer }; 