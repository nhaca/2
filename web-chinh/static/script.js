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

    let currentCat = 'nhanvat';   // mặc định
    let currentSubcat = null;
    let currentPage = 1;
    let filteredCards = [];

    // =======================================================
    // II. MODAL UTILITIES
    // =======================================================
    const modals = document.querySelectorAll('.modal-overlay');

    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }

    function closeAllModals() {
        modals.forEach(m => {
            m.classList.remove('visible');
            m.classList.add('hidden');
        });
        document.body.style.overflow = '';
    }

    function updateUnauthorizedOverlays() {
        document.querySelectorAll('.unauthorized-overlay').forEach(overlay => {
            overlay.style.display = isLoggedIn ? 'none' : 'flex';
        });
    }

    window.handleUnauthorizedClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isLoggedIn) {
            closeAllModals();
            openModal('login-modal');
        }
    };

    // =======================================================
    // III. FILTER + PAGINATION (FIX CHÍNH)
    // =======================================================

    function filterCards() {
        filteredCards = allCards.filter(card => {
            const cardCat = (card.dataset.cat || '').toLowerCase();
            const cardSub = (card.dataset.subcat || '').toLowerCase();

            // 👉 FIX: dùng includes để hỗ trợ tag
            if (currentSubcat && currentSubcat !== 'all') {
                return cardSub.includes(currentSubcat);
            }

            if (currentCat === 'all') return true;
            return cardCat.includes(currentCat);
        });

        currentPage = 1;
        setupPagination(filteredCards.length);
        displayCards(currentPage);
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

            // 👉 FIX: luôn gán ảnh khi card hiển thị
            if (img && originalUrl) {
                img.src = `/img_proxy?url=${encodeURIComponent(originalUrl)}`;
            }

            card.style.display = 'flex';
            hasVisible = true;
        });

        if (emptyMessage) {
            emptyMessage.style.display = hasVisible ? 'none' : 'flex';
        }
    }

    function createPageButton(text, page, disabled, active = false) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.className = 'px-3 py-1 rounded-lg font-medium';

        if (disabled) {
            btn.disabled = true;
            btn.classList.add('bg-gray-200', 'cursor-not-allowed');
        } else if (active) {
            btn.classList.add('bg-blue-600', 'text-white');
        } else {
            btn.classList.add('bg-gray-100');
            btn.onclick = () => {
                currentPage = page;
                displayCards(page);
                setupPagination(filteredCards.length);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
        }
        return btn;
    }

    function setupPagination(total) {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = '';

        const pageCount = Math.ceil(total / ITEMS_PER_PAGE);
        if (pageCount <= 1) return;

        paginationContainer.appendChild(createPageButton('Trước', currentPage - 1, currentPage === 1));

        for (let i = 1; i <= pageCount; i++) {
            paginationContainer.appendChild(createPageButton(i, i, false, i === currentPage));
        }

        paginationContainer.appendChild(createPageButton('Sau', currentPage + 1, currentPage === pageCount));
    }

    // =======================================================
    // IV. AUTH
    // =======================================================
    fetch('/api/me')
        .then(r => r.json())
        .then(me => {
            isLoggedIn = me.logged_in;
            updateUnauthorizedOverlays();
        })
        .catch(() => updateUnauthorizedOverlays());

    // =======================================================
    // V. TAB EVENTS
    // =======================================================
    categoryTabsAll.forEach(tab => {
        tab.addEventListener('click', () => {
            categoryTabsAll.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCat = tab.dataset.cat.toLowerCase();
            currentSubcat = null;
            filterCards();
        });
    });

    subcategoryTabsAll.forEach(tab => {
        tab.addEventListener('click', () => {
            subcategoryTabsAll.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentSubcat = tab.dataset.subcat.toLowerCase();
            filterCards();
        });
    });

    // =======================================================
    // VI. INIT
    // =======================================================
    document.querySelector('.category-tab[data-cat="nhanvat"]')?.classList.add('active');
    filterCards();

});
