$(document).ready(function() {
    // 確保所有元素顯示
    $('.left-column, .right-column, .website-logo, .nav-link, .featured-post, .blog-post, .about-section')
        .css('visibility', 'visible');
    
    // 載入所有文章
    loadAllPosts();
    
    // 檢查用戶是否已登入
    checkAuthStatus();
    
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
                loadHighlightPost();
            },
            error: function(xhr, status, error) {
                console.error('刪除文章失敗:', error);
                alert('刪除文章失敗: ' + (xhr.responseJSON?.error || error));
                $('#delete-dialog').hide();
            }
        });
    });
    
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
    
    // 收藏按鈕點擊事件
    $(document).on('click', '.favorite-btn', function() {
        const postId = $(this).data('id');
        const isFavorited = $(this).hasClass('favorited');
        
        if (isFavorited) {
            // 移除收藏
            removeFavorite(postId, $(this));
        } else {
            // 添加收藏
            addFavorite(postId, $(this));
        }
    });
    
    // 登出按鈕點擊事件
    $(document).on('click', '#logout-link, #mobile-logout-link', function(e) {
        e.preventDefault();
        logout();
    });
});

// 檢查用戶身份驗證狀態
function checkAuthStatus() {
    $.ajax({
        url: '/api/auth/check',
        type: 'GET',
        success: function(data) {
            if (data.authenticated) {
                updateNavForLoggedInUser(data.username);
            } else {
                updateNavForAnonymousUser();
            }
        },
        error: function() {
            updateNavForAnonymousUser();
        }
    });
}

// 更新已登入用戶的導航
function updateNavForLoggedInUser(username) {
    $('.auth-nav').html(`
        <a href="/favorites.html" class="nav-link">我的收藏</a>
        <a href="/editor.html" class="nav-link">新文章</a>
        <a href="#" id="logout-link" class="nav-link">登出 (${username})</a>
    `);
    
    // 同時更新手機版
    $('#mobile-nav').find('.mobile-nav-link').eq(2).remove(); // 移除登入
    $('#mobile-nav').find('.mobile-nav-link').eq(2).remove(); // 移除註冊
    $('#mobile-nav').append(`
        <a href="/favorites.html" class="mobile-nav-link">我的收藏</a>
        <a href="/editor.html" class="mobile-nav-link">新文章</a>
        <a href="#" id="mobile-logout-link" class="mobile-nav-link">登出 (${username})</a>
    `);
}

// 更新匿名用戶的導航
function updateNavForAnonymousUser() {
    $('.auth-nav').html(`
        <a href="/login.html" class="nav-link">登入</a>
        <a href="/register.html" class="nav-link">註冊</a>
    `);
    
    // 同時更新手機版
    // 確保沒有多餘的連結
    $('#mobile-nav').find('.mobile-nav-link').each(function(index) {
        if (index > 1) {
            $(this).remove();
        }
    });
    
    // 添加登入/註冊連結
    $('#mobile-nav').append(`
        <a href="/login.html" class="mobile-nav-link">登入</a>
        <a href="/register.html" class="mobile-nav-link">註冊</a>
    `);
}

// 登出函數
function logout() {
    $.ajax({
        url: '/api/auth/logout',
        type: 'POST',
        success: function() {
            // 重新載入頁面
            window.location.reload();
        }
    });
}

// 添加收藏
function addFavorite(postId, button) {
    $.ajax({
        url: '/api/favorites',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ postId }),
        success: function() {
            button.addClass('favorited');
            button.html('<i class="fas fa-heart"></i> 已收藏');
        },
        error: function(xhr) {
            // 如果未登入，跳轉到登入頁面
            if (xhr.status === 401) {
                window.location.href = '/login.html';
            } else {
                alert('加入收藏失敗: ' + (xhr.responseJSON?.message || '發生錯誤'));
            }
        }
    });
}

// 移除收藏
function removeFavorite(postId, button) {
    $.ajax({
        url: `/api/favorites/${postId}`,
        type: 'DELETE',
        success: function() {
            button.removeClass('favorited');
            button.html('<i class="far fa-heart"></i> 收藏');
        },
        error: function(xhr) {
            // 如果未登入，跳轉到登入頁面
            if (xhr.status === 401) {
                window.location.href = '/login.html';
            } else {
                alert('移除收藏失敗: ' + (xhr.responseJSON?.message || '發生錯誤'));
            }
        }
    });
}

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
            loadHighlightPost(); // 載入精選文章
        },
        error: function(xhr, status, error) {
            console.error('獲取文章列表失敗:', error);
            $('#posts-container').html(`<div class="no-posts">載入文章失敗: ${xhr.responseJSON?.error || error}</div>`);
        }
    });
}

