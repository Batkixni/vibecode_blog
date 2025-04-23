// 頁面載入動畫控制
document.addEventListener('DOMContentLoaded', () => {
    // 選擇所有需要動畫的元素
    const animateElements = document.querySelectorAll('.animate-in, .animate-in-slow');
    
    // 設置 Intersection Observer 來控制元素進入視圖時的動畫
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // 當元素進入視圖時添加可見類別
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // 一旦觸發了動畫，就停止觀察該元素
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,  // 元素有10%在視圖中時觸發
        rootMargin: '0px 0px -50px 0px'  // 視圖底部延伸50px
    });
    
    // 頁面完全載入後的處理
    window.addEventListener('load', () => {
        // 確保頁面已經可見
        if (document.body.style.visibility !== 'visible') {
            document.body.style.visibility = 'visible';
        }
        
        // 短暫延遲以確保所有樣式已應用
        setTimeout(() => {
            // 移除預載入類別以允許過渡動畫執行
            document.body.classList.remove('preload');
            document.documentElement.classList.remove('preload');
            
            // 控制頁面動畫順序
            const animateSequence = () => {
                // 1. 左側欄動畫
                const leftColumn = document.querySelector('.left-column');
                if (leftColumn) {
                    leftColumn.classList.add('animate-in');
                    leftColumn.classList.add('visible');
                }
                
                // 2. 網站標誌動畫
                setTimeout(() => {
                    const logo = document.querySelector('.website-logo');
                    if (logo) {
                        logo.classList.add('animate-in');
                        logo.classList.add('visible');
                    }
                }, 200);
                
                // 3. 導航連結動畫
                const navLinks = document.querySelectorAll('.nav-link');
                navLinks.forEach((link, index) => {
                    setTimeout(() => {
                        link.classList.add('animate-in');
                        link.classList.add('visible');
                    }, 300 + (index * 100));
                });
                
                // 4. 右側欄動畫
                setTimeout(() => {
                    const rightColumn = document.querySelector('.right-column');
                    if (rightColumn) {
                        rightColumn.classList.add('animate-in');
                        rightColumn.classList.add('visible');
                    }
                }, 400);
                
                // 5. 內容元素動畫
                setTimeout(() => {
                    const featuredPost = document.querySelector('.featured-post');
                    if (featuredPost) {
                        featuredPost.classList.add('animate-in');
                        featuredPost.classList.add('visible');
                    }
                    
                    // 文章列表逐個顯示
                    const blogPosts = document.querySelectorAll('.blog-post');
                    blogPosts.forEach((post, index) => {
                        setTimeout(() => {
                            post.classList.add('animate-in');
                            post.classList.add('visible');
                        }, 100 * (index + 1));
                    });
                }, 600);
                
                // 為其他元素啟用觀察
                setTimeout(() => {
                    animateElements.forEach(el => {
                        if (!el.classList.contains('visible')) {
                            observer.observe(el);
                        }
                    });
                    
                    // 標記動畫完成
                    document.body.classList.add('js-animation-complete');
                }, 800);
            };
            
            // 啟動動畫序列
            animateSequence();
        }, 100);
    });
}); 