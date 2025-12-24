// =======================================================
// I. CÁC HÀM TOÀN CỤC (GLOBAL SCOPE)
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
        document.querySelectorAll('.unauthorized-overlay').forEach(overlay => {
            overlay.style.display = isLoggedIn ? 'none' : 'flex';
        });

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

    if (loginBtnMenu) loginBtnMenu.onclick = () => window.openModal('login-modal');
    if (logoutLinkMenu) logoutLinkMenu.onclick = () => window.openModal('logout-modal');

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

    if (logoutForm) {
        logoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await fetch('/api/logout', { method: 'POST' });
            location.reload();
        });
    }

    // --- 2. XỬ LÝ TẢI FILE (DOWNLOAD) ---

    function handleDownload(id) {
        if (!isLoggedIn) {
            window.openModal('login-modal');
            return;
        }
        // Gọi API tải file của Flask bằng ID
        window.location.href = `/api/download/${id}`;
    }

    // --- 3. XỬ LÝ FILTER & PAGINATION ---

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

    // --- 4. XEM CHI TIẾT & TẢI FILE ---

    allCards.forEach(card => {
        // Sự kiện click vào card (Xem chi tiết)
        card.addEventListener('click', (e) => {
            // Nếu click trúng nút tải nhanh trên card
            if (e.target.closest('.download-btn')) {
                e.stopPropagation();
                handleDownload(card.dataset.id);
                return;
            }

            if (e.target.closest('.unauthorized-overlay')) return;

            if (!isLoggedIn) {
                window.openModal('login-modal');
                return;
            }

            const data = card.dataset;
            // Lưu ID hiện tại vào modal để nút download trong modal biết cần tải file nào
            const modal = document.getElementById('image-detail-modal');
            modal.dataset.currentId = data.id;

            document.getElementById('detail-image').src = `/img_proxy?url=${encodeURIComponent(data.img)}`;
            document.getElementById('detail-title').textContent = data.title;
            document.getElementById('detail-category').textContent = data.cat;
            document.getElementById('detail-description').textContent = data.desc || "Không có mô tả.";

            window.openModal('image-detail-modal');
        });
    });

    // Sự kiện nút Download trong Modal chi tiết
    const detailDlBtn = document.getElementById('detail-download-btn');
    if (detailDlBtn) {
        detailDlBtn.onclick = () => {
            const modal = document.getElementById('image-detail-modal');
            const resId = modal.dataset.currentId;
            if (resId) handleDownload(resId);
        };
    }

    // --- 5. TAB EVENTS ---

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

    checkAuth();
});
