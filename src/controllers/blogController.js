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
    // 移除 Markdown 內容中的標題
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
    
    <!-- 引入jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    
    <!-- 引入Highlight.js (程式碼高亮) -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/styles/github.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/highlight.min.js"></script>
    
    <!-- 自定義CSS -->
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
    <!-- 網站標頭 -->
    <header class="site-header">
        <h1 class="site-title">
            <a href="/" class="home-link">Markdown部落格系統</a>
        </h1>
    </header>
    
    <!-- 文章內容 -->
    <article class="blog-post full-post">
        <div class="post-header">
            <h1 class="post-title">${post.title}</h1>
            <div class="post-tags">${tagsHtml}</div>
        </div>
        <div class="post-content">${htmlContent}</div>
        <div class="post-meta">
            <span class="post-date">最後更新: ${formattedDate}</span>
        </div>
    </article>
    
    <script>
        // 套用程式碼高亮
        document.addEventListener('DOMContentLoaded', (event) => {
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
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
        
        // 在內容開頭添加標題
        const contentWithTitle = `# ${title}\n\n${content}`;
        
        // 儲存Markdown文件
        const mdFilePath = path.join(BLOG_DIR, `${fileName}.md`);
        fs.writeFileSync(mdFilePath, contentWithTitle);
        
        // 儲存標籤
        const allTags = loadTags();
        allTags[fileName] = tags;
        saveTags(allTags);
        
        // 生成靜態HTML文件
        const post = {
            id: fileName,
            title: title,
            content: contentWithTitle, // 使用包含標題的內容
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
    
    res.json({
      id: fileId,
      title: fileId.split('#')[0].replace(/-/g, ' '),
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
        
        // 在內容開頭添加標題
        const contentWithTitle = `# ${title}\n\n${content}`;
        
        // 更新Markdown文件
        fs.writeFileSync(mdFilePath, contentWithTitle);
        
        // 更新靜態HTML文件
        const post = {
            id: fileName,
            title: title,
            content: contentWithTitle,
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
    
    const allTags = loadTags();
    allTags[id] = tags;
    saveTags(allTags);
    
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