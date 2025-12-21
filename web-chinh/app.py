from flask import (
    Flask, request, jsonify, render_template,
    session, redirect, Response
)
from functools import wraps
import json
import os
import requests

app = Flask(__name__)

# ================== CONFIG ==================
# ⚠️ Production nên dùng biến môi trường
app.secret_key = os.environ.get("SECRET_KEY", "sk-gttURQqGrEIovSGrsDfkD9Hw8H5REP3MQwQjPWGfZUqzo7vH")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USERS_FILE = os.path.join(BASE_DIR, "users.json")


# ================== UTIL ==================
def load_users():
    if not os.path.exists(USERS_FILE):
        return []
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []


def save_users(users):
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=4)


def ensure_admin():
    users = load_users()
    if not any(u.get("role") == "admin" for u in users):
        users.append({
            "username": "admin",
            "password": "123",  # ⚠️ đổi khi deploy
            "role": "admin"
        })
        save_users(users)


ensure_admin()


# ================== AUTH GUARD ==================
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


# ================== PAGES ==================
@app.route("/")
def home():
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


# ================== AUTH API ==================
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
            return jsonify(success=True, role=session["role"])

    return jsonify(success=False, message="Tài khoản hoặc mật khẩu không đúng")


@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify(success=True)


@app.route("/api/me")
def me():
    if not session.get("username"):
        return jsonify(logged_in=False)
    return jsonify(
        logged_in=True,
        username=session.get("username"),
        role=session.get("role", "user")
    )


# ================== IMAGE PROXY (QUAN TRỌNG) ==================
@app.route("/img_proxy")
@login_required
def img_proxy():
    """
    Proxy ảnh:
    - Chỉ user đã đăng nhập mới xem được
    - Ẩn link ảnh gốc
    """
    img_url = request.args.get("url")
    if not img_url:
        return "Missing image url", 400

    try:
        resp = requests.get(img_url, timeout=10)
        if resp.status_code != 200:
            return "Failed to fetch image", 404

        content_type = resp.headers.get(
            "Content-Type", "image/jpeg"
        )

        return Response(
            resp.content,
            content_type=content_type,
            headers={
                "Cache-Control": "public, max-age=86400"
            }
        )
    except Exception as e:
        return f"Error fetching image: {str(e)}", 500


# ================== RUN ==================
if __name__ == "__main__":
    app.run(debug=True)
