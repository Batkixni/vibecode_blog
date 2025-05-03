$(document).ready(function() {
    console.log('Post page loaded');
    
    // 全局變數，用於儲存認證狀態和當前文章
    let isAuthenticated = false;
    let currentPost = null;
    
    // 從 URL 中提取 postId (支援兩種格式：路徑 /post/{id} 或查詢參數 ?id={id})
    let postId;
    
    // 檢查是否是路徑格式 /post/{id}
    const pathParts = window.location.pathname.split('/');
    if (pathParts.length > 2 && pathParts[1] === 'post') {
        postId = decodeURIComponent(pathParts[2]);
        console.log('從路徑中提取到 postId:', postId);
    } 
    // 如果不是路徑格式，嘗試從查詢參數中獲取
    else {
        const urlParams = new URLSearchParams(window.location.search);
        postId = urlParams.get('id');
        console.log('從查詢參數中提取到 postId:', postId);
    }
    
    // 如果無法獲取 postId，顯示錯誤訊息
    if (!postId) {
        console.error('無法從 URL 中提取 postId');
        $('#post-container').html(`
            <div class="error-message">
                <h2>無法載入文章</h2>
                <p>找不到文章 ID，請確認 URL 是否正確。</p>
                <a href="/" class="back-button">返回首頁</a>
            </div>
        `);
    } else {
        checkAuthStatus();
        loadPost();
    }
    
    // 處理標籤編輯按鈕點擊事件
    $(document).on('click', '#edit-tags-button', function() {
        // 獲取當前標籤並填充到輸入框
        let currentTags = [];
        $('.post-tag').each(function() {
            currentTags.push($(this).text());
        });
        
        // 填充標籤到輸入框
        $('#edit-tags-input').val(currentTags.join(', '));
        
        // 顯示對話框
        $('#tag-edit-dialog').show();
    });
    
    // 處理取消編輯標籤按鈕
    $(document).on('click', '#cancel-edit-tags', function() {
        $('#tag-edit-dialog').hide();
    });
    
    // 處理確認編輯標籤按鈕
    $(document).on('click', '#confirm-edit-tags', function() {
        const tagsInput = $('#edit-tags-input').val();
        
        // 分割輸入的標籤，移除空白並過濾空值
        const tags = tagsInput.split(',')
            .map(tag => tag.trim())
            .filter(tag => tag !== '');
        
        // 發送請求更新標籤
        $.ajax({
            url: `/api/blogs/${postId}/tags`,
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({ tags: tags }),
            success: function(response) {
                console.log('標籤更新成功:', response);
                $('#tag-edit-dialog').hide();
                
                // 刷新頁面以顯示更新後的標籤
                window.location.reload();
            },
            error: function(xhr, status, error) {
                console.error('標籤更新失敗:', error);
                alert('更新標籤失敗: ' + (xhr.responseJSON?.error || error));
            }
        });
    });
    
    // 用於確認刪除文章
    $(document).on('click', '#delete-post-button', function() {
        if (!isAuthenticated) {
            alert('請先登入');
            return;
        }
        $('#delete-dialog').show();
    });
    
    // 取消刪除
    $(document).on('click', '#cancel-delete', function() {
        $('#delete-dialog').hide();
    });
    
    // 確認刪除
    $(document).on('click', '#confirm-delete', function() {
        // 發送刪除請求
        $.ajax({
            url: `/api/blogs/${postId}`,
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
    
    // 檢查認證狀態
    function checkAuthStatus() {
        $.ajax({
            url: '/api/auth/check',
            type: 'GET',
            success: function(data) {
                isAuthenticated = data.authenticated;
            },
            error: function() {
                isAuthenticated = false;
            }
        });
    }
    
    // 函數：載入文章
    function loadPost() {
        console.log('Loading post with ID:', postId);
        $.ajax({
            url: `/api/blogs/${postId}`,
            type: 'GET',
            success: function(post) {
                // 保存文章數據
                currentPost = post;
                
                // 更新頁面標題
                document.title = `${post.title} - VibeCode Blog`;
                
                // 生成標籤HTML
                const tagsHtml = post.tags.map(tag => 
                    `<span class="post-tag">${tag}</span>`
                ).join('');
                
                // 轉換Markdown為HTML前，先移除第一個標題
                const contentWithoutTitle = post.content.replace(/^#\s+[^\n]+(\n\s*)+/, '');
                
                // 轉換Markdown為HTML
                const htmlContent = DOMPurify.sanitize(converter.makeHtml(contentWithoutTitle));
                
                // 格式化日期
                const formattedDate = new Date(post.modified).toLocaleString('zh-TW', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                // 更新文章內容，根據登入狀態決定是否顯示編輯按鈕
                $.ajax({
                    url: '/api/auth/check',
                    type: 'GET',
                    success: function(authData) {
                        const actionsHtml = authData.authenticated ? `
                            <div class="post-actions">
                                <button class="edit-post" onclick="location.href='/editor.html?id=${post.id}'">編輯文章</button>
                                <button id="delete-post-button" class="delete-post">刪除文章</button>
                                <button id="edit-tags-button" class="edit-tags">編輯標籤</button>
                            </div>
                        ` : '';
                        
                        $('#post-container').html(`
                            <div class="post-header">
                                <h1 class="post-title">${post.title}</h1>
                                <div class="post-tags">${tagsHtml}</div>
                            </div>
                            <div class="post-content">${htmlContent}</div>
                            <div class="post-meta">
                                <span class="post-date">最後更新: ${formattedDate}</span>
                                ${actionsHtml}
                            </div>
                        `);
                        
                        // 在文章容器之後添加獨立的留言區塊
                        $('.right-column').append(`
                            <!-- 留言區塊 -->
                            <div class="comments-container">
                                <h3 class="comments-title">留言區</h3>
                                <div class="utterances-container">
                                    <!-- Utterances will be inserted here by script -->
                                </div>
                            </div>
                            
                            <!-- 標籤編輯對話框 -->
                            <div id="tag-edit-dialog" class="confirm-dialog" style="display: none;">
                                <div class="dialog-content">
                                    <h3 class="dialog-title">編輯標籤</h3>
                                    <p>請輸入標籤，使用逗號分隔多個標籤</p>
                                    <input type="text" id="edit-tags-input" class="tags-input" placeholder="標籤1, 標籤2, 標籤3">
                                    <div class="dialog-buttons">
                                        <button class="cancel-button" id="cancel-edit-tags">取消</button>
                                        <button class="confirm-button" id="confirm-edit-tags">確認</button>
                                    </div>
                                </div>
                            </div>
                        `);
                        
                        // 套用程式碼高亮
                        $('pre code').each(function(i, block) {
                            hljs.highlightElement(block);
                        });
                        
                        // 初始化Utterances
                        initUtterances();
                    },
                    error: function() {
                        // 未登入的情況
                        $('#post-container').html(`
                            <div class="post-header">
                                <h1 class="post-title">${post.title}</h1>
                                <div class="post-tags">${tagsHtml}</div>
                            </div>
                            <div class="post-content">${htmlContent}</div>
                            <div class="post-meta">
                                <span class="post-date">最後更新: ${formattedDate}</span>
                            </div>
                        `);
                        
                        // 在文章容器之後添加獨立的留言區塊
                        $('.right-column').append(`
                            <!-- 留言區塊 -->
                            <div class="comments-container">
                                <h3 class="comments-title">留言區</h3>
                                <div class="utterances-container">
                                    <!-- Utterances will be inserted here by script -->
                                </div>
                            </div>
                        `);
                        
                        // 套用程式碼高亮
                        $('pre code').each(function(i, block) {
                            hljs.highlightElement(block);
                        });
                        
                        // 初始化Utterances
                        initUtterances();
                    }
                });
            },
            error: function(xhr, status, error) {
                $('#post-container').html(`
                    <div class="error-message">
                        <h2>找不到文章</h2>
                        <p>很抱歉，找不到指定的文章或發生錯誤。</p>
                        <a href="/" class="back-button">返回首頁</a>
                    </div>
                `);
            }
        });
    }
    
    // 初始化Utterances留言系統
    function initUtterances() {
        // 選擇留言容器
        const commentsContainer = document.querySelector('.utterances-container');
        if (!commentsContainer) return;
        
        // 清空容器
        commentsContainer.innerHTML = '';
        
        // 創建utterances script
        const script = document.createElement('script');
        script.src = 'https://utteranc.es/client.js';
        script.setAttribute('repo', 'YourGitHubUsername/vibecode-blog-comments'); // 請替換成你的GitHub用戶名/倉庫名
        script.setAttribute('issue-term', 'pathname');
        script.setAttribute('theme', 'github-dark');
        script.setAttribute('crossorigin', 'anonymous');
        script.async = true;
        
        // 添加到留言容器
        commentsContainer.appendChild(script);
    }
    
    // 設置留言顯示區
    function setupCommentsDisplay() {
        // 確保Utterances已載入
        if (!window.Utterances) return;
        
        // 等待主留言區初始化完成
        setTimeout(() => {
            // 創建額外的留言顯示元素
            const commentsDisplayDiv = document.getElementById('cusdis_comments_display');
            if (!commentsDisplayDiv) return;
            
            // 取得主留言區的元素和設定
            const mainThread = document.getElementById('cusdis_thread');
            if (!mainThread) return;
            
            // 複製主留言區的資料屬性，但設定為只顯示留言模式
            const commentsOnlyDiv = document.createElement('div');
            commentsOnlyDiv.setAttribute('data-host', mainThread.getAttribute('data-host'));
            commentsOnlyDiv.setAttribute('data-app-id', mainThread.getAttribute('data-app-id'));
            commentsOnlyDiv.setAttribute('data-page-id', mainThread.getAttribute('data-page-id'));
            commentsOnlyDiv.setAttribute('data-page-url', mainThread.getAttribute('data-page-url'));
            commentsOnlyDiv.setAttribute('data-page-title', mainThread.getAttribute('data-page-title'));
            commentsOnlyDiv.setAttribute('data-comments-only', 'true');
            
            // 清空現有內容並添加新元素
            commentsDisplayDiv.innerHTML = '';
            commentsDisplayDiv.appendChild(commentsOnlyDiv);
            
            // 手動初始化留言顯示元素
            if (window.Utterances && window.Utterances.renderTo) {
                window.Utterances.renderTo(commentsOnlyDiv);
            }
            
            // 監聽留言變化，以便在提交新留言後刷新顯示區
            if (window.MutationObserver) {
                const targetNode = document.getElementById('cusdis_thread');
                const observer = new MutationObserver((mutations) => {
                    // 延遲後刷新留言顯示區
                    setTimeout(() => {
                        // 重新渲染留言顯示區
                        commentsDisplayDiv.innerHTML = '';
                        const refreshDiv = commentsOnlyDiv.cloneNode(true);
                        commentsDisplayDiv.appendChild(refreshDiv);
                        if (window.Utterances && window.Utterances.renderTo) {
                            window.Utterances.renderTo(refreshDiv);
                        }
                    }, 2000);
                });
                
                observer.observe(targetNode, {
                    childList: true, 
                    subtree: true
                });
            }
            
            // 定時刷新留言區，確保顯示最新留言
            setInterval(() => {
                if (commentsDisplayDiv && window.Utterances && window.Utterances.renderTo) {
                    commentsDisplayDiv.innerHTML = '';
                    const refreshDiv = commentsOnlyDiv.cloneNode(true);
                    commentsDisplayDiv.appendChild(refreshDiv);
                    window.Utterances.renderTo(refreshDiv);
                }
            }, 15000); // 每15秒刷新一次
            
        }, 1500); // 等待主留言區載入完成
    }
}); 