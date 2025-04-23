$(document).ready(function() {
    // 初始化SimpleMDE編輯器
    const simplemde = new SimpleMDE({
        element: document.getElementById("markdown-editor"),
        spellChecker: false,
        autosave: {
            enabled: true,
            uniqueId: "blog-post-draft",
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
    
    // 獲取URL參數
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    let isEditing = false;

    // 如果有文章ID，載入文章內容
    if (postId) {
        isEditing = true;
        loadPost(postId);
    }

    // 載入文章內容
    function loadPost(id) {
        $.ajax({
            url: `/api/blogs/${id}`,
            type: 'GET',
            success: function(post) {
                $('#post-title').val(post.title);
                $('#post-tags').val(post.tags.join(', '));
                simplemde.value(post.content);
                
                // 更新頁面標題
                $('.editor-title').text('編輯文章');
                // 更新按鈕文字
                $('#submit-post').text('更新文章');
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

        // 根據是否為編輯模式決定API呼叫方式
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
            alert(isEditing ? '文章更新成功！' : '文章發布成功！');
            // 重定向到首頁
            window.location.href = '/';
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
        }
    });
}); 