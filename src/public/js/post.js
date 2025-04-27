$(document).ready(function() {
    // 初始化Markdown轉換器
    const converter = new showdown.Converter({
        tables: true,
        simplifiedAutoLink: true,
        strikethrough: true,
        tasklists: true,
        emoji: true
    });
    
    // 從URL獲取文章ID - 修正ID提取方式
    const urlPath = window.location.pathname;
    const postId = urlPath.startsWith('/post/') ? urlPath.split('/post/')[1] : urlPath.split('/').pop();
    
    console.log('提取的文章ID:', postId); // 用於調試
    
    let currentPost = null; // 儲存當前文章數據
    let isAuthenticated = false; // 追蹤用戶登入狀態
    
    // 檢查用戶是否已登入
    checkAuthStatus();
    
    // 載入文章內容
    loadPost();
    
    // 編輯標籤按鈕點擊事件 - 修正使用document委派
    $(document).on('click', '#edit-tags-button', function(e) {
        e.preventDefault();
        
        // 確保已加載文章數據且用戶已登入
        if (!currentPost || !isAuthenticated) {
            alert('請先登入');
            return;
        }
        
        // 顯示標籤編輯對話框
        $('#tag-edit-dialog')
            .data('post-id', postId)
            .show();
        
        // 填入當前標籤
        $('#edit-tags-input').val(currentPost.tags.join(', '));
    });
    
    // 取消編輯標籤
    $(document).on('click', '#cancel-edit-tags', function() {
        $('#tag-edit-dialog').hide();
    });
    
    // 確認更新標籤
    $(document).on('click', '#confirm-edit-tags', function() {
        const tagsText = $('#edit-tags-input').val();
        
        // 處理標籤，分割、去除空白，過濾空標籤
        const tags = tagsText.split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
        
        console.log('要更新的標籤:', tags); // 用於調試
        console.log('文章ID:', postId); // 用於調試
        
        // 如果標籤為空，顯示提示但仍允許更新（清空標籤）
        if (tags.length === 0) {
            if (!confirm('您沒有輸入任何標籤，是否要清除所有標籤？')) {
                return;
            }
        }
        
        // 發送更新標籤請求 - 使用新路由
        $.ajax({
            // 使用全新的路由，避免與博客更新路由衝突
            url: `/api/update-tags/${encodeURIComponent(postId)}`,
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({ tags: tags }),
            success: function(response) {
                console.log('標籤更新成功:', response); // 用於調試
                
                // 確認是來自標籤更新API的響應
                if (response.fromTagsUpdate !== true) {
                    console.warn('警告：未收到標籤更新API的預期響應標識', response);
                }
                
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
                console.error('錯誤狀態碼:', xhr.status);
                console.error('請求URL:', `/api/update-tags/${encodeURIComponent(postId)}`);
                console.error('錯誤詳情:', xhr.responseJSON);
                console.error('請求數據:', JSON.stringify({ tags: tags }));
                
                let errorMessage = '更新標籤失敗';
                
                // 檢查是否是標籤更新API的錯誤響應
                if (xhr.responseJSON && xhr.responseJSON.fromTagsUpdate === true) {
                    console.log('確認是來自標籤更新API的錯誤');
                    if (xhr.responseJSON.error) {
                        errorMessage += ': ' + xhr.responseJSON.error;
                    }
                } else if (xhr.responseJSON && xhr.responseJSON.error) {
                    // 可能誤入了其他API
                    console.warn('收到非標籤更新API的錯誤響應', xhr.responseJSON);
                    errorMessage += ': ' + xhr.responseJSON.error + ' (可能路由錯誤)';
                } else if (error) {
                    errorMessage += ': ' + error;
                }
                
                alert(errorMessage);
                $('#tag-edit-dialog').hide();
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
                        
                        // 套用程式碼高亮
                        $('pre code').each(function(i, block) {
                            hljs.highlightElement(block);
                        });
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
                        
                        // 套用程式碼高亮
                        $('pre code').each(function(i, block) {
                            hljs.highlightElement(block);
                        });
                    }
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