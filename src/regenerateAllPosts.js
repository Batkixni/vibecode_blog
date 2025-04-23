const fs = require('fs');
const path = require('path');
const blogController = require('./controllers/blogController');

// 主函數：重新生成所有靜態HTML文章
async function regenerateAllPosts() {
    console.log('開始重新生成所有文章的HTML頁面...');
    
    try {
        // 獲取所有部落格文章
        const blogs = await getAllBlogs();
        
        if (!blogs || blogs.length === 0) {
            console.log('沒有發現文章，退出操作。');
            return;
        }
        
        console.log(`找到 ${blogs.length} 篇文章，開始處理...`);
        
        // 遍歷所有文章並重新生成HTML
        for (const blog of blogs) {
            try {
                // 使用updateBlog更新文章，這將調用generateStaticPost函數
                const updateResult = await updateBlog(blog.id, {
                    title: blog.title,
                    content: blog.content,
                    tags: blog.tags || []
                });
                
                console.log(`重新生成成功: ${blog.title} (${blog.id})`);
            } catch (error) {
                console.error(`重新生成失敗: ${blog.title} (${blog.id})`, error);
            }
        }
        
        console.log('所有文章重新生成完成！');
    } catch (error) {
        console.error('重新生成過程中發生錯誤:', error);
    }
}

// 獲取所有部落格文章
function getAllBlogs() {
    return new Promise((resolve, reject) => {
        try {
            // 使用blogController中的getAllBlogs函數
            const req = {};
            const res = {
                json: (data) => resolve(data)
            };
            
            blogController.getAllBlogs(req, res);
        } catch (error) {
            reject(error);
        }
    });
}

// 更新單篇部落格文章
function updateBlog(id, data) {
    return new Promise((resolve, reject) => {
        try {
            // 使用blogController中的updateBlog函數
            const req = {
                params: { id },
                body: data
            };
            
            const res = {
                json: (data) => resolve(data),
                status: (code) => ({ 
                    json: (data) => reject(data.error || '更新失敗') 
                })
            };
            
            blogController.updateBlog(req, res);
        } catch (error) {
            reject(error);
        }
    });
}

// 執行主函數
regenerateAllPosts().catch(console.error); 