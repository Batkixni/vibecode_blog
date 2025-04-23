$(document).ready(function() {
    // 載入所有文章
    loadAllPosts();
    
    // 重新整理按鈕點擊事件
    $('#refresh-posts').click(function() {
        loadAllPosts();
    });
    
    // 編輯文章
    $(document).on('click', '.edit-post', function() {
        const postId = $(this).closest('.blog-post').attr('id');
        window.location.href = `/editor.html?id=${postId}`;
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
                
                // 重新載入精選文章
                loadFeaturedPosts();
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
                loadFeaturedPosts(); // 載入精選文章
                
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
    
    // 載入精選文章
    function loadFeaturedPosts() {
        const featuredPosts = allPosts.filter(post => 
            post.tags && post.tags.includes('highlight')
        );
        
        if (featuredPosts.length === 0) {
            $('#featured-posts-container').html('<div class="no-posts">目前沒有精選文章</div>');
        } else {
            $('#featured-posts-container').empty();
            featuredPosts.forEach(post => {
                addPostToPage(post, $('#featured-posts-container'));
            });
        }
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
                addPostToPage(post, $('#posts-container'));
            });
        }
    }
    
    // 修改 addPostToPage 函數來支持不同容器
    function addPostToPage(post, container) {
        const tagsHtml = post.tags.map(tag => 
            `<span class="post-tag">${tag}</span>`
        ).join('');
        
        // 獲取第一個引文區塊作為摘要
        let excerpt = '';
        const excerptMatch = post.content.match(/^>([^\n]+)/m);
        if (excerptMatch) {
            excerpt = `<div class="post-excerpt">${excerptMatch[1].trim()}</div>`;
        }

        // 在摘要後尋找第一張圖片
        let previewImage = '';
        const contentAfterExcerpt = post.content.substring(post.content.indexOf(excerptMatch ? excerptMatch[0] : ''));
        const imageMatch = contentAfterExcerpt.match(/!\[.*?\]\((.*?)\)/);
        if (imageMatch) {
            previewImage = `
                <div class="post-preview-image">
                    <img src="${imageMatch[1]}" alt="文章預覽圖片">
                </div>`;
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
                ${previewImage}
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
        
        container.append(postElement);
        
        postElement.find('pre code').each(function(i, block) {
            hljs.highlightElement(block);
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
