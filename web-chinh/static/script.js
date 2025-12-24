// =======================================================
// I. CÁC HÀM TOÀN CỤC (GLOBAL SCOPE)
// Phải nằm ngoài DOMContentLoaded để HTML gọi được qua onclick
// =======================================================

window.openModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }
};

window.closeAllModals = function() {
    document.querySelectorAll('.modal-overlay').forEach(m => {
        m.classList.add('hidden');
        m.classList.remove('visible');
    });
    document.body.style.overflow = '';
};

window.handleUnauthorizedClick = (e) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    window.openModal('login-modal');
};

// =======================================================
// II. LOGIC CHÍNH KHI TRANG TẢI XONG
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
    const ITEMS_PER_PAGE = 20;
    let isLoggedIn = false;
    let currentUser = null;

    // DOM Elements
    const allCards = Array.from(document.querySelectorAll('.resources-grid .material-card'));
    const categoryTabs = document.querySelectorAll('.category-tab');
    const subcategoryTabs = document.querySelectorAll('.subcategory-tab');
    const paginationContainer = document.getElementById('pagination');
    const emptyMessage = document.querySelector('#empty-message');
    
    // Auth Elements
    const loginForm = document.getElementById('login-form');
    const logoutForm = document.getElementById('logout-form');
    const welcomeText = document.getElementById('welcome-text');
    const loginBtnMenu = document.getElementById('open-login-modal-btn');
    const logoutLinkMenu = document.getElementById('logout-link');

    // State
    let currentCat = 'nhanvat';
    let currentSubcat = null;
    let currentPage = 1;
    let filteredCards = [];

    // --- 1. XỬ LÝ AUTHENTICATION ---

    async function checkAuth() {
        try {
            const res = await fetch('/api/me');
            const data = await res.json();
            isLoggedIn = data.logged_in;
            currentUser = data.username;
            updateUIState();
            filterCards(); 
        } catch (err) {
            console.error("Auth check failed");
            updateUIState();
        }
    }

    function updateUIState() {
        // Overlay trên ảnh
        document.querySelectorAll('.unauthorized-overlay').forEach(overlay => {
            overlay.style.display = isLoggedIn ? 'none' : 'flex';
        });

        // Menu Header
        if (isLoggedIn) {
            if (loginBtnMenu) loginBtnMenu.classList.add('hidden');
            if (logoutLinkMenu) logoutLinkMenu.classList.remove('hidden');
            if (welcomeText) {
                welcomeText.textContent = `Chào, ${currentUser}`;
                welcomeText.classList.remove('hidden');
            }
        } else {
            if (loginBtnMenu) loginBtnMenu.classList.remove('hidden');
            if (logoutLinkMenu) logoutLinkMenu.classList.add('hidden');
            if (welcomeText) welcomeText.classList.add('hidden');
        }
    }

    // Gán sự kiện cho các nút trong Menu Dropdown
    if (loginBtnMenu) loginBtnMenu.onclick = () => window.openModal('login-modal');
    if (logoutLinkMenu) logoutLinkMenu.onclick = () => window.openModal('logout-modal');

    // Submit Đăng nhập
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const msg = document.getElementById('login-message');

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                if (data.success) {
                    location.reload();
                } else {
                    msg.textContent = data.message;
                    msg.style.color = "red";
                }
            } catch (err) {
                msg.textContent = "Lỗi kết nối server!";
            }
        });
    }

    // Submit Đăng xuất
    if (logoutForm) {
        logoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await fetch('/api/logout', { method: 'POST' });
            location.reload();
        });
    }

    // --- 2. XỬ LÝ FILTER & PAGINATION ---

    function filterCards() {
        filteredCards = allCards.filter(card => {
            const cardCat = (card.dataset.cat || '').toLowerCase();
            const cardSub = (card.dataset.subcat || '').toLowerCase();
            if (currentSubcat && currentSubcat !== 'all') return cardSub.includes(currentSubcat);
            if (currentCat === 'all') return true;
            return cardCat.includes(currentCat);
        });
        currentPage = 1;
        displayCards(currentPage);
        setupPagination(filteredCards.length);
    }

    function displayCards(page) {
        const start = (page - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        let hasVisible = false;

        allCards.forEach(c => c.style.display = 'none');

        filteredCards.forEach((card, index) => {
            if (index < start || index >= end) return;
            const img = card.querySelector('.material-image');
            const originalUrl = card.dataset.img;

            if (img && originalUrl) {
                img.src = isLoggedIn ? `/img_proxy?url=${encodeURIComponent(originalUrl)}` : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
            }
            card.style.display = 'flex';
            hasVisible = true;
        });

        if (emptyMessage) emptyMessage.style.display = hasVisible ? 'none' : 'flex';
    }

    function setupPagination(total) {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = '';
        const pageCount = Math.ceil(total / ITEMS_PER_PAGE);
        if (pageCount <= 1) return;

        paginationContainer.appendChild(createPageBtn('Trước', currentPage - 1, currentPage === 1));
        for (let i = 1; i <= pageCount; i++) {
            paginationContainer.appendChild(createPageBtn(i, i, false, i === currentPage));
        }
        paginationContainer.appendChild(createPageBtn('Sau', currentPage + 1, currentPage === pageCount));
    }

    function createPageBtn(text, page, disabled, active = false) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.className = `px-4 py-2 rounded-lg transition ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`;
        if (disabled) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        } else {
            btn.onclick = () => {
                currentPage = page;
                displayCards(page);
                setupPagination(filteredCards.length);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
        }
        return btn;
    }

    // --- 3. XEM CHI TIẾT ---

    allCards.forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.unauthorized-overlay') || e.target.closest('.download-btn')) return;
            if (!isLoggedIn) {
                window.openModal('login-modal');
                return;
            }

            const data = card.dataset;
            document.getElementById('detail-image').src = `/img_proxy?url=${encodeURIComponent(data.img)}`;
            document.getElementById('detail-title').textContent = data.title;
            document.getElementById('detail-category').textContent = data.cat;
            document.getElementById('detail-description').textContent = data.desc || "Không có mô tả.";
            
            const dlBtn = document.getElementById('detail-download-btn');
            const sourceLink = card.querySelector('a')?.href;
            dlBtn.onclick = () => { if(sourceLink) window.open(sourceLink, '_blank'); };

            window.openModal('image-detail-modal');
        });
    });

    // --- 4. TAB EVENTS ---

    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            categoryTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCat = tab.dataset.cat.toLowerCase();
            currentSubcat = null;
            filterCards();
        });
    });

    subcategoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            subcategoryTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentSubcat = tab.dataset.subcat.toLowerCase();
            filterCards();
        });
    });

    // Khởi tạo ban đầu
    checkAuth();
});
