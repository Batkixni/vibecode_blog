// 頁面載入動畫控制 - 使用GSAP
document.addEventListener('DOMContentLoaded', () => {
    // 選擇所有需要動畫的元素
    const animateElements = document.querySelectorAll('.animate-in, .animate-in-slow');
    
    // 檢查GSAP是否已載入
    if (typeof gsap === 'undefined') {
        console.error('GSAP 庫未載入。請確保在使用此動畫之前已加載 GSAP。');
        // 加載GSAP庫
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
        script.onload = initAnimations;
        document.head.appendChild(script);

        // 加載TextPlugin
        const textPlugin = document.createElement('script');
        textPlugin.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/TextPlugin.min.js';
        document.head.appendChild(textPlugin);

        // 加載ScrollTrigger插件
        const scrollTrigger = document.createElement('script');
        scrollTrigger.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js';
        document.head.appendChild(scrollTrigger);
    } else {
        initAnimations();
    }
    
    function initAnimations() {
        // 註冊TextPlugin(如果沒有已註冊)
        if (gsap.plugins && !gsap.plugins.text && gsap.registerPlugin) {
            gsap.registerPlugin(TextPlugin, ScrollTrigger);
        }
        
        // 設置 ScrollTrigger 來控制元素進入視圖時的動畫
        animateElements.forEach(el => {
            gsap.set(el, { autoAlpha: 0, y: 30 });
            
            ScrollTrigger.create({
                trigger: el,
                start: "top 90%",
                onEnter: () => {
                    gsap.to(el, {
                        duration: 0.8,
                        autoAlpha: 1,
                        y: 0,
                        ease: "power2.out"
                    });
                }
            });
        });
    }
    
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
            const animatePageElements = () => {
                const timeline = gsap.timeline();
                
                // 1. 左側欄動畫
                const leftColumn = document.querySelector('.left-column');
                if (leftColumn) {
                    gsap.set(leftColumn, { autoAlpha: 0, x: -50 });
                    timeline.to(leftColumn, { 
                        duration: 0.8, 
                        autoAlpha: 1, 
                        x: 0, 
                        ease: "power3.out" 
                    });
                }
                
                // 2. 網站標誌動畫
                const logo = document.querySelector('.website-logo');
                if (logo) {
                    gsap.set(logo, { autoAlpha: 0, scale: 0.8 });
                    timeline.to(logo, { 
                        duration: 0.6, 
                        autoAlpha: 1, 
                        scale: 1,
                        ease: "back.out(1.7)" 
                    }, "-=0.4");
                }
                
                // 3. 導航連結動畫
                const navLinks = document.querySelectorAll('.nav-link');
                if (navLinks.length) {
                    gsap.set(navLinks, { autoAlpha: 0, y: -20 });
                    timeline.to(navLinks, { 
                        duration: 0.5, 
                        autoAlpha: 1, 
                        y: 0, 
                        stagger: 0.1,
                        ease: "power2.out" 
                    }, "-=0.3");
                }
                
                // 4. 右側欄動畫
                const rightColumn = document.querySelector('.right-column');
                if (rightColumn) {
                    gsap.set(rightColumn, { autoAlpha: 0, x: 50 });
                    timeline.to(rightColumn, { 
                        duration: 0.8, 
                        autoAlpha: 1, 
                        x: 0, 
                        ease: "power3.out" 
                    }, "-=0.6");
                }
                
                // 5. 內容元素動畫
                const featuredPost = document.querySelector('.featured-post');
                if (featuredPost) {
                    gsap.set(featuredPost, { autoAlpha: 0, y: 30 });
                    timeline.to(featuredPost, { 
                        duration: 0.7, 
                        autoAlpha: 1, 
                        y: 0,
                        ease: "power2.out" 
                    }, "-=0.4");
                }
                
                // 文章列表逐個顯示
                const blogPosts = document.querySelectorAll('.blog-post');
                if (blogPosts.length) {
                    gsap.set(blogPosts, { autoAlpha: 0, y: 40 });
                    timeline.to(blogPosts, { 
                        duration: 0.7, 
                        autoAlpha: 1, 
                        y: 0, 
                        stagger: 0.15,
                        ease: "power2.out" 
                    }, "-=0.3");
                }
                
                // 為標題添加特效
                addTitleEffects();
                
                // 標記動畫完成
                timeline.call(() => {
                    document.body.classList.add('js-animation-complete');
                });
                
                return timeline;
            };
            
            // 啟動動畫序列
            animatePageElements();
        }, 100);
    });
    
    // 標題特效
    function addTitleEffects() {
        // 找到所有標題元素
        const mainTitles = document.querySelectorAll('h1, .main-title');
        const subTitles = document.querySelectorAll('h2, .sub-title');
        
        // 主標題特效 - 逐字顯示
        mainTitles.forEach(title => {
            // 儲存原始文本內容
            const originalText = title.textContent;
            // 清空標題內容
            title.textContent = '';
            
            // 創建適用於GSAP的文本特效包裝器
            const wrapper = document.createElement('span');
            wrapper.className = 'text-animation-wrapper';
            title.appendChild(wrapper);
            
            // 使用GSAP文本插件設置動畫
            gsap.to(wrapper, {
                duration: 1.2,
                text: {
                    value: originalText,
                    delimiter: ""
                },
                ease: "none",
                onComplete: () => {
                    // 添加閃爍強調效果
                    gsap.fromTo(title, 
                        { textShadow: "0 0 0px rgba(255, 255, 255, 0)" },
                        { 
                            textShadow: "0 0 10px rgba(255, 255, 255, 0.7), 0 0 20px rgba(50, 50, 255, 0.5)", 
                            duration: 0.5,
                            yoyo: true,
                            repeat: 1
                        }
                    );
                }
            });
        });
        
        // 副標題特效 - 滑入並淡入
        subTitles.forEach(title => {
            gsap.fromTo(title, 
                { autoAlpha: 0, x: -30 },
                { 
                    autoAlpha: 1, 
                    x: 0, 
                    duration: 0.8,
                    ease: "power2.out"
                }
            );
            
            // 為副標題文字添加漸進顏色變化
            if (title.textContent.length > 0) {
                // 取得副標題中的文字
                const text = title.textContent;
                title.textContent = '';
                
                // 為每個字母創建單獨的span
                for (let i = 0; i < text.length; i++) {
                    const charSpan = document.createElement('span');
                    charSpan.textContent = text[i];
                    charSpan.style.display = 'inline-block';
                    title.appendChild(charSpan);
                    
                    // 為每個字母添加動畫
                    gsap.fromTo(charSpan,
                        { autoAlpha: 0, y: Math.random() * 30 - 15 },
                        { 
                            autoAlpha: 1, 
                            y: 0, 
                            duration: 0.4,
                            delay: 0.8 + (i * 0.03),
                            ease: "back.out(1.7)"
                        }
                    );
                }
            }
        });
    }
}); 