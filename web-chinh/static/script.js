document.addEventListener('DOMContentLoaded', () => {

    // =======================================================
    // I. KHAI BÁO BIẾN VÀ HẰNG SỐ
    // =======================================================
    const ITEMS_PER_PAGE = 20; 
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

    const modals = document.querySelectorAll('.modal-overlay');
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) { 
            modal.classList.remove('hidden'); 
            modal.classList.add('visible'); 
            document.body.style.overflow = 'hidden'; 
        }
    }
    function closeAllModals() {
        modals.forEach(modal => { 
            modal.classList.remove('visible'); 
            modal.classList.add('hidden'); 
        });
        document.body.style.overflow = '';
    }

    // Cập nhật các lớp phủ bảo vệ dựa trên trạng thái đăng nhập
    function updateUnauthorizedOverlays() {
        const overlays = document.querySelectorAll('.unauthorized-overlay');
        overlays.forEach(overlay => {
            if (isLoggedIn) {
                overlay.classList.remove('visible');
            } else {
                overlay.classList.add('visible');
            }
        });
    }

    window.handleUnauthorizedClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!isLoggedIn) {
            closeAllModals();
            openModal('login-modal');
        }
    };

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
    // III. LỌC VÀ PHÂN TRANG
    // =======================================================

    function filterCards() {
        filteredCards = allCards.filter(card => {
            const cardCat = card.getAttribute('data-cat');
            const cardSub = card.getAttribute('data-subcat') || '';
            let shouldShow = false;

            if (currentSubcat && currentSubcat !== 'all') {
                if (cardSub.includes(currentSubcat)) shouldShow = true;
            } else if (currentCat) {
                if (currentCat === 'all' || cardCat === currentCat) shouldShow = true;
            }
            return shouldShow;
        });

        currentPage = 1;
        setupPagination(filteredCards.length);
        displayCards(currentPage);
    }

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

    function setupPagination(totalItems) {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = '';
        const pageCount = Math.ceil(totalItems / ITEMS_PER_PAGE);
        if (pageCount <= 1) { paginationContainer.style.display = 'none'; return; }

        paginationContainer.style.display = 'flex';
        paginationContainer.appendChild(createPageButton('Trước', currentPage - 1, currentPage === 1));

        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(pageCount, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) startPage = Math.max(1, endPage - maxVisiblePages + 1);

        if (startPage > 1) {
            paginationContainer.appendChild(createPageButton('1', 1, false, 1 === currentPage));
            if (startPage > 2) paginationContainer.appendChild(createPageButton('...', null, true));
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationContainer.appendChild(createPageButton(i, i, false, i === currentPage));
        }

        if (endPage < pageCount) {
            if (endPage < pageCount - 1) paginationContainer.appendChild(createPageButton('...', null, true));
            paginationContainer.appendChild(createPageButton(pageCount, pageCount, false, pageCount === currentPage));
        }
        paginationContainer.appendChild(createPageButton('Sau', currentPage + 1, currentPage === pageCount));
    }

    function displayCards(page) {
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        let hasVisible = false;
        allCards.forEach(card => card.style.display = 'none');
        filteredCards.forEach((card, index) => {
            if (index >= startIndex && index < endIndex) {
                card.style.display = 'flex';
                hasVisible = true;
            }
        });
        if (emptyMessage) emptyMessage.style.display = hasVisible ? 'none' : 'flex';
    }

    // =======================================================
    // IV. CÁC KHỐI SỰ KIỆN VÀ LOGIC KHÁC
    // =======================================================

    const openLoginModalBtn = document.getElementById('open-login-modal-btn');
    const openBindAccountsModalBtn = document.getElementById('open-bind-accounts-modal-btn');
    const openPricingModalBtn = document.getElementById('open-pricing-modal-btn');
    const closeButtons = document.querySelectorAll('.modal-close-btn');
    const logoutForm = document.getElementById('logout-form');
    const logoutLink = document.getElementById('logout-link');

    // --- Anti-DevTools ---
    (function antiDevToolsLight() {
        function stopSite() {
            document.body.innerHTML = `<div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#0b0b0b;color:#ff4444;font-size:22px;font-weight:600;text-align:center;">⚠️ Truy cập bị hạn chế<br>Vui lòng đóng DevTools</div>`;
        }
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('keydown', e => {
            if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['i','j','c'].includes(e.key.toLowerCase()))) {
                e.preventDefault(); stopSite();
            }
        });
    })();

    // --- Theme Toggle ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    const currentTheme = localStorage.getItem('theme') || 'dark';
    htmlElement.classList.add(currentTheme);

    function updateThemeButton() {
        if (!themeToggleBtn) return;
        themeToggleBtn.innerHTML = htmlElement.classList.contains('dark') 
            ? '<i class="fas fa-sun w-5 h-5 text-yellow-600"></i>' 
            : '<i class="fas fa-moon w-5 h-5 text-indigo-600"></i>';
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

    // --- Modal Listeners ---
    if (openLoginModalBtn) openLoginModalBtn.addEventListener('click', e => { e.preventDefault(); closeAllModals(); openModal('login-modal'); });
    if (openBindAccountsModalBtn) openBindAccountsModalBtn.addEventListener('click', e => { e.preventDefault(); closeAllModals(); openModal('bind-accounts-modal'); });
    if (openPricingModalBtn) openPricingModalBtn.addEventListener('click', e => { e.preventDefault(); closeAllModals(); openModal('pricing-modal'); });
    if (logoutLink) logoutLink.addEventListener('click', e => { e.preventDefault(); closeAllModals(); openModal('logout-modal'); });
    
    closeButtons.forEach(btn => btn.addEventListener('click', closeAllModals));
    modals.forEach(modal => modal.addEventListener('click', e => { if (e.target === modal) closeAllModals(); }));

    // --- Xử lý Đăng nhập ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const loginMessage = document.getElementById('login-message');
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();

            try {
                const response = await fetch('/api/login', { 
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify({ username, password, rememberMe: document.getElementById('remember-me').checked }) 
                });
                const data = await response.json();
                if (data.success) {
                    isLoggedIn = true;
                    updateUnauthorizedOverlays();
                    loginMessage.textContent = 'Đăng nhập thành công!';
                    setTimeout(() => { closeAllModals(); window.location.reload(); }, 800);
                } else {
                    loginMessage.textContent = data.message || 'Sai tài khoản hoặc mật khẩu.';
                }
            } catch (err) { loginMessage.textContent = 'Lỗi hệ thống.'; }
        });
    }

    // --- Xử lý Đăng xuất ---
    if (logoutForm) {
        logoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const response = await fetch('/api/logout', { method: 'POST' });
                const data = await response.json();
                if (data.success) {
                    isLoggedIn = false;
                    window.location.reload();
                }
            } catch (err) { console.error(err); }
        });
    }

    // --- KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP (ĐÃ LOẠI BỎ PHÂN LOẠI ADMIN) ---
    fetch('/api/me').then(r => r.json()).then(me => {
        isLoggedIn = me.logged_in;
        const loginLink = document.getElementById('open-login-modal-btn');

        if (isLoggedIn) {
            loginLink?.classList.add('hidden');
            logoutLink?.classList.remove('hidden');
        } else {
            loginLink?.classList.remove('hidden');
            logoutLink?.classList.add('hidden');
        }
        updateUnauthorizedOverlays();
    }).catch(() => updateUnauthorizedOverlays());

    // --- Tabs Handling ---
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

    // --- Iframe Embed Logic ---
    const resourceContent = document.getElementById('resource-content');
    const embedWrapper = document.getElementById('embed-wrapper');
    const toolIframe = document.getElementById('tool-iframe');
    const embedTitle = document.getElementById('embed-title');
    const loadingSpinner = document.getElementById('loading-spinner-overlay');
    const closeEmbedBtn = document.getElementById('close-embed-btn');

    function activateEmbedMode(toolId) {
        if (!toolIframe) return;
        let url = toolId === 'veo3' ? 'https://labs.google/fx/tools/flow' : 'https://ai-generator.artlist.io/image-to-image-ai/nano-banana-pro';
        loadingSpinner.style.display = 'flex';
        resourceContent.style.display = 'none';
        embedTitle.textContent = toolId === 'veo3' ? 'Công cụ: AI veo3' : 'Công cụ: Nano Banana Pro';
        toolIframe.src = url;
        embedWrapper.style.display = 'block';
    }

    if (closeEmbedBtn) {
        closeEmbedBtn.addEventListener('click', () => {
            embedWrapper.style.display = 'none';
            toolIframe.src = '';
            resourceContent.style.display = 'block';
        });
    }

    document.querySelectorAll('.dropdown-item[data-tool-id]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            activateEmbedMode(e.currentTarget.getAttribute('data-tool-id'));
        });
    });

    if (toolIframe) toolIframe.addEventListener('load', () => { loadingSpinner.style.display = 'none'; });

    // =======================================================
    // V. KHỞI CHẠY BAN ĐẦU
    // =======================================================
    document.querySelector('.category-tab[data-cat="nhanvat"]')?.classList.add('active');
    wrapLetters('empty-message');
    filterCards();
});
