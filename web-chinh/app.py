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
    except Exception:
        return []


def save_users(users):
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=4)


def ensure_default_user():
    """
    Tạo sẵn 1 tài khoản mặc định nếu file users.json trống
    """
    users = load_users()
    if not users:
        users.append({
            "username": "admin",
            "password": "123"
        })
        save_users(users)


ensure_default_user()


# ================== AUTH GUARD ==================
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("username"):
            return jsonify(success=False, message="Chưa đăng nhập"), 401
        return f(*args, **kwargs)
    return decorated


# ================== PAGES ==================
@app.route("/")
def home():
    return render_template("index.html")


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
            return jsonify(success=True)

    return jsonify(success=False, message="Sai tài khoản hoặc mật khẩu")


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
        username=session.get("username")
    )


# ================== IMAGE PROXY ==================
@app.route("/img_proxy")
@login_required
def img_proxy():
    """
    - Chỉ cần đăng nhập là xem được ảnh
    - Không phân quyền
    """
    img_url = request.args.get("url")
    if not img_url:
        return "Missing image url", 400

    try:
        resp = requests.get(img_url, timeout=10)
        if resp.status_code != 200:
            return "Failed to fetch image", 404

        return Response(
            resp.content,
            content_type=resp.headers.get("Content-Type", "image/jpeg"),
            headers={
                "Cache-Control": "public, max-age=86400"
            }
        )
    except Exception as e:
        return f"Error fetching image: {str(e)}", 500


# ================== RUN ==================
if __name__ == "__main__":
    app.run(debug=True)
