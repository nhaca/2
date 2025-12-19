from flask import (
    Flask, request, jsonify, session,
    render_template, Response, abort
)
from functools import wraps
from datetime import timedelta
import os, json, requests, urllib.parse

app = Flask(__name__)

# ================== CONFIG ==================
app.secret_key = os.environ.get(
    "SECRET_KEY",
    "phuc_dep_zai_secret_key_vatlieugau"
)
app.permanent_session_lifetime = timedelta(days=30)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USERS_FILE = os.path.join(BASE_DIR, "users.json")

# Chỉ cho phép proxy từ domain này (đổi nếu cần)
ALLOWED_IMAGE_PREFIX = (
    "https://i.ibb.co/",
)

# ================== UTIL ==================
def load_users():
    if not os.path.exists(USERS_FILE):
        return []
    with open(USERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def login_required_api(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get("username"):
            return jsonify(success=False, message="Unauthorized"), 401
        return f(*args, **kwargs)
    return wrapper

# ================== PAGES ==================
@app.route("/")
def home():
    return render_template("index.html")

# ================== AUTH ==================
@app.route("/api/login", methods=["POST"])
def login():
    data = request.json or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    remember = data.get("rememberMe", False)

    if not username or not password:
        return jsonify(success=False, message="Thiếu tài khoản hoặc mật khẩu")

    for u in load_users():
        if u.get("username") == username and u.get("password") == password:
            session["username"] = username
            session.permanent = remember
            return jsonify(success=True, username=username)

    return jsonify(success=False, message="Sai tài khoản hoặc mật khẩu")

@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify(success=True)

@app.route("/api/me")
def me():
    return jsonify(
        logged_in=bool(session.get("username")),
        username=session.get("username")
    )

# ================== IMAGE PROXY (IMPORT LINK) ==================
@app.route("/img_proxy")
def img_proxy():
    # Bắt buộc đăng nhập
    if not session.get("username"):
        abort(403)

    raw_url = request.args.get("url")
    if not raw_url:
        abort(400)

    # Decode URL
    url = urllib.parse.unquote(raw_url)

    # Chặn domain lạ
    if not url.startswith(ALLOWED_IMAGE_PREFIX):
        abort(403)

    try:
        r = requests.get(url, timeout=8)
        if r.status_code != 200:
            abort(404)

        content_type = r.headers.get("Content-Type", "image/png")

        return Response(
            r.content,
            mimetype=content_type,
            headers={
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff"
            }
        )
    except requests.RequestException:
        abort(502)

# ================== DEMO API (OPTIONAL) ==================
@app.route("/api/resources")
@login_required_api
def resources():
    # Ví dụ backend trả dữ liệu (HTML không cần nhúng dữ liệu)
    return jsonify([
        {
            "title": "Nhân Vật",
            "img": "https://i.ibb.co/j90ZdyLY/1723212151.png",
            "vip": True
        }
    ])

# ❌ KHÔNG app.run()
# Render / Gunicorn sẽ tự chạy
