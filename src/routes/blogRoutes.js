const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');

// 獲取所有部落格文章
router.get('/', blogController.getAllBlogs);

// 儲存新部落格文章
router.post('/', blogController.saveBlog);

// 獲取單一部落格文章
router.get('/:id', blogController.getBlogById);

// 更新部落格文章
router.put('/:id', blogController.updateBlog);

// 刪除部落格文章
router.delete('/:id', blogController.deleteBlog);

// 注意：標籤更新路由已被移至 app.js 中的 '/api/update-tags/:id'

module.exports = router;