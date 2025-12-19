document.addEventListener('DOMContentLoaded', () => {

    // =======================================================
    // I. KHAI BÁO BIẾN VÀ HẰNG SỐ (Tập trung lại)
    // =======================================================
    const ITEMS_PER_PAGE = 20; // Theo yêu cầu gần nhất của bạn
    let isLoggedIn = false;

    const categoryTabsAll = document.querySelectorAll('.category-tab');
    const subcategoryTabsAll = document.querySelectorAll('.subcategory-tab');
    const allCards = Array.from(document.querySelectorAll('.resources-grid .material-card'));
    const emptyMessage = document.querySelector('#empty-message');
    const paginationContainer = document.getElementById('pagination');

    let currentCat = 'nhanvat';
    let currentSubcat = null;
    let currentPage = 1;
    let filteredCards = [];

    // =======================================================
    // II. HÀM CHUNG VÀ MODAL UTILITIES
    // =======================================================

    // --- Utils for Modals ---
    const modals = document.querySelectorAll('.modal-overlay');
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) { modal.classList.remove('hidden'); modal.classList.add('visible'); document.body.style.overflow = 'hidden'; }
    }
    function closeAllModals() {
        modals.forEach(modal => { modal.classList.remove('visible'); modal.classList.add('hidden'); });
        document.body.style.overflow = '';
    }

    // --- Utils for Login Status ---
    function updateUnauthorizedOverlays() {
        const overlays = document.querySelectorAll('.unauthorized-overlay');
        if (isLoggedIn) {
            overlays.forEach(overlay => {
                overlay.classList.remove('visible');
            });
        } else {
            overlays.forEach(overlay => {
                overlay.classList.add('visible');
            });
        }
    }
    window.handleUnauthorizedClick = (event) => { // Dùng window để gọi từ HTML
        event.preventDefault();
        event.stopPropagation();
        if (!isLoggedIn) {
            closeAllModals();
            openModal('login-modal');
        }
    };

    // --- Utils for Empty Message Animation ---
    function wrapLetters(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        const text = element.textContent.trim();
        let wrappedHtml = '';
        for (let i = 0; i < text.length; i++) {
            const char = text[i] === ' ' ? '&nbsp;' : text[i];
            wrappedHtml += `<span style="animation-delay: ${i * 0.1}s;">${char}</span>`;
        }
        element.innerHTML = wrappedHtml;
    }

    // =======================================================
    // III. LỌC VÀ PHÂN TRANG (PAGINATION LOGIC - ĐÃ SỬA LỖI)
    // =======================================================

    // 1. Hàm lọc thẻ (Filter)
    function filterCards() {
        filteredCards = allCards.filter(card => {
            const cardCat = card.getAttribute('data-cat');
            const cardSub = card.getAttribute('data-subcat') || '';

            let shouldShow = false;

            if (currentSubcat && currentSubcat !== 'all') {
                if (cardSub.includes(currentSubcat)) {
                    shouldShow = true;
                }
            }
            else if (currentCat) {
                if (currentCat === 'all' || cardCat === currentCat) {
                    shouldShow = true;
                }
            }
            return shouldShow;
        });

        currentPage = 1;
        setupPagination(filteredCards.length);
        displayCards(currentPage);
    }

    // 2. Hàm tạo nút phân trang
    function createPageButton(text, pageNumber, isDisabled, isActive = false) {
        const button = document.createElement('button');
        button.textContent = text;

        button.classList.add('px-3', 'py-1', 'rounded-lg', 'font-medium', 'transition-colors');

        if (isDisabled) {
            button.disabled = true;
            button.classList.add('bg-gray-200', 'text-gray-500', 'dark:bg-gray-700', 'dark:text-gray-400', 'cursor-not-allowed');
        } else if (isActive) {
            button.classList.add('bg-blue-600', 'text-white', 'hover:bg-blue-700');
        } else {
            button.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200', 'dark:bg-gray-800', 'dark:text-gray-300', 'dark:hover:bg-gray-700');
            button.addEventListener('click', () => {
                currentPage = pageNumber;
                displayCards(currentPage);
                setupPagination(filteredCards.length);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
        return button;
    }

    // 3. Hàm thiết lập nút chuyển trang (Pagination - Đã sửa lỗi hiển thị dots)
    function setupPagination(totalItems) {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = '';
        const pageCount = Math.ceil(totalItems / ITEMS_PER_PAGE);

        if (pageCount <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }

        paginationContainer.style.display = 'flex';

        // Nút Prev
        const prevBtn = createPageButton('Trước', currentPage - 1, currentPage === 1);
        paginationContainer.appendChild(prevBtn);

        // Logic hiển thị nút số trang (5 nút chính + 1 và cuối + dots)
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(pageCount, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // Nút '1' và '...' đầu tiên
        if (startPage > 1) {
            paginationContainer.appendChild(createPageButton('1', 1, false, 1 === currentPage));
            if (startPage > 2) {
                paginationContainer.appendChild(createPageButton('...', null, true));
            }
        }

        // Vòng lặp hiển thị các nút số trang
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = createPageButton(i, i, false, i === currentPage);
            paginationContainer.appendChild(pageBtn);
        }

        // Nút '...' cuối cùng và nút 'pageCount'
        if (endPage < pageCount) {
            if (endPage < pageCount - 1) {
                paginationContainer.appendChild(createPageButton('...', null, true));
            }
            paginationContainer.appendChild(createPageButton(pageCount, pageCount, false, pageCount === currentPage));
        }

        // Nút Next
        const nextBtn = createPageButton('Sau', currentPage + 1, currentPage === pageCount);
        paginationContainer.appendChild(nextBtn);
    }

    // 4. Hàm hiển thị các thẻ trên trang hiện tại
    function displayCards(page) {
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        let hasVisible = false;

        allCards.forEach(card => {
            card.style.display = 'none';
        });

        filteredCards.forEach((card, index) => {
            if (index >= startIndex && index < endIndex) {
                card.style.display = 'flex'; // Dùng 'flex' để giữ style thẻ
                hasVisible = true;
            }
        });

        if (emptyMessage) {
            emptyMessage.style.display = hasVisible ? 'none' : 'flex';
        }
    }


    // =======================================================
    // IV. CÁC KHỐI SỰ KIỆN VÀ LOGIC KHÁC
    // =======================================================

    // Khai báo các biến modal cần thiết (cần phải nằm trong DOM)
    const openLoginModalBtn = document.getElementById('open-login-modal-btn');
    const openBindAccountsModalBtn = document.getElementById('open-bind-accounts-modal-btn');
    const openPricingModalBtn = document.getElementById('open-pricing-modal-btn');
    const closeButtons = document.querySelectorAll('.modal-close-btn');
    const logoutForm = document.getElementById('logout-form');
    const logoutLink = document.getElementById('logout-link'); // Lấy link đăng xuất

    // ===== Anti-DevTools (TỪ CODE CỦA BẠN) =====
    (function antiDevToolsLight() {
        function stopSite() {
            document.body.innerHTML = `
                <div style="
                    display:flex;
                    justify-content:center;
                    align-items:center;
                    height:100vh;
                    background:#0b0b0b;
                    color:#ff4444;
                    font-size:22px;
                    font-weight:600;
                    text-align:center;
                ">
                    ⚠️ Truy cập bị hạn chế<br>
                    Vui lòng đóng DevTools
                    hoặc kiểm tra độ zoom trang của bạn
                </div>
            `;
        }
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('keydown', e => {
            if (
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && ['i','j','c'].includes(e.key.toLowerCase())) ||
                (e.ctrlKey && (e.key.toLowerCase() === 'u' || e.key.toLowerCase() === 's'))
            ) {
                e.preventDefault();
                stopSite();
            }
        });
        setInterval(() => {
            const gapW = window.outerWidth - window.innerWidth;
            const gapH = window.outerHeight - window.innerHeight;
            if (gapW > 200 || gapH > 200) {
                stopSite();
            }
        }, 1500);
    })();

    // ===== Theme Toggle (GIỮ NGUYÊN) =====
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) htmlElement.classList.add(currentTheme);
    else {
        htmlElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }

    function updateThemeButton() {
        if (htmlElement.classList.contains('dark')) {
            themeToggleBtn.innerHTML = '<i class="fas fa-sun w-5 h-5 text-yellow-600"></i>';
            themeToggleBtn.setAttribute('aria-label', 'Chuyển sang chế độ sáng');
        } else {
            themeToggleBtn.innerHTML = '<i class="fas fa-moon w-5 h-5 text-indigo-600"></i>';
            themeToggleBtn.setAttribute('aria-label', 'Chuyển sang chế độ tối');
        }
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            htmlElement.classList.toggle('dark');
            htmlElement.classList.toggle('light');
            localStorage.setItem('theme', htmlElement.classList.contains('dark') ? 'dark' : 'light');
            updateThemeButton();
        });
        updateThemeButton();
    }

    // ===== Announcement Banner (GIỮ NGUYÊN) =====
    const announcementBanner = document.getElementById('announcement-banner');
    const closeBannerBtn = document.getElementById('close-banner-btn');
    if (closeBannerBtn) closeBannerBtn.addEventListener('click', () => { announcementBanner.style.display = 'none'; });

    // ===== Dropdown Menus (GIỮ NGUYÊN) =====
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        const button = dropdown.querySelector('button');
        button.addEventListener('click', () => {
            dropdowns.forEach(d => { if (d !== dropdown) d.classList.remove('active'); });
            dropdown.classList.toggle('active');
        });
        document.addEventListener('click', e => { if (!dropdown.contains(e.target)) dropdown.classList.remove('active'); });
    });

    // ===== Category Tabs Scrolling (GIỮ NGUYÊN) =====
    const categoryTabs = document.getElementById('category-tabs');
    const scrollLeftBtn = document.querySelector('.category-nav-wrapper .nav-scroll-btn.left-0');
    const scrollRightBtn = document.querySelector('.category-nav-wrapper .nav-scroll-btn.right-0');
    if (categoryTabs && scrollLeftBtn && scrollRightBtn) {
        scrollLeftBtn.addEventListener('click', () => { categoryTabs.scrollBy({ left: -200, behavior: 'smooth' }); });
        scrollRightBtn.addEventListener('click', () => { categoryTabs.scrollBy({ left: 200, behavior: 'smooth' }); });
    }

    // ===== Modal Buttons Listeners =====
    if (openLoginModalBtn) openLoginModalBtn.addEventListener('click', e => { e.preventDefault(); closeAllModals(); openModal('login-modal'); });
    if (openBindAccountsModalBtn) openBindAccountsModalBtn.addEventListener('click', e => { e.preventDefault(); closeAllModals(); openModal('bind-accounts-modal'); });
    if (openPricingModalBtn) openPricingModalBtn.addEventListener('click', e => { e.preventDefault(); closeAllModals(); openModal('pricing-modal'); });
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            closeAllModals();
            openModal('logout-modal');
        });
    }
    closeButtons.forEach(btn => btn.addEventListener('click', closeAllModals));
    modals.forEach(modal => modal.addEventListener('click', e => { if (e.target === modal) closeAllModals(); }));

    // ===== Login Form (GIỮ NGUYÊN) =====
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const usernameError = document.getElementById('username-error');
        const passwordError = document.getElementById('password-error');
        const loginMessage = document.getElementById('login-message');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            let valid = true;
            usernameError.textContent = ''; passwordError.textContent = ''; loginMessage.textContent = '';
            loginMessage.classList.remove('success','error');

            if (!usernameInput.value.trim()) { usernameError.textContent = 'Tài khoản không được để trống.'; valid=false; }
            if (!passwordInput.value.trim()) { passwordError.textContent = 'Mật khẩu không được để trống.'; valid=false; }
            if (!valid) return;

            try {
                const response = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ username: usernameInput.value.trim(), password: passwordInput.value.trim(), rememberMe: document.getElementById('remember-me').checked }) });
                const data = await response.json();
                if (data.success) {
                    loginMessage.textContent = 'Đăng nhập thành công! Đang chuyển hướng...';
                    loginMessage.classList.add('success');
                    isLoggedIn = true;
                    updateUnauthorizedOverlays();
                    setTimeout(() => { closeAllModals(); window.location.href = data.role==='admin'?"/admin-dashboard":"/user-dashboard"; },1500);
                } else {
                    loginMessage.textContent = `Đăng nhập thất bại: ${data.message||'Sai tài khoản hoặc mật khẩu.'}`;
                    loginMessage.classList.add('error');
                }
            } catch (err) { loginMessage.textContent='Đã xảy ra lỗi hệ thống. Vui lòng thử lại.'; loginMessage.classList.add('error'); console.error(err);}
        });
    }

    // ===== Logout Form (TỪ CODE CỦA BẠN) =====
    if (logoutForm) {
        logoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const logoutMessage = document.getElementById('logout-message');
            logoutMessage.textContent = 'Đang xử lý...';
            logoutMessage.classList.remove('success', 'error');

            try {
                const response = await fetch('/api/logout', { method: 'POST' });
                const data = await response.json();

                if (response.ok && data.success) {
                    logoutMessage.textContent = 'Đăng xuất thành công! Đang chuyển hướng...';
                    logoutMessage.classList.add('success');
                    isLoggedIn = false;
                    updateUnauthorizedOverlays();
                    setTimeout(() => {
                        closeAllModals();
                        window.location.reload();
                    }, 1000);

                } else {
                    logoutMessage.textContent = `Đăng xuất thất bại: ${data.message || 'Lỗi không xác định.'}`;
                    logoutMessage.classList.add('error');
                }
            } catch (err) {
                logoutMessage.textContent = 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại.';
                logoutMessage.classList.add('error');
                console.error(err);
            }
        });
    }

    // ===== Bind Accounts (GIỮ NGUYÊN) =====
    document.querySelectorAll('.bind-card').forEach(card => {
        const submitBtn = card.querySelector('.btn-primary');
        const platform = card.dataset.platform;
        if (!submitBtn) return;
        submitBtn.addEventListener('click', async () => {
            const idInput = card.querySelector(`#${platform.toLowerCase()}-id`);
            const id = idInput?.value.trim();
            if (!id) return alert(`Vui lòng nhập ID cho ${platform}.`);
            try {
                const res = await fetch('/api/accounts/bind', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ platform,id }) });
                const data = await res.json();
                alert(data.success ? data.message||`Liên kết ${platform} thành công!` : `Liên kết ${platform} thất bại: ${data.message||'Lỗi không xác định.'}`);
            } catch (err) { console.error(err); alert('Đã xảy ra lỗi khi liên kết tài khoản. Vui lòng thử lại.'); }
        });
    });

    // ===== Login/Logout UI & Admin User Load (CẬP NHẬT) =====
    fetch('/api/me').then(r=>r.json()).then(me=>{
        const loginLink=document.getElementById('open-login-modal-btn');
        const adminPanel=document.getElementById('admin-panel');

        isLoggedIn = me.logged_in;

        if(isLoggedIn){ loginLink?.classList.add('hidden'); logoutLink?.classList.remove('hidden'); }
        else { loginLink?.classList.remove('hidden'); logoutLink?.classList.add('hidden'); }

        updateUnauthorizedOverlays();

        if(isLoggedIn && me.role==='admin'){ if(adminPanel){ adminPanel.style.display='block'; loadUsers(); } }
    }).catch(err => {
        console.log("Không thể kiểm tra trạng thái đăng nhập:", err);
        updateUnauthorizedOverlays();
    });

    function loadUsers(){
        fetch('/api/admin/users').then(res=>res.json()).then(data=>{
            if(!data.success) return;
            const tbody=document.getElementById('user-list');
            if (tbody) {
                tbody.innerHTML='';
                data.users.forEach(u=>{
                    const tr=document.createElement('tr');
                    tr.innerHTML=`<td>${u.username}</td><td>${u.password||'******'}</td><td>${u.role||'user'}</td>`;
                    tbody.appendChild(tr);
                });
            }
        }).catch(err => console.log("Không thể tải danh sách người dùng admin:", err));
    }

    // ===== Lắng nghe sự kiện Category và Subcategory =====
    categoryTabsAll.forEach(tab => {
        tab.addEventListener('click', () => {
            categoryTabsAll.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            currentCat = tab.dataset.cat;
            currentSubcat = null;

            subcategoryTabsAll.forEach(t => t.classList.remove('active'));

            filterCards();
        });
    });

    subcategoryTabsAll.forEach(tab => {
        tab.addEventListener('click', () => {
            subcategoryTabsAll.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            currentSubcat = tab.dataset.subcat;

            filterCards();
        });
    });

    // -------------------------------------------------------------
    // START: LOGIC CHẾ ĐỘ NHÚNG IFRAME (Embed Mode Logic) (GIỮ NGUYÊN)
    // -------------------------------------------------------------
    const resourceContent = document.getElementById('resource-content');
    const embedWrapper = document.getElementById('embed-wrapper');
    const toolIframe = document.getElementById('tool-iframe');
    const embedTitle = document.getElementById('embed-title');
    const loadingSpinner = document.getElementById('loading-spinner-overlay');
    const closeEmbedBtn = document.getElementById('close-embed-btn');


    function activateEmbedMode(toolId) {
        if (!resourceContent || !embedWrapper || !toolIframe || !embedTitle || !loadingSpinner) {
            console.error("Thiếu các phần tử cần thiết cho chế độ nhúng.");
            return;
        }

        let url = '';
        let title = '';

        if (toolId === 'veo3') {
            url = 'https://labs.google/fx/tools/flow';
            title = 'Công cụ: AI veo3';
        } else if (toolId === 'nano-pro') {
            url = 'https://ai-generator.artlist.io/image-to-image-ai/nano-banana-pro';
            title = 'Công cụ: Nano Banana Pro';
        } else {
            console.warn('Tool ID không hợp lệ:', toolId);
            return;
        }

        loadingSpinner.style.display = 'flex';
        resourceContent.style.display = 'none';
        embedTitle.textContent = title;
        toolIframe.src = url;
        embedWrapper.style.display = 'block';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function deactivateEmbedMode() {
        if (resourceContent && embedWrapper && toolIframe && loadingSpinner) {
            embedWrapper.style.display = 'none';
            toolIframe.src = '';
            resourceContent.style.display = 'block';
            loadingSpinner.style.display = 'none';
        }
    }

    if (toolIframe && loadingSpinner) {
        toolIframe.addEventListener('load', () => {
            loadingSpinner.style.display = 'none';
        });

        toolIframe.addEventListener('error', () => {
            loadingSpinner.style.display = 'none';
            alert("Lỗi: Không thể tải công cụ AI. Trang web này có thể chặn nhúng (embedding).");
        });
    }

    document.querySelectorAll('.dropdown-item[data-tool-id]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const toolId = e.currentTarget.getAttribute('data-tool-id');
            activateEmbedMode(toolId);
            e.currentTarget.closest('.dropdown')?.classList.remove('active');
        });
    });

    if (closeEmbedBtn) {
        closeEmbedBtn.addEventListener('click', deactivateEmbedMode);
    }
    // -------------------------------------------------------------
    // END: LOGIC CHẾ ĐỘ NHÚNG IFRAME
    // -------------------------------------------------------------


    // =======================================================
    // V. KHỞI CHẠY BAN ĐẦU
    // =======================================================
    document.querySelector('.category-tab[data-cat="nhanvat"]')?.classList.add('active');
    wrapLetters('empty-message'); // Bật animation cho tin nhắn rỗng
    filterCards(); // Bắt đầu bằng việc lọc và hiển thị trang đầu tiên

});