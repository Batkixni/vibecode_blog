const userModel = require('../models/userModel');

// Register user
exports.register = (req, res) => {
    try {
        const { username, password, email } = req.body;
        
        // Validate inputs
        if (!username || !password || !email) {
            return res.status(400).json({ success: false, message: '所有欄位都必須填寫' });
        }
        
        // Validate username (alphanumeric, 4-20 chars)
        if (!/^[a-zA-Z0-9]{4,20}$/.test(username)) {
            return res.status(400).json({ 
                success: false, 
                message: '用戶名必須是4-20個字元的英文字母和數字' 
            });
        }
        
        // Validate password (min 6 chars)
        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: '密碼必須至少6個字元' 
            });
        }
        
        // Validate email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: '請輸入有效的電子郵件地址' 
            });
        }
        
        // Register user
        const result = userModel.registerUser(username, password, email);
        
        // Return result
        res.json(result);
    } catch (error) {
        console.error('註冊失敗:', error);
        res.status(500).json({ success: false, message: '註冊失敗' });
    }
};

// Login user
exports.login = (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Validate inputs
        if (!username || !password) {
            return res.status(400).json({ success: false, message: '請輸入用戶名和密碼' });
        }
        
        // Login user
        const result = userModel.loginUser(username, password);
        
        // Set token cookie if successful
        if (result.success) {
            res.cookie('auth_token', result.token, {
                httpOnly: true,
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                sameSite: 'strict'
            });
        }
        
        // Return result
        res.json(result);
    } catch (error) {
        console.error('登入失敗:', error);
        res.status(500).json({ success: false, message: '登入失敗' });
    }
};

// Logout user
exports.logout = (req, res) => {
    try {
        const token = req.cookies.auth_token;
        
        // Validate token
        if (!token) {
            return res.status(400).json({ success: false, message: '無效的令牌' });
        }
        
        // Logout user
        const result = userModel.logoutUser(token);
        
        // Clear token cookie
        res.clearCookie('auth_token');
        
        // Return result
        res.json(result);
    } catch (error) {
        console.error('登出失敗:', error);
        res.status(500).json({ success: false, message: '登出失敗' });
    }
};

// Check auth status
exports.checkAuth = (req, res) => {
    try {
        const token = req.cookies.auth_token;
        
        // Validate token
        if (!token) {
            return res.json({ 
                authenticated: false 
            });
        }
        
        // Verify token
        const result = userModel.verifyToken(token);
        
        // Return result
        res.json({ 
            authenticated: result.valid,
            username: result.valid ? result.username : null
        });
    } catch (error) {
        console.error('檢查身份驗證失敗:', error);
        res.status(500).json({ success: false, message: '檢查身份驗證失敗' });
    }
};

// Middleware to check if user is authenticated
exports.isAuthenticated = (req, res, next) => {
    try {
        const token = req.cookies.auth_token;
        
        // Validate token
        if (!token) {
            return res.status(401).json({ success: false, message: '需要身份驗證' });
        }
        
        // Verify token
        const result = userModel.verifyToken(token);
        
        if (!result.valid) {
            return res.status(401).json({ success: false, message: '身份驗證已過期' });
        }
        
        // Add username to request
        req.username = result.username;
        
        // Continue
        next();
    } catch (error) {
        console.error('身份驗證中間件失敗:', error);
        res.status(500).json({ success: false, message: '身份驗證失敗' });
    }
}; 