// 載入精選文章 - 適配新設計
function loadHighlightPost() {
    const highlightPosts = allPosts.filter(post => 
        post.tags && post.tags.includes('highlight')
    );
    
    const featuredSection = $('.featured-section');
    
    if (highlightPosts.length === 0) {
        // 如果沒有精選文章，顯示預設內容
        featuredSection.html(`
            <div class="featured-post">
                <span class="highlight-label">No Highlight Post</span>
                <h2 class="featured-title">CREATE YOUR FIRST HIGHLIGHT POST</h2>
                <p class="featured-excerpt">Add the 'highlight' tag to your post to make it appear here.</p>
                <div class="read-more-btn" onclick="location.href='/editor.html'">
                    <span>Create Post</span>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z" fill="currentColor"/>
                    </svg>
                </div>
            </div>
        `);
    } else {
        // 使用最新的一篇精選文章
        const highlightPost = highlightPosts[0];
        
        // 尋找預覽圖片（如果有）
        let imageUrl = '';
        const imageMatch = highlightPost.content.match(/!\[.*?\]\((.*?)\)/);
        if (imageMatch) {
            imageUrl = imageMatch[1];
        }
        
        // 創建摘要 - 使用前150個字符，但先嘗試提取引用區塊
        let excerpt = '';
        const excerptMatch = highlightPost.content.match(/^>([^\n]+)/m);
        if (excerptMatch) {
            excerpt = excerptMatch[1].trim();
        } else {
            // 移除 Markdown 格式並裁剪為適當長度
            excerpt = highlightPost.content
                .replace(/^#\s+[^\n]+\n+/, '') // 移除標題
                .replace(/[#*_~`]/g, '') // 移除 Markdown 符號
                .replace(/!\[.*?\]\(.*?\)/g, '') // 移除圖片
                .replace(/\[.*?\]\(.*?\)/g, '$1') // 移除連結，保留文字
                .replace(/\n+/g, ' ') // 將多行合併為一行
                .trim()
                .substring(0, 150);
            
            if (highlightPost.content.length > 150) {
                excerpt += '...';
            }
        }
        
        // 應用新的精選文章設計
        featuredSection.html(`
            <div class="featured-post" ${imageUrl ? `style="background-image: linear-gradient(to bottom, rgba(29, 29, 29, 0), #8C00FF), url('${imageUrl}'); background-size: cover; background-position: center;"` : ''}>
                <span class="highlight-label">Highlight Post</span>
                <h2 class="featured-title">${highlightPost.title}</h2>
                <p class="featured-excerpt">${excerpt}</p>
                <div class="read-more-btn" onclick="location.href='/post/${encodeURIComponent(highlightPost.id)}'">
                    <span>Read More</span>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z" fill="currentColor"/>
                    </svg>
                </div>
            </div>
        `);
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
            // 創建新的文章樣式
            addPostToPage(post, $('#posts-container'));
        });
        
        // 檢查收藏狀態
        checkFavoritesStatus();
    }
}

// 檢查收藏狀態
function checkFavoritesStatus() {
    $.ajax({
        url: '/api/auth/check',
        type: 'GET',
        success: function(data) {
            if (data.authenticated) {
                // 獲取用戶收藏
                $.ajax({
                    url: '/api/favorites',
                    type: 'GET',
                    success: function(favorites) {
                        // 更新所有文章的收藏狀態
                        $('.favorite-btn').each(function() {
                            const postId = $(this).data('id');
                            if (favorites.includes(postId)) {
                                $(this).addClass('favorited');
                                $(this).html('<i class="fas fa-heart"></i> 已收藏');
                            }
                        });
                    }
                });
            }
        }
    });
}

// 修改 addPostToPage 函數來支持新設計
function addPostToPage(post, container) {
    // 構建標籤HTML
    const tagsHtml = post.tags && post.tags.length > 0 
        ? post.tags.map(tag => `<span class="post-tag">${tag}</span>`).join('')
        : '';
    
    // 查找預覽圖片（如果有）
    let imageUrl = '';
    const imageMatch = post.content.match(/!\[.*?\]\((.*?)\)/);
    if (imageMatch) {
        imageUrl = imageMatch[1];
    }
    
    // 提取摘要
    let excerpt = '';
    const excerptMatch = post.content.match(/^>([^\n]+)/m);
    if (excerptMatch) {
        excerpt = excerptMatch[1].trim();
    } else {
        // 移除 Markdown 格式並裁剪為適當長度
        excerpt = post.content
            .replace(/^#\s+[^\n]+\n+/, '') // 移除標題
            .replace(/[#*_~`]/g, '') // 移除 Markdown 符號
            .replace(/!\[.*?\]\(.*?\)/g, '') // 移除圖片
            .replace(/\[.*?\]\(.*?\)/g, '$1') // 移除連結，保留文字
            .replace(/\n+/g, ' ') // 將多行合併為一行
            .trim()
            .substring(0, 100);
        
        if (post.content.length > 100) {
            excerpt += '...';
        }
    }
    
    // 創建文章元素，已在所有視圖中啟用收藏按鈕
    const postElement = $(`
        <article class="blog-post" id="${post.id}">
            <h2 class="post-title"><a href="/post/${encodeURIComponent(post.id)}" class="post-link">${post.title}</a></h2>
            <div class="post-content">${excerpt}</div>
            <div class="post-tags" data-tags='${JSON.stringify(post.tags || [])}'>${tagsHtml}</div>
            <div class="post-actions">
                <a href="/post/${encodeURIComponent(post.id)}" class="read-more-btn">
                    <span>Read More</span>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z" fill="currentColor"/>
                    </svg>
                </a>
                <button class="favorite-btn" data-id="${post.id}"><i class="far fa-heart"></i> 收藏</button>
            </div>
        </article>
    `);
    
    // 檢查用戶是否已登入並添加編輯/刪除按鈕
    $.ajax({
        url: '/api/auth/check',
        type: 'GET',
        success: function(data) {
            if (data.authenticated) {
                // 在閱讀更多按鈕旁添加編輯和刪除按鈕
                const $actions = postElement.find('.post-actions');
                $actions.append(`
                    <button class="edit-post" data-id="${post.id}">編輯</button>
                    <button class="delete-post" data-id="${post.id}">刪除</button>
                `);
            }
        }
    });
    
    // 如果有圖片，設置背景圖片
    if (imageUrl) {
        postElement.css({
            'background-image': `linear-gradient(to bottom, rgba(29, 29, 29, 0.7), rgba(29, 29, 29, 0.7)), url('${imageUrl}')`,
            'background-size': 'cover',
            'background-position': 'center'
        });
    }
    
    container.append(postElement);
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
        
        if (searchTags && post.tags) {
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
