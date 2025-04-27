const userModel = require('../models/userModel');

// Add favorite
exports.addFavorite = (req, res) => {
    try {
        const { postId } = req.body;
        const username = req.username; // Added by auth middleware
        
        // Validate inputs
        if (!postId) {
            return res.status(400).json({ success: false, message: '文章ID不能為空' });
        }
        
        // Add favorite
        const result = userModel.addFavorite(username, postId);
        
        // Return result
        res.json(result);
    } catch (error) {
        console.error('加入收藏失敗:', error);
        res.status(500).json({ success: false, message: '加入收藏失敗' });
    }
};

// Remove favorite
exports.removeFavorite = (req, res) => {
    try {
        const { postId } = req.params;
        const username = req.username; // Added by auth middleware
        
        // Remove favorite
        const result = userModel.removeFavorite(username, postId);
        
        // Return result
        res.json(result);
    } catch (error) {
        console.error('移除收藏失敗:', error);
        res.status(500).json({ success: false, message: '移除收藏失敗' });
    }
};

// Get favorites
exports.getFavorites = (req, res) => {
    try {
        const username = req.username; // Added by auth middleware
        
        // Get favorites
        const favorites = userModel.getFavorites(username);
        
        // Return favorites
        res.json(favorites);
    } catch (error) {
        console.error('獲取收藏失敗:', error);
        res.status(500).json({ success: false, message: '獲取收藏失敗' });
    }
};

// Check if post is favorited
exports.isFavorite = (req, res) => {
    try {
        const { postId } = req.params;
        const username = req.username; // Added by auth middleware
        
        // Check if favorite
        const isFavorite = userModel.isFavorite(username, postId);
        
        // Return result
        res.json({ isFavorite });
    } catch (error) {
        console.error('檢查收藏狀態失敗:', error);
        res.status(500).json({ success: false, message: '檢查收藏狀態失敗' });
    }
}; 