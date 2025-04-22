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
    
    // 初始化Markdown轉換器
    const converter = new showdown.Converter({
        tables: true,
        simplifiedAutoLink: true,
        strikethrough: true,
        tasklists: true,
        emoji: true
    });
    
    // 載入所有文章
    loadAllPosts();
    
    // 新增標籤輸入欄位到表單
    const tagInput = $('<input type="text" id="post-tags" placeholder="輸入標籤，用逗號分隔">');
    $('#post-title').after(tagInput);
    
    // 修改發布文章按鈕點擊事件
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
        
        $.ajax({
            url: '/api/blogs',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                title: title,
                content: content,
                tags: tags
            }),
            success: function(response) {
                $('#post-title').val('');
                $('#post-tags').val('');
                simplemde.value('');
                loadAllPosts();
                alert('文章發布成功！');
            },
            error: function(xhr, status, error) {
                console.error('發布文章失敗:', error);
                alert('發布文章失敗: ' + (xhr.responseJSON?.error || error));
            }
        });
    });
    
    // 清除按鈕點擊事件
    $('#clear-post').click(function() {
        if (confirm('確定要清除當前編輯的內容嗎？')) {
            $('#post-title').val('');
            simplemde.value('');
        }
    });
    
    // 重新整理按鈕點擊事件
    $('#refresh-posts').click(function() {
        loadAllPosts();
    });
    
    // 編輯文章
    $(document).on('click', '.edit-post', function() {
        const postId = $(this).closest('.blog-post').attr('id');
        
        // 獲取文章詳情
        $.ajax({
            url: `/api/blogs/${postId}`,
            type: 'GET',
            success: function(post) {
                // 填充編輯器
                $('#post-title').val(post.title);
                simplemde.value(post.content);
                
                // 滾動到編輯器
                $('html, body').animate({
                    scrollTop: $('.editor-section').offset().top - 20
                }, 500);
                
                // 刪除原文章
                deletePost(postId);
            },
            error: function(xhr, status, error) {
                console.error('獲取文章失敗:', error);
                alert('獲取文章失敗: ' + (xhr.responseJSON?.error || error));
            }
        });
    });
    
    // 刪除文章 - 顯示確認對話框
    $(document).on('click', '.delete-post', function() {
        const postId = $(this).closest('.blog-post').attr('id');
        $('#delete-dialog').data('post-id', postId).show();
    });
    
    // 取消刪除
    $('#cancel-delete').click(function() {
        $('#delete-dialog').hide();
    });
    
    // 確認刪除
    $('#confirm-delete').click(function() {
        const postId = $('#delete-dialog').data('post-id');
        
        // 發送刪除請求
        $.ajax({
            url: `/api/blogs/${postId}`,
            type: 'DELETE',
            success: function(response) {
                // 從頁面移除文章
                $(`#${postId}`).fadeOut(300, function() {
                    $(this).remove();
                    
                    // 如果沒有文章了，顯示"無文章"提示
                    if ($('.blog-post').length === 0) {
                        $('#posts-container').html('<div class="no-posts">目前尚無文章，開始撰寫你的第一篇文章吧！</div>');
                    }
                });
                
                // 隱藏對話框
                $('#delete-dialog').hide();
            },
            error: function(xhr, status, error) {
                console.error('刪除文章失敗:', error);
                alert('刪除文章失敗: ' + (xhr.responseJSON?.error || error));
                $('#delete-dialog').hide();
            }
        });
    });
    
    // 載入所有文章
    let allPosts = []; // 儲存所有文章的陣列
    let isSearchActive = false; // 追蹤搜尋狀態
    
    // 修改 loadAllPosts 函數來儲存所有文章
    function loadAllPosts() {
        $.ajax({
            url: '/api/blogs',
            type: 'GET',
            success: function(posts) {
                allPosts = posts; // 儲存所有文章
                displayPosts(posts); // 顯示文章
                
                // 重置搜尋狀態
                isSearchActive = false;
                $('#clear-search').hide();
                $('#search-input').val('');
            },
            error: function(xhr, status, error) {
                console.error('獲取文章列表失敗:', error);
                $('#posts-container').html(`<div class="no-posts">載入文章失敗: ${xhr.responseJSON?.error || error}</div>`);
            }
        });
    }
    
    // 新增顯示文章的函數
    function displayPosts(posts) {
        $('#posts-container').empty();
        
        if (posts.length === 0) {
            if (isSearchActive) {
                $('#posts-container').html('<div class="no-posts">沒有找到符合的文章</div>');
            } else {
                $('#posts-container').html('<div class="no-posts">目前尚無文章，開始撰寫你的第一篇文章吧！</div>');
            }
        } else {
            posts.forEach(function(post) {
                addPostToPage(post);
            });
        }
    }
    
    // 修改 addPostToPage 函數來顯示文章摘要
    function addPostToPage(post) {
        const tagsHtml = post.tags.map(tag => 
            `<span class="post-tag">${tag}</span>`
        ).join('');
        
        // 獲取第一個引文區塊作為摘要
        let excerpt = '';
        const match = post.content.match(/^>([^\n]+)/m);
        if (match) {
            excerpt = `<div class="post-excerpt">${match[1].trim()}</div>`;
        }
        
        const formattedDate = new Date(post.modified).toLocaleString('zh-TW', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const postElement = $(`
            <article class="blog-post" id="${post.id}">
                <div class="post-header">
                    <h2 class="post-title">
                        <a href="/post/${encodeURIComponent(post.id)}" class="post-link">${post.title}</a>
                    </h2>
                    <div class="post-tags">${tagsHtml}</div>
                </div>
                ${excerpt}
                <div class="post-meta">
                    <span class="post-date">最後更新: ${formattedDate}</span>
                    <div class="post-actions">
                        <button class="edit-post">編輯</button>
                        <button class="delete-post">刪除</button>
                        <a href="/post/${encodeURIComponent(post.id)}" class="read-more">閱讀全文</a>
                    </div>
                </div>
            </article>
        `);
        
        $('#posts-container').append(postElement);
        
        postElement.find('pre code').each(function(i, block) {
            hljs.highlightElement(block);
        });
    }
    
    // 刪除文章
    function deletePost(postId) {
        $.ajax({
            url: `/api/blogs/${postId}`,
            type: 'DELETE',
            success: function(response) {
                // 從頁面移除文章
                $(`#${postId}`).remove();
                
                // 如果沒有文章了，顯示"無文章"提示
                if ($('.blog-post').length === 0) {
                    $('#posts-container').html('<div class="no-posts">目前尚無文章，開始撰寫你的第一篇文章吧！</div>');
                }
            },
            error: function(xhr, status, error) {
                console.error('刪除文章失敗:', error);
            }
        });
    }
    
    // 搜尋文章
    function searchPosts() {
        const searchText = $('#search-input').val().toLowerCase();
        const searchTitle = $('#search-title').is(':checked');
        const searchContent = $('#search-content').is(':checked');
        const searchTags = $('#search-tags').is(':checked');
        
        if (!searchText) {
            clearSearch();
            return;
        }
        
        isSearchActive = true;
        $('#clear-search').show();
        
        const filteredPosts = allPosts.filter(post => {
            let match = false;
            
            if (searchTitle) {
                match = match || post.title.toLowerCase().includes(searchText);
            }
            
            if (searchContent) {
                match = match || post.content.toLowerCase().includes(searchText);
            }
            
            if (searchTags) {
                match = match || post.tags.some(tag => 
                    tag.toLowerCase().includes(searchText)
                );
            }
            
            return match;
        });
        
        displayPosts(filteredPosts);
    }
    
    // 清除搜尋
    function clearSearch() {
        $('#search-input').val('');
        isSearchActive = false;
        $('#clear-search').hide();
        displayPosts(allPosts);
    }
    
    // 搜尋按鈕點擊事件
    $('#search-button').click(searchPosts);
    
    // 取消搜尋按鈕點擊事件
    $('#clear-search').click(clearSearch);
    
    // 搜尋框輸入事件（即時搜尋）
    $('#search-input').on('input', function() {
        const searchText = $(this).val();
        if (searchText.length > 0) {
            searchPosts();
        } else {
            clearSearch();
        }
    });
    
    // 搜尋選項變更事件
    $('.search-option input').change(function() {
        if ($('#search-input').val().length > 0) {
            searchPosts();
        }
    });
});
