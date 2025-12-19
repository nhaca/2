document.addEventListener('DOMContentLoaded', () => {

    // =======================================================
    // I. KHAI BÁO BIẾN VÀ HẰNG SỐ
    // =======================================================
    const ITEMS_PER_PAGE = 20;
    let isLoggedIn = false;
    let currentUser = null;

    const categoryTabsAll = document.querySelectorAll('.category-tab');
    const subcategoryTabsAll = document.querySelectorAll('.subcategory-tab');
    const allCards = Array.from(document.querySelectorAll('.resources-grid .material-card'));
    const emptyMessage = document.querySelector('#empty-message');
    const paginationContainer = document.getElementById('pagination');

    // Các thành phần Modal Chi tiết
    const detailImage = document.getElementById('detail-image');
    const detailTitle = document.getElementById('detail-title');
    const detailCategory = document.getElementById('detail-category');
    const detailDescription = document.getElementById('detail-description');
    const detailDownloadBtn = document.getElementById('detail-download-btn');

    let currentCat = 'nhanvat';
    let currentSubcat = null;
    let currentPage = 1;
    let filteredCards = [];

    // =======================================================
    // II. KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP (API)
    // =======================================================
    async function checkAuth() {
        try {
            const res = await fetch('/api/me');
            const data = await res.json();
            if (data.logged_in) {
                isLoggedIn = true;
                currentUser = data.username;
                updateAuthUI(true);
            } else {
                isLoggedIn = false;
                updateAuthUI(false);
            }
        } catch (err) {
            console.error("Auth check failed:", err);
            updateAuthUI(false);
        }
        filterCards(); // Sau khi check auth thì mới filter để hiện/ẩn khóa
    }

    function updateAuthUI(logged) {
        const loginBtn = document.getElementById('login-nav-btn');
        const logoutBtn = document.getElementById('logout-nav-btn');
        const overlays = document.querySelectorAll('.unauthorized-overlay');

        if (logged) {
            if (loginBtn) loginBtn.classList.add('hidden');
            if (logoutBtn) logoutBtn.classList.remove('hidden');
            overlays.forEach(ov => ov.classList.add('hidden'));
        } else {
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (logoutBtn) logoutBtn.classList.add('hidden');
            overlays.forEach(ov => ov.classList.remove('hidden'));
        }
    }

    // =======================================================
    // III. XỬ LÝ ẢNH QUA PROXY (BẢO MẬT)
    // =======================================================
    function getSecureUrl(originalUrl) {
        if (!originalUrl || originalUrl.startsWith('data:')) return originalUrl;
        // Gửi URL gốc qua endpoint proxy của Flask
        return `/img_proxy?url=${encodeURIComponent(originalUrl)}`;
    }

    // =======================================================
    // IV. HIỂN THỊ VÀ PHÂN TRANG
    // =======================================================
    function filterCards() {
        filteredCards = allCards.filter(card => {
            const catMatch = card.dataset.cat === currentCat;
            const subcatMatch = !currentSubcat || card.dataset.subcat === currentSubcat;
            return catMatch && subcatMatch;
        });

        currentPage = 1;
        displayCards(currentPage);
        setupPagination();
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

                // Bảo mật ảnh: Load ảnh qua proxy khi thẻ được hiển thị
                const imgEl = card.querySelector('.material-image');
                const rawUrl = card.dataset.img;
                if (imgEl && rawUrl && isLoggedIn) {
                    const secureUrl = getSecureUrl(rawUrl);
                    if (imgEl.src !== window.location.origin + secureUrl) {
                        imgEl.src = secureUrl;
                    }
                }
            }
        });

        if (emptyMessage) emptyMessage.style.display = hasVisible ? 'none' : 'flex';
    }

    function setupPagination() {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = '';
        const pageCount = Math.ceil(filteredCards.length / ITEMS_PER_PAGE);
        if (pageCount <= 1) return;

        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('button');
            btn.innerText = i;
            btn.classList.add('page-btn');
            if (i === currentPage) btn.classList.add('active');
            btn.addEventListener('click', () => {
                currentPage = i;
                displayCards(currentPage);
                document.querySelectorAll('.page-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            paginationContainer.appendChild(btn);
        }
    }

    // =======================================================
    // V. MODAL CHI TIẾT
    // =======================================================
    function openImageDetail(card) {
        if (!isLoggedIn) {
            openModal('login-modal'); // Nếu chưa đăng nhập thì hiện form login
            return;
        }

        const rawImg = card.dataset.img;
        const title = card.dataset.title || card.querySelector('.material-title').textContent;
        const description = card.dataset.desc || 'Tài liệu đồ họa chất lượng cao.';
        const downloadUrl = card.dataset.download || '#';

        // Gán ảnh qua Proxy
        detailImage.src = getSecureUrl(rawImg);
        detailTitle.textContent = title;
        detailDescription.textContent = description;

        detailDownloadBtn.onclick = () => {
            if (downloadUrl !== '#') {
                window.open(downloadUrl, '_blank');
            } else {
                alert('Chức năng tải xuống đang được bảo trì!');
            }
        };

        openModal('image-detail-modal');
    }

    // =======================================================
    // VI. UTILITIES (MODAL, THEME, v.v.)
    // =======================================================
    function openModal(id) {
        const m = document.getElementById(id);
        if (m) {
            m.classList.remove('hidden');
            m.classList.add('visible');
            document.body.style.overflow = 'hidden';
        }
    }

    window.closeModal = function(id) {
        const m = document.getElementById(id);
        if (m) {
            m.classList.add('hidden');
            m.classList.remove('visible');
            document.body.style.overflow = '';
        }
    };

    // Sự kiện click vào Card
    allCards.forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.unauthorized-overlay')) {
                openModal('login-modal');
                return;
            }
            openImageDetail(card);
        });
    });

    // Sự kiện Menu Tab
    categoryTabsAll.forEach(tab => {
        tab.addEventListener('click', () => {
            categoryTabsAll.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCat = tab.dataset.cat;
            currentSubcat = null;
            filterCards();
        });
    });

    // Khởi chạy
    checkAuth();
});
