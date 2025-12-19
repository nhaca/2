from flask import Flask, request, jsonify, render_template, session
from functools import wraps
import json
import os
from datetime import timedelta

app = Flask(__name__)

# Secret key cố định để giữ phiên đăng nhập ổn định
app.secret_key = "phuc_dep_zai_secret_key_vatlieugau"

# Cấu hình thời gian lưu đăng nhập khi chọn "Nhớ tôi" (31 ngày)
app.permanent_session_lifetime = timedelta(days=31)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USERS_FILE = os.path.join(BASE_DIR, "users.json")

# ================== HÀM HỖ TRỢ (UTIL) ==================
def load_users():
    if not os.path.exists(USERS_FILE):
        return []
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Lỗi đọc file users.json: {e}")
        return []

# ================== LỚP BẢO VỆ (AUTH GUARD) ==================
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("username"):
            return jsonify(success=False, message="Vui lòng đăng nhập để truy cập"), 401
        return f(*args, **kwargs)
    return decorated

# ================== CÁC ĐƯỜNG DẪN (ROUTES) ==================

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    remember = data.get("rememberMe", False)

    if not username or not password:
        return jsonify(success=False, message="Thiếu thông tin đăng nhập")

    users = load_users()
    for u in users:
        if u["username"] == username and u["password"] == password:
            session["username"] = username
            # Xử lý tính năng "Nhớ tôi"
            session.permanent = remember 
            return jsonify(success=True)

    return jsonify(success=False, message="Tài khoản hoặc mật khẩu không chính xác")

@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify(success=True)

@app.route("/api/me")
def me():
    # API này giúp JavaScript biết trạng thái để ẩn/hiện nút và nội dung
    return jsonify(
        logged_in=bool(session.get("username")),
        username=session.get("username")
    )

# Ví dụ về bảo vệ đường dẫn tải về
@app.route("/api/download/<path:filename>")
@login_required
def download(filename):
    return jsonify(success=True, file_requested=filename)

# Để chạy trên server (Gunicorn/UWSGI), chúng ta không dùng app.run() trực tiếp
if __name__ == "__main__":
    app.run(debug=True)
