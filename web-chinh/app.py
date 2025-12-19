from flask import Flask, request, jsonify, render_template, session
from functools import wraps
import json
import os
from datetime import timedelta

app = Flask(__name__)

# Secret key để mã hóa session - Hãy giữ chuỗi này bí mật
app.secret_key = os.environ.get("SECRET_KEY", "phuc_dep_zai_secret_key_vatlieugau")

# Cấu hình thời gian sống của session khi chọn "Nhớ tôi" (30 ngày)
app.permanent_session_lifetime = timedelta(days=30)

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
            return jsonify(success=False, message="Vui lòng đăng nhập trước"), 401
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
        return jsonify(success=False, message="Tài khoản và mật khẩu không được trống")

    users = load_users()
    for u in users:
        if u["username"] == username and u["password"] == password:
            session["username"] = username
            session.permanent = remember
            return jsonify(success=True, username=username)  # 👈 THÊM

    return jsonify(success=False, message="Sai tài khoản hoặc mật khẩu")

@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify(success=True)

@app.route("/api/me")
def me():
    # Giúp Frontend kiểm tra trạng thái đăng nhập để ẩn/hiện nút và khóa nội dung
    return jsonify(
        logged_in=bool(session.get("username")),
        username=session.get("username")
    )

@app.route("/api/download/<path:filename>")
@login_required
def download(filename):
    # Route ví dụ để bảo vệ link tải tài nguyên
    return jsonify(success=True, file=filename)

if __name__ == "__main__":
    app.run()

