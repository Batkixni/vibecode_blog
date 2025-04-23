const fs = require('fs');
const path = require('path');
const showdown = require('showdown'); // 添加 showdown
const DOMPurify = require('dompurify'); // 添加 DOMPurify
const { JSDOM } = require('jsdom'); // 添加 jsdom

// 創建 DOMPurify 實例
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// 創建 Markdown 轉換器
const converter = new showdown.Converter({
    tables: true,
    simplifiedAutoLink: true,
    strikethrough: true,
    tasklists: true,
    emoji: true
});

// 部落格儲存目錄
const BLOG_DIR = path.join(__dirname, '../../blogs');
const POSTS_DIR = path.join(__dirname, '../public/posts');
const TAGS_FILE = path.join(BLOG_DIR, 'tags.json');

// 確保所有必要的目錄都存在
function ensureDirectoriesExist() {
    const directories = [BLOG_DIR, POSTS_DIR];
    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
        }
    });

    // 確保 tags.json 存在
    if (!fs.existsSync(TAGS_FILE)) {
        fs.writeFileSync(TAGS_FILE, JSON.stringify({}), 'utf8');
        console.log(`Created tags file: ${TAGS_FILE}`);
    }
}

// 在應用啟動時確保目錄存在
ensureDirectoriesExist();

// 新增：讀取標籤資料
const loadTags = () => {
    try {
        if (!fs.existsSync(TAGS_FILE)) {
            fs.writeFileSync(TAGS_FILE, JSON.stringify({}), 'utf8');
        }
        return JSON.parse(fs.readFileSync(TAGS_FILE, 'utf8'));
    } catch (error) {
        console.error('讀取標籤失敗:', error);
        return {};
    }
};

// 新增：儲存標籤資料
const saveTags = (tags) => {
    try {
        ensureDirectoriesExist(); // 確保目錄存在
        fs.writeFileSync(TAGS_FILE, JSON.stringify(tags, null, 2), 'utf8');
    } catch (error) {
        console.error('儲存標籤失敗:', error);
    }
};

// 新增：從 Markdown 內容中提取標題
function extractTitleFromMarkdown(content) {
    // 尋找第一個 # 開頭的標題
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
        return titleMatch[1].trim();
    }
    
    // 如果沒有找到 # 標題，尋找第一個非空行
    const firstLineMatch = content.match(/^(.+)$/m);
    if (firstLineMatch) {
        return firstLineMatch[1].trim();
    }
    
    // 如果都沒有找到，返回 null
    return null;
}

