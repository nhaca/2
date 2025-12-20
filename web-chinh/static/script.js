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

    function updateUnauthorizedOverlays() {
        document.querySelectorAll('.unauthorized-overlay').forEach(overlay => {
            if (isLoggedIn) {
                overlay.classList.remove('visible');
                overlay.style.display = 'none';
            } else {
                overlay.classList.add('visible');
                overlay.style.display = 'flex';
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
        button.className = 'px-3 py-1 rounded-lg font-medium transition-colors';
        if (isDisabled) {
            button.disabled = true;
            button.classList.add('bg-gray-200', 'text-gray-500', 'cursor-not-allowed');
        } else if (isActive) {
            button.classList.add('bg-blue-600', 'text-white');
        } else {
            button.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
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
        for (let i = 1; i <= pageCount; i++) {
            paginationContainer.appendChild(createPageButton(i, i, false, i === currentPage));
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
                const imgElement = card.querySelector('.material-image');
                const originalUrl = card.dataset.img;
                if (imgElement && originalUrl) {
                    const secureUrl = `/img_proxy?url=${encodeURIComponent(originalUrl)}`;
                    if (imgElement.src !== window.location.origin + secureUrl) imgElement.src = secureUrl;
                }
                card.style.display = 'flex';
                hasVisible = true;
            }
        });
        if (emptyMessage) emptyMessage.style.display = hasVisible ? 'none' : 'flex';
    }

    // =======================================================
    // IV. XỬ LÝ AUTH & EVENTS
    // =======================================================
    
    // 1. Kiểm tra trạng thái login
    fetch('/api/me')
        .then(r => r.json())
        .then(me => {
            isLoggedIn = me.logged_in;
            const welcomeText = document.getElementById('welcome-text');
            const accountLabel = document.getElementById('account-label');
            const loginBtn = document.getElementById('open-login-modal-btn');
            const logoutLink = document.getElementById('logout-link');

            if (isLoggedIn) {
                loginBtn?.classList.add('hidden');
                logoutLink?.classList.remove('hidden');
                if (welcomeText) {
                    welcomeText.textContent = `Xin chào, ${me.username} 👋`;
                    welcomeText.classList.remove('hidden');
                }
                accountLabel?.classList.add('hidden');
            }
            updateUnauthorizedOverlays();
        });

    // 2. Form Login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msg = document.getElementById('login-message');
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();
            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                if (data.success) {
                    msg.textContent = 'Thành công!';
                    window.location.reload();
                } else {
                    msg.textContent = data.message;
                }
            } catch (err) { msg.textContent = 'Lỗi kết nối.'; }
        });
    }

    // 3. Form Logout
    const logoutForm = document.getElementById('logout-form');
    if (logoutForm) {
        logoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await fetch('/api/logout', { method: 'POST' });
            window.location.reload();
        });
    }

    // --- Chức năng phụ (Giữ nguyên) ---
    (function antiDevTools() {
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('keydown', e => {
            if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key.toUpperCase()))) e.preventDefault();
        });
    })();

    // Theme Toggle
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        });
    }

    // Tabs
    categoryTabsAll.forEach(tab => {
        tab.addEventListener('click', () => {
            categoryTabsAll.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCat = tab.dataset.cat;
            currentSubcat = null;
            filterCards();
        });
    });

    // Image Detail & Modal
    allCards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            if (e.target.closest('.unauthorized-overlay') || e.target.closest('.material-button')) return;
            if (!isLoggedIn) return;
            
            const detailImg = document.getElementById('detail-image');
            const originalImgUrl = card.dataset.img || card.querySelector('.material-image').src;
            detailImg.src = `/img_proxy?url=${encodeURIComponent(originalImgUrl)}`;
            document.getElementById('detail-title').textContent = card.dataset.title || "Chi tiết";
            openModal('image-detail-modal');
        });
    });

    document.querySelectorAll('.modal-close-btn').forEach(btn => btn.addEventListener('click', closeAllModals));
    
    // Khởi chạy
    wrapLetters('empty-message');
    filterCards();
});
