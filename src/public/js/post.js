$(document).ready(function() {
    // 初始化Markdown轉換器
    const converter = new showdown.Converter({
        tables: true,
        simplifiedAutoLink: true,
        strikethrough: true,
        tasklists: true,
        emoji: true
    });
    
    // 從URL獲取文章ID
    const postId = window.location.pathname.split('/').pop();
    let currentPost = null; // 儲存當前文章數據
    
    // 載入文章內容
    loadPost();
    
    // 編輯標籤按鈕點擊事件
    $(document).on('click', '#edit-tags-button', function(e) {
        e.preventDefault();
        
        // 確保已加載文章數據
        if (!currentPost) return;
        
        // 顯示標籤編輯對話框
        $('#tag-edit-dialog')
            .data('post-id', postId)
            .show();
        
        // 填入當前標籤
        $('#edit-tags-input').val(currentPost.tags.join(', '));
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
            url: `/api/blogs/${postId}/tags`,
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({ tags: tags }),
            success: function(response) {
                // 更新頁面上的標籤
                const tagsHtml = tags.length > 0 
                    ? tags.map(tag => `<span class="post-tag">${tag}</span>`).join('')
                    : '';
                
                $('.post-tags').html(tagsHtml);
                
                // 更新當前文章的標籤數據
                currentPost.tags = tags;
                
                // 隱藏對話框
                $('#tag-edit-dialog').hide();
                
                // 顯示成功消息
                alert('標籤更新成功！');
            },
            error: function(xhr, status, error) {
                console.error('更新標籤失敗:', error);
                alert('更新標籤失敗: ' + (xhr.responseJSON?.error || error));
                $('#tag-edit-dialog').hide();
            }
        });
    });
    
    // 用於確認刪除文章
    $(document).on('click', '#delete-post-button', function() {
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
    
    // 函數：載入文章
    function loadPost() {
        $.ajax({
            url: `/api/blogs/${postId}`,
            type: 'GET',
            success: function(post) {
                // 保存文章數據
                currentPost = post;
                
                // 更新頁面標題
                document.title = `${post.title} - Markdown部落格系統`;
                
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
                
                // 更新文章內容
                $('#post-container').html(`
                    <div class="post-header">
                        <h1 class="post-title">${post.title}</h1>
                        <div class="post-tags">${tagsHtml}</div>
                    </div>
                    <div class="post-content">${htmlContent}</div>
                    <div class="post-meta">
                        <span class="post-date">最後更新: ${formattedDate}</span>
                        <div class="post-actions">
                            <button id="edit-tags-button" class="edit-tags">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
                                </svg>
                                編輯標籤
                            </button>
                            <button class="edit-post" onclick="location.href='/editor.html?id=${post.id}'">編輯文章</button>
                            <button id="delete-post-button" class="delete-post">刪除文章</button>
                        </div>
                    </div>
                `);
                
                // 套用程式碼高亮
                $('pre code').each(function(i, block) {
                    hljs.highlightElement(block);
                });
            },
            error: function(xhr, status, error) {
                $('#post-container').html(`
                    <div class="error-message">
                        <h2>載入文章失敗</h2>
                        <p>${xhr.responseJSON?.error || error}</p>
                        <a href="/" class="back-link">返回首頁</a>
                    </div>
                `);
            }
        });
    }
}); 