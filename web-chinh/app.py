from flask import Flask, request, jsonify, render_template, session, redirect
from functools import wraps
import json
import os

app = Flask(__name__)

# ⚠️ Production nên dùng biến môi trường để bảo mật
app.secret_key = os.environ.get("SECRET_KEY", "frdyejgvhj009ejk&$^**@&&*@&&*@^*vsd")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USERS_FILE = os.path.join(BASE_DIR, "users.json")


# ================== UTIL (CÔNG CỤ) ==================
def load_users():
    """Tải danh sách người dùng từ file JSON"""
    if not os.path.exists(USERS_FILE):
        return []
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []


def save_users(users):
    """Lưu danh sách người dùng vào file JSON"""
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=4)


def ensure_admin():
    """Tạo tài khoản admin mặc định nếu chưa tồn tại"""
    users = load_users()
    if not any(u.get("role") == "admin" for u in users):
        users.append({
            "username": "admin",
            "password": "123", # Bạn có thể đổi mật khẩu tại đây
            "role": "admin"
        })
        save_users(users)


ensure_admin()


# ================== AUTH GUARD (BẢO VỆ ROUTE) ==================
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("username"):
            return jsonify(success=False, message="Chưa đăng nhập"), 401
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("username"):
            return jsonify(success=False, message="Chưa đăng nhập"), 401
        if session.get("role") != "admin":
            return jsonify(success=False, message="Quyền truy cập bị từ chối"), 403
        return f(*args, **kwargs)
    return decorated


# ================== PAGES (CÁC TRANG GIAO DIỆN) ==================
@app.route("/")
def home():
    """Trang chủ - JS sẽ xử lý việc ẩn/hiện modal dựa trên session"""
    return render_template("index.html")


@app.route("/user-dashboard")
def user_dashboard():
    if not session.get("username"):
        return redirect("/")
    return render_template("users/users.html")


@app.route("/admin-dashboard")
def admin_dashboard():
    if session.get("role") != "admin":
        return redirect("/")
    return render_template("users/admin.html")


# ================== AUTH API (XỬ LÝ ĐĂNG NHẬP) ==================
@app.route("/api/login", methods=["POST"])
def login():
    data = request.json or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return jsonify(success=False, message="Thiếu thông tin đăng nhập")

    users = load_users()
    for u in users:
        if u["username"] == username and u["password"] == password:
            session["username"] = u["username"]
            session["role"] = u.get("role", "user")
            # Trả về thành công để JS thực hiện reload trang
            return jsonify(success=True, role=session["role"])

    return jsonify(success=False, message="Tài khoản hoặc mật khẩu không đúng")


@app.route("/api/logout", methods=["POST"])
def api_logout():
    """Xóa session và đăng xuất"""
    session.clear()
    return jsonify(success=True)


@app.route("/api/me")
def me():
    """Kiểm tra trạng thái đăng nhập hiện tại"""
    if not session.get("username"):
        return jsonify(logged_in=False)
    return jsonify(
        logged_in=True,
        username=session.get("username"),
        role=session.get("role", "user")
    )


# ================== KHỞI CHẠY ==================
if __name__ == "__main__":
    # debug=True giúp tự động tải lại code khi bạn thay đổi nội dung file .py
    app.run(debug=True)
