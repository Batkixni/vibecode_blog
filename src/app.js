const express = require('express');
const path = require('path');
const blogController = require('./controllers/blogController');
const fs = require('fs');

const app = express();

// 中間件
app.use(express.json());

// 靜態文件服務
app.use(express.static(path.join(__dirname, 'public')));
app.use('/posts', express.static(path.join(__dirname, 'public/posts')));

// API路由
app.get('/api/blogs', blogController.getAllBlogs);
app.post('/api/blogs', blogController.saveBlog);
app.get('/api/blogs/:id', blogController.getBlogById);
app.put('/api/blogs/:id', blogController.updateBlog);
app.delete('/api/blogs/:id', blogController.deleteBlog);
app.put('/api/blogs/:id/tags', blogController.updateBlogTags);
app.get('/api/tags', blogController.getAllTags);

// 編輯器頁面路由
app.get(['/editor', '/editor.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public/editor.html'));
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Public directory: ${path.join(__dirname, 'public')}`);
    console.log(`Posts directory: ${path.join(__dirname, 'public/posts')}`);
}); 