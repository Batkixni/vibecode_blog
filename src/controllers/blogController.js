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
    <title>${post.title} - VibeCode Blog</title>
    
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
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    
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
        
        /* 修復滾動問題 */
        body {
            max-height: none !important;
            overflow-y: auto !important;
        }
        
        html, body {
            overflow-y: auto !important;
            min-height: 100%;
            height: auto !important;
        }

        .layout-container {
            min-height: 100vh;
            height: auto;
            overflow: visible;
        }

        .right-column {
            overflow-y: visible;
            max-height: none;
            height: auto;
        }

        .full-post {
            overflow: visible;
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
        
        .post-content a {
            color: #8C00FF;
            text-decoration: none;
            border-bottom: 1px solid #8C00FF;
            transition: opacity 0.3s;
        }
        
        .post-content a:hover {
            opacity: 0.8;
        }
        
        .post-content img {
            max-width: 100%;
            border-radius: 8px;
            margin: 1em 0;
            display: block;
        }
        
        .post-content ul, .post-content ol {
            margin: 0 0 1.5em 2em;
            padding: 0;
        }
        
        .post-content li {
            margin-bottom: 0.5em;
        }
        
        .post-content blockquote {
            border-left: 3px solid #8C00FF;
            margin: 1.5em 0;
            padding-left: 20px;
            color: #CCCCCC;
            font-style: italic;
        }
        
        .post-content code {
            font-family: 'Ubuntu Mono', monospace;
            background-color: #333;
            color: #f8f8f2;
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-size: 0.9em;
        }
        
        .post-content pre {
            background-color: #282a36;
            border-radius: 5px;
            padding: 1em;
            overflow-x: auto;
            margin: 1.5em 0;
        }
        
        .post-content pre code {
            background-color: transparent;
            padding: 0;
            font-size: 0.9em;
            line-height: 1.5;
        }
        
        .post-meta {
            font-size: 14px;
            color: #999;
            margin-bottom: 20px;
        }
        
        .post-tags {
            margin: 30px 0;
        }
        
        .post-tag {
            display: inline-block;
            background-color: rgba(140, 0, 255, 0.15);
            color: #c17aff;
            padding: 5px 10px;
            border-radius: 15px;
            margin-right: 10px;
            margin-bottom: 10px;
            font-size: 14px;
            transition: background-color 0.3s;
        }
        
        .post-tag:hover {
            background-color: rgba(140, 0, 255, 0.25);
        }
        
        .post-actions {
            margin-top: 40px;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .post-actions button {
            padding: 8px 15px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.3s;
        }
        
        .edit-post {
            background-color: #4361ee;
            color: white;
        }
        
        .edit-post:hover {
            background-color: #3a56d4;
        }
        
        .delete-post {
            background-color: #ef476f;
            color: white;
        }
        
        .delete-post:hover {
            background-color: #d63f63;
        }
        
        .edit-tags {
            background-color: #8C00FF;
            color: white;
        }
        
        .edit-tags:hover {
            background-color: #7500d4;
        }
        
        /* 隱藏標籤編輯器 */
        .tags-editor {
            display: none;
            margin-top: 20px;
            background-color: #2d2d2d;
            border-radius: 8px;
            padding: 15px;
        }
        
        .tags-editor input {
            width: 100%;
            padding: 10px;
            background-color: #393939;
            border: 1px solid #555;
            border-radius: 5px;
            color: #fff;
            margin-bottom: 10px;
        }
        
        .tags-editor .tags-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
        
        .tags-editor button {
            padding: 8px 15px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .tags-save {
            background-color: #8C00FF;
            color: white;
        }
        
        .tags-cancel {
            background-color: #555;
            color: white;
        }
        
        /* 收藏按鈕樣式 */
        .favorite-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background-color: transparent;
            color: #aaa;
            border: 1px solid #555;
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 14px;
        }
        
        .favorite-btn:hover {
            border-color: #8C00FF;
            color: #c17aff;
        }
        
        .favorite-btn.active {
            background-color: rgba(140, 0, 255, 0.15);
            color: #c17aff;
            border-color: #8C00FF;
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
        <div id="mobile-auth-nav">
            <!-- 這裡將由JavaScript動態填充 -->
            <a href="/login.html" class="mobile-nav-link">登入</a>
            <a href="/register.html" class="mobile-nav-link">註冊</a>
        </div>
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
                <div id="auth-nav" class="auth-nav">
                    <!-- 這裡將由JavaScript動態填充 -->
                    <a href="/login.html" class="nav-link">登入</a>
                    <a href="/register.html" class="nav-link">註冊</a>
                </div>
            </nav>
            
            <!-- 網站資訊 -->
            <div class="website-info">
                <p>使用Node.js與jQuery打造的簡易部落格系統，提供Markdown編輯功能。</p>
            </div>
            
            <!-- 版權資訊 -->
            <div class="copyright">
                <p>© 2025 Bax. All Rights Reserved.</p>
            </div>
        </div>
        
        <!-- 右側欄位 -->
        <div class="right-column">
            <!-- 完整文章 -->
            <div class="full-post">
                <h1 class="post-title">${post.title}</h1>
                <div class="post-meta">
                    <span class="post-date">最後更新於 ${formattedDate}</span>
                </div>
                <div class="post-tags" data-tags='${JSON.stringify(post.tags || [])}'>${tagsHtml}</div>
                <div class="post-content">${htmlContent}</div>
                
                <!-- 文章動作按鈕 -->
                <div class="post-actions">
                    <button class="favorite-btn" data-id="${post.id}"><i class="far fa-heart"></i> 收藏</button>
                    <button class="edit-post" style="display:none;">編輯文章</button>
                    <button class="delete-post" style="display:none;">刪除文章</button>

                </div>
                
                <!-- 標籤編輯器 -->
                <div class="tags-editor" id="tags-editor">
                    <input type="text" id="tags-input" placeholder="輸入標籤，以逗號分隔">
                    <div class="tags-actions">
                        <button class="tags-save">儲存</button>
                        <button class="tags-cancel">取消</button>
                    </div>
                </div>
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
        $(document).ready(function() {
            // 文章ID
            const postId = '${post.id}';
            
            // 高亮程式碼
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightBlock(block);
            });
            
            // 檢查用戶是否已登入
            $.ajax({
                url: '/api/auth/check',
                type: 'GET',
                success: function(data) {
                    if (data.authenticated) {
                        // 更新導航
                        updateNavForLoggedInUser(data.username);
                        
                        // 顯示編輯和刪除按鈕
                        $('.edit-post, .delete-post, .edit-tags').show();
                        
                        // 檢查是否已經收藏
                        $.ajax({
                            url: '/api/favorites/' + postId,
                            type: 'GET',
                            success: function(data) {
                                if (data.isFavorite) {
                                    $('.favorite-btn').addClass('active');
                                    $('.favorite-btn i').removeClass('far').addClass('fas');
                                }
                            }
                        });
                    } else {
                        updateNavForAnonymousUser();
                    }
                },
                error: function() {
                    updateNavForAnonymousUser();
                }
            });
            
            // 更新導航用於已登入用戶
            function updateNavForLoggedInUser(username) {
                $('#auth-nav').html(
                    '<a href="/profile.html" class="nav-link">' + username + '</a>' +
                    '<a href="#" id="logout-link" class="nav-link">登出</a>'
                );
                
                $('#mobile-auth-nav').html(
                    '<a href="/profile.html" class="mobile-nav-link">' + username + '</a>' +
                    '<a href="#" id="mobile-logout-link" class="mobile-nav-link">登出</a>'
                );
                
                // 添加登出事件
                $('#logout-link, #mobile-logout-link').click(function(e) {
                    e.preventDefault();
                    logout();
                });
            }
            
            // 更新導航用於匿名用戶
            function updateNavForAnonymousUser() {
                $('#auth-nav').html(
                    '<a href="/login.html" class="nav-link">登入</a>' +
                    '<a href="/register.html" class="nav-link">註冊</a>'
                );
                
                $('#mobile-auth-nav').html(
                    '<a href="/login.html" class="mobile-nav-link">登入</a>' +
                    '<a href="/register.html" class="mobile-nav-link">註冊</a>'
                );
            }
            
            // 登出函數
            function logout() {
                $.ajax({
                    url: '/api/auth/logout',
                    type: 'POST',
                    success: function() {
                        window.location.reload();
                    }
                });
            }
            
            // 收藏按鈕點擊
            $('.favorite-btn').click(function() {
                const $btn = $(this);
                
                // 檢查用戶是否已登入
                $.ajax({
                    url: '/api/auth/check',
                    type: 'GET',
                    success: function(data) {
                        if (!data.authenticated) {
                            // 未登入，引導至登入頁面
                            window.location.href = '/login.html';
                            return;
                        }
                        
                        // 已登入，處理收藏
                        if ($btn.hasClass('active')) {
                            // 取消收藏
                            $.ajax({
                                url: '/api/favorites/' + postId,
                                type: 'DELETE',
                                success: function() {
                                    $btn.removeClass('active');
                                    $btn.find('i').removeClass('fas').addClass('far');
                                }
                            });
                        } else {
                            // 加入收藏
                            $.ajax({
                                url: '/api/favorites',
                                type: 'POST',
                                contentType: 'application/json',
                                data: JSON.stringify({ postId }),
                                success: function() {
                                    $btn.addClass('active');
                                    $btn.find('i').removeClass('far').addClass('fas');
                                }
                            });
                        }
                    }
                });
            });
            
            // 編輯文章
            $('.edit-post').click(function() {
                window.location.href = '/editor.html?id=' + postId;
            });
            
            // 刪除文章 - 顯示確認對話框
            $('.delete-post').click(function() {
                $('#delete-dialog').show();
            });
            
            // 取消刪除
            $('#cancel-delete').click(function() {
                $('#delete-dialog').hide();
            });
            
            // 確認刪除
            $('#confirm-delete').click(function() {
                // 發送刪除請求
                $.ajax({
                    url: '/api/blogs/' + postId,
                    type: 'DELETE',
                    success: function(response) {
                        // 隱藏對話框
                        $('#delete-dialog').hide();
                        
                        // 跳轉回首頁
                        window.location.href = '/';
                    },
                    error: function(xhr, status, error) {
                        console.error('刪除文章失敗:', error);
                        alert('刪除文章失敗: ' + (xhr.responseJSON?.error || error));
                        $('#delete-dialog').hide();
                    }
                });
            });
            
            // 編輯標籤按鈕點擊事件
            $('#edit-tags-button').click(function(e) {
                e.preventDefault();
                
                // 顯示標籤編輯對話框
                $('#tag-edit-dialog')
                    .data('post-id', postId)
                    .show();
                
                // 填入當前標籤
                const tags = $('.post-tags').data('tags') || [];
                $('#edit-tags-input').val(tags.join(', '));
            });
            
            // 取消編輯標籤
            $('#cancel-edit-tags').click(function() {
                $('#tag-edit-dialog').hide();
            });
            
            // 確認更新標籤
            $('#confirm-edit-tags').click(function() {
                const tagsText = $('#edit-tags-input').val();
                
                // 處理標籤，分割、去除空白，過濾空標籤
                const tags = tagsText.split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag.length > 0);
                
                // 發送更新標籤請求
                $.ajax({
                    url: '/api/blogs/' + postId + '/tags',
                    type: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify({ tags: tags }),
                    success: function(response) {
                        // 隱藏對話框
                        $('#tag-edit-dialog').hide();
                        
                        // 重新載入頁面以更新標籤
                        window.location.reload();
                    },
                    error: function(xhr, status, error) {
                        console.error('更新標籤失敗:', error);
                        alert('更新標籤失敗: ' + (xhr.responseJSON && xhr.responseJSON.error ? xhr.responseJSON.error : error));
                        $('#tag-edit-dialog').hide();
                    }
                });
            });
            
            // 手機菜單按鈕事件處理
            $('#mobile-menu-button').click(function() {
                $('#mobile-nav').addClass('active');
            });
            
            $('#mobile-nav-close').click(function() {
                $('#mobile-nav').removeClass('active');
            });
            
            // 點擊菜單項也關閉菜單
            $('.mobile-nav-link').click(function() {
                $('#mobile-nav').removeClass('active');
            });
            
            // 點擊菜單外區域關閉菜單
            $(document).on('click touchstart', function(e) {
                var $target = $(e.target);
                if ($('#mobile-nav').hasClass('active') && 
                    !$target.closest('#mobile-nav').length && 
                    !$target.closest('#mobile-menu-button').length) {
                    $('#mobile-nav').removeClass('active');
                }
            });
        });
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
exports.updateBlogTags = async (req, res) => {
    console.log('[updateBlogTags] 開始執行標籤更新流程');
    console.log('[updateBlogTags] 收到請求參數:', { id: req.params.id, body: req.body });

    const { id } = req.params;
    const { tags } = req.body;

    // 檢查標籤是否存在
    if (tags === undefined) {
        console.error('[updateBlogTags] 錯誤: 未提供標籤數據');
        return res.status(400).json({ 
            error: '標籤數據不能為空', 
            fromTagsUpdate: true
        });
    }

    // 確保ID是有效的
    if (!id || id === 'undefined' || id === 'null') {
        console.error('[updateBlogTags] 錯誤: 無效的文章ID', id);
        return res.status(400).json({ 
            error: '無效的文章ID', 
            fromTagsUpdate: true
        });
    }

    // 確保標籤是一個數組
    const tagsArray = Array.isArray(tags) ? tags : [tags];
    console.log('[updateBlogTags] 處理後的標籤:', tagsArray);

    try {
        // 讀取所有 Markdown 檔案
        const files = fs.readdirSync(BLOG_DIR);
        const file = files.find(file => file.startsWith(id) || path.basename(file, '.md') === id);
        
        if (!file) {
            console.error(`[updateBlogTags] 錯誤: 找不到ID為 ${id} 的文章`);
            return res.status(404).json({ 
                error: `找不到ID為 ${id} 的文章`, 
                fromTagsUpdate: true
            });
        }
        
        const fileName = path.basename(file, '.md');
        
        // 使用 loadTags 和 saveTags 函數更新標籤
        const allTags = loadTags();
        allTags[fileName] = tagsArray;
        saveTags(allTags);
        
        // 重新生成靜態 HTML 文件
        const mdFilePath = path.join(BLOG_DIR, file);
        const content = fs.readFileSync(mdFilePath, 'utf8');
        const extractedTitle = extractTitleFromMarkdown(content);
        
        const post = {
            id: fileName,
            title: extractedTitle || fileName.split('#')[0].replace(/-/g, ' '),
            content: content,
            tags: tagsArray,
            modified: new Date()
        };
        
        const htmlContent = generateStaticPost(post);
        const htmlFilePath = path.join(POSTS_DIR, `${fileName}.html`);
        fs.writeFileSync(htmlFilePath, htmlContent);
        
        console.log(`[updateBlogTags] 成功更新ID為 ${id} 的文章標籤:`, tagsArray);
        res.json({ 
            message: '標籤已成功更新', 
            tags: tagsArray, 
            fromTagsUpdate: true
        });
    } catch (error) {
        console.error(`[updateBlogTags] 錯誤: 更新標籤失敗 -`, error.message);
        res.status(500).json({ 
            error: `更新標籤失敗: ${error.message}`, 
            fromTagsUpdate: true
        });
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