// 獲取所有部落格文章
exports.getAllBlogs = (req, res) => {
  try {
    const files = fs.readdirSync(BLOG_DIR);
    const blogs = [];
    const tags = loadTags();

    files.forEach(file => {
      if (path.extname(file) === '.md') {
        const filePath = path.join(BLOG_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const stats = fs.statSync(filePath);
        const id = path.basename(file, '.md');
        
        // 從 Markdown 內容中提取標題
        const title = extractTitleFromMarkdown(content) || id.split('#')[0].replace(/-/g, ' ');
        
        blogs.push({
          id: id,
          title: title, // 使用從內容中提取的標題
          content: content,
          created: stats.birthtime,
          modified: stats.mtime,
          tags: tags[id] || []
        });
      }
    });

    // 按修改時間排序（新到舊）
    blogs.sort((a, b) => new Date(b.modified) - new Date(a.modified));
    
    res.json(blogs);
  } catch (error) {
    console.error('獲取部落格文章失敗:', error);
    res.status(500).json({ error: '獲取部落格文章失敗' });
  }
};

// 生成靜態HTML文章
function generateStaticPost(post) {
    // 移除 Markdown 內容中的第一個標題（如果存在）
    const contentWithoutTitle = post.content.replace(/^#\s+[^\n]+\n+/, '');
    
    // 轉換 Markdown 為 HTML
    const htmlContent = purify.sanitize(converter.makeHtml(contentWithoutTitle));
    
    // 格式化日期
    const formattedDate = new Date(post.modified).toLocaleString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // 生成標籤 HTML
    const tagsHtml = post.tags.map(tag => 
        `<span class="post-tag">${tag}</span>`
    ).join('');
    
    return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${post.title} - Markdown部落格系統</title>
    
    <!-- Favicon -->
    <link rel="icon" href="/fav/logo.ico" type="image/x-icon">
    <link rel="shortcut icon" href="/fav/logo.ico" type="image/x-icon">
    
    <!-- 引入字體 -->
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@300;400;500&family=Abhaya+Libre&display=swap" rel="stylesheet">
    
    <!-- 引入jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    
    <!-- 引入Showdown (Markdown轉HTML) -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/showdown/2.1.0/showdown.min.js"></script>
    
    <!-- 引入DOMPurify (防XSS攻擊) -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/2.3.8/purify.min.js"></script>
    
    <!-- 引入Highlight.js (程式碼高亮) -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/styles/github-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/highlight.min.js"></script>
    
    <!-- 自定義CSS -->
    <link rel="stylesheet" href="/css/style.css">
    
    <style>
        /* 內文樣式調整 */
        .post-content {
            color: #FFFFFF;
            font-family: 'Noto Sans', sans-serif;
            font-weight: 300;
            font-size: 18px;
            line-height: 1.8;
        }
        
        /* Logo 樣式確保與其他頁面一致 */
        .website-logo {
            width: 100%;
            height: 120px;
            background-image: url('/fav/logo.jpg');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: left center;
            margin-bottom: 40px;
            max-width: 320px;
        }
        
        .left-column {
            text-align: left;
        }
        
        /* 重置動畫相關樣式 */
        .left-column, .right-column, .website-logo, .nav-link,
        .blog-post, .post-title, .post-content, .featured-post {
            opacity: 1 !important;
            animation: none !important;
            transform: none !important;
        }
        
        .post-content h1, .post-content h2, .post-content h3, 
        .post-content h4, .post-content h5, .post-content h6 {
            color: #FFFFFF;
            margin: 1.5em 0 0.8em;
            font-weight: 500;
        }
        
        .post-content h1 { font-size: 2em; }
        .post-content h2 { font-size: 1.75em; }
        .post-content h3 { font-size: 1.5em; }
        
        .post-content p {
            margin: 0 0 1.5em;
        }
        
        .post-content img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin: 1.5em 0;
        }
        
        .post-content a {
            color: #8C00FF;
            text-decoration: none;
        }
        
        .post-content a:hover {
            text-decoration: underline;
        }
        
        .post-content blockquote {
            border-left: 4px solid #8C00FF;
            padding-left: 20px;
            margin: 1.5em 0;
            font-style: italic;
        }
        
        .post-content code {
            background: #2d2d2d;
            padding: 2px 5px;
            border-radius: 3px;
            font-family: monospace;
        }
        
        .post-content pre {
            background: #2d2d2d;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            margin: 1.5em 0;
        }
        
        .post-content pre code {
            background: transparent;
            padding: 0;
            border-radius: 0;
        }
        
        .post-content ul, .post-content ol {
            margin: 0 0 1.5em 2em;
        }
        
        .post-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 1.5em 0;
        }
        
        .post-content table th,
        .post-content table td {
            padding: 8px 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .post-content table th {
            background: rgba(140, 0, 255, 0.2);
        }
        
        .hljs {
            background: #2d2d2d !important;
        }
    </style>
</head>
<body>
    <!-- 手機版菜單按鈕 -->
    <button class="mobile-menu-button" id="mobile-menu-button">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 18H21V16H3V18ZM3 13H21V11H3V13ZM3 6V8H21V6H3Z" fill="currentColor"/>
        </svg>
    </button>
    
    <!-- 手機版導航菜單 -->
    <div class="mobile-nav" id="mobile-nav">
        <button class="mobile-nav-close" id="mobile-nav-close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
            </svg>
        </button>
        <a href="/" class="mobile-nav-link">Blog</a>
        <a href="/about" class="mobile-nav-link">About</a>
        <a href="/editor.html" class="mobile-nav-link">New Post</a>
    </div>

    <div class="layout-container">
        <!-- 左側欄位 -->
        <div class="left-column">
            <!-- Logo -->
            <a href="/" class="logo-link">
                <div class="website-logo"></div>
            </a>
            
            <!-- 導航連結 -->
            <nav class="main-nav">
                <a href="/" class="nav-link">Blog</a>
                <a href="/about" class="nav-link">About</a>
                <a href="/editor.html" class="nav-link">New Post</a>
            </nav>
            
            <!-- 搜尋框 -->
            <div class="search-section">
                <div class="search-container">
                    <input type="text" id="search-input" placeholder="Search">
                    <button id="search-button">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
            </div>
            
            <!-- 網站資訊 -->
            <div class="website-info">
                <p>使用Node.js與jQuery打造的簡易部落格系統，提供Markdown編輯功能，支援程式碼高亮顯示。</p>
            </div>
            
            <!-- 版權資訊 -->
            <div class="copyright">
                <p>© 2025 All Rights Reserved.</p>
            </div>
        </div>
        
        <!-- 右側欄位 - 文章內容 -->
        <div class="right-column">
            <!-- 文章內容 -->
            <article class="blog-post full-post">
                <div class="post-header">
                    <h1 class="post-title">${post.title}</h1>
                    <div class="post-tags">${tagsHtml}</div>
                </div>
                <div class="post-content">${htmlContent}</div>
                <div class="post-meta">
                    <span class="post-date">最後更新: ${formattedDate}</span>
                    <div class="post-actions">
                        <button id="edit-tags-button" class="edit-tags" onclick="showTagEditDialog()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
                            </svg>
                            編輯標籤
                        </button>
                        <button class="edit-post" onclick="location.href='/editor.html?id=${post.id}'">編輯文章</button>
                        <button class="delete-post" onclick="confirmDelete('${post.id}')">刪除文章</button>
                    </div>
                </div>
            </article>
        </div>
    </div>
    
    <!-- 標籤編輯對話框 -->
    <div id="tag-edit-dialog" class="confirm-dialog" style="display: none;">
        <div class="dialog-content">
            <h3 class="dialog-title">編輯標籤</h3>
            <p>請輸入標籤，多個標籤請用逗號分隔</p>
            <input type="text" id="edit-tags-input" placeholder="標籤1, 標籤2, 標籤3...">
            <div class="dialog-buttons">
                <button class="cancel-button" id="cancel-edit-tags" onclick="hideTagEditDialog()">取消</button>
                <button class="confirm-button" id="confirm-edit-tags" onclick="updateTags()">更新標籤</button>
            </div>
        </div>
    </div>
    
    <!-- 確認刪除對話框 -->
    <div id="delete-dialog" class="confirm-dialog" style="display: none;">
        <div class="dialog-content">
            <h3 class="dialog-title">確認刪除</h3>
            <p>你確定要刪除這篇文章嗎？此操作無法復原。</p>
            <div class="dialog-buttons">
                <button class="cancel-button" id="cancel-delete">取消</button>
                <button class="confirm-button" id="confirm-delete">確認刪除</button>
            </div>
        </div>
    </div>
    
    <script>
        // 確保頁面正確載入
        document.addEventListener('DOMContentLoaded', function() {
            // 確保所有元素可見
            document.querySelectorAll('.left-column, .right-column, .website-logo, .nav-link, .blog-post').forEach(function(el) {
                el.style.opacity = '1';
            });
        
            // 套用程式碼高亮
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
            
            // 手機菜單按鈕事件處理
            document.getElementById('mobile-menu-button').addEventListener('click', function() {
                document.getElementById('mobile-nav').classList.add('active');
            });
            
            document.getElementById('mobile-nav-close').addEventListener('click', function() {
                document.getElementById('mobile-nav').classList.remove('active');
            });
            
            // 點擊菜單項也關閉菜單
            document.querySelectorAll('.mobile-nav-link').forEach(function(link) {
                link.addEventListener('click', function() {
                    document.getElementById('mobile-nav').classList.remove('active');
                });
            });
            
            // 設置刪除對話框
            document.getElementById('cancel-delete').addEventListener('click', function() {
                document.getElementById('delete-dialog').style.display = 'none';
            });
        });
        
        // 確認刪除
        function confirmDelete(postId) {
            const dialog = document.getElementById('delete-dialog');
            dialog.style.display = 'flex';
            
            document.getElementById('confirm-delete').onclick = async () => {
                try {
                    const response = await fetch(\`/api/blogs/\${postId}\`, {
                        method: 'DELETE'
                    });
                    
                    if (response.ok) {
                        // 重定向到首頁
                        window.location.href = '/';
                    } else {
                        throw new Error('刪除失敗');
                    }
                } catch (error) {
                    console.error('刪除文章失敗:', error);
                    alert('刪除文章失敗');
                }
            };
        }
        
        // 顯示標籤編輯對話框
        function showTagEditDialog() {
            const tagsContainer = document.querySelector('.post-tags');
            const tags = [];
            tagsContainer.querySelectorAll('.post-tag').forEach(tag => {
                tags.push(tag.textContent);
            });
            
            document.getElementById('edit-tags-input').value = tags.join(', ');
            document.getElementById('tag-edit-dialog').style.display = 'flex';
        }
        
        // 隱藏標籤編輯對話框
        function hideTagEditDialog() {
            document.getElementById('tag-edit-dialog').style.display = 'none';
        }
        
        // 更新標籤
        function updateTags() {
            const postId = window.location.pathname.split('/').pop();
            const tagsText = document.getElementById('edit-tags-input').value;
            const tags = tagsText.split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);
                
            fetch(\`/api/blogs/\${postId}/tags\`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tags: tags })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('更新標籤失敗');
                }
                return response.json();
            })
            .then(data => {
                // 更新頁面上的標籤
                const tagsHtml = tags.length > 0 
                    ? tags.map(tag => \`<span class="post-tag">\${tag}</span>\`).join('')
                    : '';
                
                document.querySelector('.post-tags').innerHTML = tagsHtml;
                
                // 隱藏對話框
                hideTagEditDialog();
                
                // 顯示成功消息
                alert('標籤更新成功！');
                
                // 如果需要刷新頁面以應用新的樣式
                // window.location.reload();
            })
            .catch(error => {
                console.error('更新標籤失敗:', error);
                alert('更新標籤失敗: ' + error.message);
                hideTagEditDialog();
            });
        }
    </script>
</body>
</html>`;
}

// 修改儲存部落格文章函數
exports.saveBlog = (req, res) => {
    try {
        const { title, content, tags = [] } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: '標題和內容不能為空' });
        }
        
        // 將標題轉換為安全的檔案名
        const safeTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        const uniqueId = Math.random().toString(36).substr(2, 6);
        const fileName = `${safeTitle}#${uniqueId}`; // 修改分隔符號為 #
        
        // 檢查內容是否已經包含標題
        const hasTitle = content.match(/^#\s+/m);
        const finalContent = hasTitle ? content : `# ${title}\n\n${content}`;
        
        // 儲存Markdown文件
        const mdFilePath = path.join(BLOG_DIR, `${fileName}.md`);
        fs.writeFileSync(mdFilePath, finalContent);
        
        // 儲存標籤
        const allTags = loadTags();
        allTags[fileName] = tags;
        saveTags(allTags);
        
        // 生成靜態HTML文件
        const post = {
            id: fileName,
            title: title,
            content: finalContent,
            tags: tags,
            modified: new Date()
        };
        
        const htmlContent = generateStaticPost(post);
        const htmlFilePath = path.join(POSTS_DIR, `${fileName}.html`);
        fs.writeFileSync(htmlFilePath, htmlContent);
        
        console.log('文章已保存:', {
            markdown: mdFilePath,
            html: htmlFilePath
        });
        
        res.json({
            success: true,
            id: fileName,
            filePath: mdFilePath,
            tags: tags
        });
    } catch (error) {
        console.error('儲存部落格文章失敗:', error);
        res.status(500).json({ error: '儲存部落格文章失敗' });
    }
};

// 獲取單一部落格文章
exports.getBlogById = (req, res) => {
  try {
    const id = req.params.id;
    const files = fs.readdirSync(BLOG_DIR);
    const tags = loadTags();
    
    // 尋找匹配的檔案
    const file = files.find(file => file.startsWith(id) || path.basename(file, '.md') === id);
    
    if (!file) {
      return res.status(404).json({ error: '找不到部落格文章' });
    }
    
    const filePath = path.join(BLOG_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const stats = fs.statSync(filePath);
    const fileId = path.basename(file, '.md');
    
    // 從文章內容中提取標題
    const extractedTitle = extractTitleFromMarkdown(content);
    
    res.json({
      id: fileId,
      title: extractedTitle || fileId.split('#')[0].replace(/-/g, ' '), // 優先使用從內容中提取的標題
      content: content,
      created: stats.birthtime,
      modified: stats.mtime,
      tags: tags[fileId] || [] // 新增：包含文章的標籤
    });
  } catch (error) {
    console.error('獲取部落格文章失敗:', error);
    res.status(500).json({ error: '獲取部落格文章失敗' });
  }
};

// 修改更新部落格文章函數
exports.updateBlog = (req, res) => {
    try {
        const id = req.params.id;
        const { title, content } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: '標題和內容不能為空' });
        }
        
        const files = fs.readdirSync(BLOG_DIR);
        const file = files.find(file => file.startsWith(id) || path.basename(file, '.md') === id);
        
        if (!file) {
            return res.status(404).json({ error: '找不到部落格文章' });
        }
        
        const mdFilePath = path.join(BLOG_DIR, file);
        const fileName = path.basename(file, '.md');
        
        // 檢查內容是否已經包含標題
        const hasTitle = content.match(/^#\s+/m);
        const finalContent = hasTitle ? content : `# ${title}\n\n${content}`;
        
        // 更新Markdown文件
        fs.writeFileSync(mdFilePath, finalContent);
        
        // 更新靜態HTML文件
        const post = {
            id: fileName,
            title: title,
            content: finalContent,
            tags: loadTags()[fileName] || [],
            modified: new Date()
        };
        
        const htmlContent = generateStaticPost(post);
        const htmlFilePath = path.join(POSTS_DIR, `${fileName}.html`);
        fs.writeFileSync(htmlFilePath, htmlContent);
        
        res.json({
            success: true,
            id: fileName,
            filePath: mdFilePath
        });
    } catch (error) {
        console.error('更新部落格文章失敗:', error);
        res.status(500).json({ error: '更新部落格文章失敗' });
    }
};

// 新增：更新文章標籤
exports.updateBlogTags = (req, res) => {
  try {
    const id = req.params.id;
    const { tags } = req.body;
    
    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: '標籤必須是陣列' });
    }
    
    // 更新標籤
    const allTags = loadTags();
    allTags[id] = tags;
    saveTags(allTags);
    
    // 找到對應的 Markdown 文件
    const files = fs.readdirSync(BLOG_DIR);
    const file = files.find(file => file.startsWith(id) || path.basename(file, '.md') === id);
    
    if (file) {
      // 讀取文章內容
      const filePath = path.join(BLOG_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const stats = fs.statSync(filePath);
      const fileName = path.basename(file, '.md');
      
      // 提取標題
      const title = extractTitleFromMarkdown(content) || fileName.split('#')[0].replace(/-/g, ' ');
      
      // 重新生成靜態HTML文件
      const post = {
        id: fileName,
        title: title,
        content: content,
        tags: tags,
        modified: new Date()
      };
      
      const htmlContent = generateStaticPost(post);
      const htmlFilePath = path.join(POSTS_DIR, `${fileName}.html`);
      fs.writeFileSync(htmlFilePath, htmlContent);
      
      console.log('已更新文章標籤和靜態HTML:', {
        id: fileName,
        tags: tags,
        html: htmlFilePath
      });
    }
    
    res.json({
      success: true,
      id: id,
      tags: tags
    });
  } catch (error) {
    console.error('更新標籤失敗:', error);
    res.status(500).json({ error: '更新標籤失敗' });
  }
};

