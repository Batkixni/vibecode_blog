$(document).ready(function() {
    // 獲取URL參數
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    let isEditing = false;
    let originalTags = []; // 儲存原始標籤

    // 如果有文章ID，則為編輯模式
    if (postId) {
        isEditing = true;
    } else {
        // 如果是新建文章，清除所有本地儲存
        localStorage.removeItem('smde_blog-post-draft');
    }

    // 初始化SimpleMDE編輯器
    const simplemde = new SimpleMDE({
        element: document.getElementById("markdown-editor"),
        spellChecker: false,
        autosave: {
            enabled: isEditing, // 只在編輯模式下啟用自動保存
            uniqueId: postId ? `blog-post-${postId}` : "blog-post-draft",
            delay: 1000,
        },
        placeholder: "使用Markdown撰寫你的文章...",
        toolbar: [
            "bold", "italic", "heading", "|", 
            "quote", "unordered-list", "ordered-list", "|",
            "link", "image", "code", "table", "|",
            "preview", "side-by-side", "fullscreen", "|",
            "guide"
        ]
    });
    
    // 如果是編輯模式，載入文章內容
    if (isEditing) {
        loadPost(postId);
    }

    // 載入文章內容
    function loadPost(id) {
        $.ajax({
            url: `/api/blogs/${id}`,
            type: 'GET',
            success: function(post) {
                console.log('載入文章數據:', post); // 記錄接收到的數據
                
                // 設置文章標題
                if (post.title) {
                    $('#post-title').val(post.title);
                }
                
                // 設置標籤
                if (post.tags && Array.isArray(post.tags)) {
                    originalTags = post.tags; // 儲存原始標籤
                    $('#post-tags').val(post.tags.join(', '));
                }
                
                // 設置內容 - 確保內容存在
                if (post.content) {
                    simplemde.value(post.content);
                }
                
                // 更新頁面標題
                $('.editor-title').text('編輯文章');
                // 更新按鈕文字
                $('#submit-post').text('更新文章');
                
                // 更新頁面標題
                document.title = `編輯: ${post.title || '無標題'} - Markdown部落格系統`;
            },
            error: function(xhr, status, error) {
                console.error('獲取文章失敗:', error);
                alert('獲取文章失敗: ' + (xhr.responseJSON?.error || error));
            }
        });
    }
    
    // 修改發布/更新文章按鈕點擊事件
    $('#submit-post').click(function() {
        const title = $('#post-title').val().trim();
        const content = simplemde.value().trim();
        const tags = $('#post-tags').val().split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
        
        if (!title) {
            alert('請輸入文章標題');
            return;
        }
        
        if (!content) {
            alert('請輸入文章內容');
            return;
        }

        const data = {
            title: title,
            content: content,
            tags: tags
        };

        // 首先更新文章內容
        const apiCall = isEditing ? 
            $.ajax({
                url: `/api/blogs/${postId}`,
                type: 'PUT',
                contentType: 'application/json',
                data: JSON.stringify(data)
            }) :
            $.ajax({
                url: '/api/blogs',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(data)
            });

        apiCall.then(function(response) {
            // 如果是編輯模式，且標籤有變更，則額外更新標籤
            if (isEditing && JSON.stringify(originalTags) !== JSON.stringify(tags)) {
                console.log('標籤已變更，正在更新標籤...');
                
                $.ajax({
                    url: `/api/update-tags/${encodeURIComponent(postId)}`,
                    type: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify({ tags: tags }),
                    success: function(tagResponse) {
                        console.log('標籤更新成功:', tagResponse);
                        alert('文章及標籤更新成功！');
                        // 重定向到首頁
                        window.location.href = '/';
                    },
                    error: function(xhr, status, error) {
                        console.error('標籤更新失敗:', error);
                        alert('文章更新成功，但標籤更新失敗: ' + (xhr.responseJSON?.error || error));
                        // 重定向到首頁
                        window.location.href = '/';
                    }
                });
            } else {
                alert(isEditing ? '文章更新成功！' : '文章發布成功！');
                
                // 清除所有本地儲存
                if (!isEditing) {
                    localStorage.removeItem('smde_blog-post-draft');
                }
                
                // 重定向到首頁
                window.location.href = '/';
            }
        }).fail(function(xhr, status, error) {
            console.error(isEditing ? '更新文章失敗:' : '發布文章失敗:', error);
            alert((isEditing ? '更新文章失敗: ' : '發布文章失敗: ') + 
                  (xhr.responseJSON?.error || error));
        });
    });
    
    // 清除按鈕點擊事件
    $('#clear-post').click(function() {
        if (confirm('確定要清除當前編輯的內容嗎？')) {
            $('#post-title').val('');
            $('#post-tags').val('');
            simplemde.value('');
            
            // 清除本地儲存
            if (!isEditing) {
                localStorage.removeItem('smde_blog-post-draft');
            } else {
                localStorage.removeItem(`smde_blog-post-${postId}`);
            }
        }
    });
}); 