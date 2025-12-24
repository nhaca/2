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
    
    // Forms
    const loginForm = document.getElementById('login-form');
    const logoutForm = document.getElementById('logout-form');

    // State
    let currentCat = 'nhanvat'; // Mặc định hiển thị nhân vật
    let currentSubcat = null;
    let currentPage = 1;
    let filteredCards = [];

    // =======================================================
    // II. XỬ LÝ AUTHENTICATION (KẾT NỐI FLASK)
    // =======================================================

    async function checkAuth() {
        try {
            const res = await fetch('/api/me');
            const data = await res.json();
            isLoggedIn = data.logged_in;
            currentUser = data.username;
            updateUnauthorizedOverlays();
            filterCards(); // Chạy filter sau khi xác định trạng thái login
        } catch (err) {
            console.error("Auth check failed");
            updateUnauthorizedOverlays();
        }
    }

    function updateUnauthorizedOverlays() {
        document.querySelectorAll('.unauthorized-overlay').forEach(overlay => {
            overlay.style.display = isLoggedIn ? 'none' : 'flex';
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const msg = document.getElementById('login-message');

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
        });
    }

    if (logoutForm) {
        logoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await fetch('/api/logout', { method: 'POST' });
            location.reload();
        });
    }

    // =======================================================
    // III. BỘ LỌC VÀ PHÂN TRANG (FILTER & PAGINATION)
    // =======================================================

    function filterCards() {
        filteredCards = allCards.filter(card => {
            const cardCat = (card.dataset.cat || '').toLowerCase();
            const cardSub = (card.dataset.subcat || '').toLowerCase();

            if (currentSubcat && currentSubcat !== 'all') {
                return cardSub.includes(currentSubcat);
            }
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

            // Xử lý ảnh qua Proxy nếu đã login
            if (img && originalUrl) {
                if (isLoggedIn) {
                    img.src = `/img_proxy?url=${encodeURIComponent(originalUrl)}`;
                } else {
                    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
                }
            }

            card.style.display = 'flex';
            hasVisible = true;
        });

        if (emptyMessage) {
            emptyMessage.style.display = hasVisible ? 'none' : 'flex';
        }
    }

    function setupPagination(total) {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = '';
        const pageCount = Math.ceil(total / ITEMS_PER_PAGE);
        if (pageCount <= 1) return;

        const prevBtn = createPageBtn('Trước', currentPage - 1, currentPage === 1);
        paginationContainer.appendChild(prevBtn);

        for (let i = 1; i <= pageCount; i++) {
            paginationContainer.appendChild(createPageBtn(i, i, false, i === currentPage));
        }

        const nextBtn = createPageBtn('Sau', currentPage + 1, currentPage === pageCount);
        paginationContainer.appendChild(nextBtn);
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

    // =======================================================
    // IV. XỬ LÝ MODAL (XEM CHI TIẾT & LIÊN KẾT)
    // =======================================================

    // Xem chi tiết ảnh
    allCards.forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.unauthorized-overlay') || e.target.closest('.download-btn')) return;
            if (!isLoggedIn) {
                openModal('login-modal');
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

            openModal('image-detail-modal');
        });
    });

    // Mở Modal chung
    function openModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('visible');
            document.body.style.overflow = 'hidden';
        }
    }

    // Đóng Modal chung (Global)
    window.closeAllModals = function() {
        document.querySelectorAll('.modal-overlay').forEach(m => {
            m.classList.add('hidden');
            m.classList.remove('visible');
        });
        document.body.style.overflow = '';
    }

    // Gán sự kiện cho các nút đóng trong HTML
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.onclick = closeAllModals;
    });

    // Handle Click Overlay Đăng nhập
    window.handleUnauthorizedClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openModal('login-modal');
    };

    // =======================================================
    // V. SỰ KIỆN TAB & KHỞI TẠO
    // =======================================================

    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            categoryTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCat = tab.dataset.cat.toLowerCase();
            currentSubcat = null; // Reset sub khi đổi main cat
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

    // Chạy khởi tạo
    checkAuth();
});