// 新增：獲取所有使用過的標籤
exports.getAllTags = (req, res) => {
  try {
    const tags = loadTags();
    const uniqueTags = [...new Set(Object.values(tags).flat())];
    res.json(uniqueTags);
  } catch (error) {
    console.error('獲取標籤失敗:', error);
    res.status(500).json({ error: '獲取標籤失敗' });
  }
};

// 修改刪除部落格文章函數
exports.deleteBlog = (req, res) => {
    try {
        const id = req.params.id;
        const files = fs.readdirSync(BLOG_DIR);
        const file = files.find(file => file.startsWith(id) || path.basename(file, '.md') === id);
        
        if (!file) {
            return res.status(404).json({ error: '找不到部落格文章' });
        }
        
        const mdFilePath = path.join(BLOG_DIR, file);
        const htmlFilePath = path.join(POSTS_DIR, `${path.basename(file, '.md')}.html`);
        
        // 刪除Markdown文件
        fs.unlinkSync(mdFilePath);
        
        // 刪除HTML文件
        if (fs.existsSync(htmlFilePath)) {
            fs.unlinkSync(htmlFilePath);
        }
        
        // 刪除標籤
        const tags = loadTags();
        delete tags[path.basename(file, '.md')];
        saveTags(tags);
        
        res.json({
            success: true,
            id: path.basename(file, '.md')
        });
    } catch (error) {
        console.error('刪除部落格文章失敗:', error);
        res.status(500).json({ error: '刪除部落格文章失敗' });
    }
};