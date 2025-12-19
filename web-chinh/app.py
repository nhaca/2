from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from functools import wraps
import json
import os
from datetime import timedelta

app = Flask(__name__)

# ================== CONFIG ==================
app.secret_key = os.environ.get(
    "SECRET_KEY",
    "phuc_dep_zai_secret_key_vatlieugau"
)

app.permanent_session_lifetime = timedelta(days=30)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USERS_FILE = os.path.join(BASE_DIR, "users.json")

# ================== UTIL ==================
def load_users():
    if not os.path.exists(USERS_FILE):
        print("❌ users.json không tồn tại")
        return []
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print("❌ Lỗi đọc users.json:", e)
        return []

def login_required(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        if not session.get("username"):
            return redirect(url_for("home"))
        return view_func(*args, **kwargs)
    return wrapper

# ================== ROUTES ==================

@app.route("/")
def home():
    username = session.get("username")
    return render_template(
        "index.html",
        logged_in=bool(username),
        username=username
    )

@app.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    remember = data.get("rememberMe", False)

    if not username or not password:
        return jsonify(success=False, message="Thiếu tài khoản hoặc mật khẩu")

    users = load_users()
    for u in users:
        if u.get("username") == username and u.get("password") == password:
            session["username"] = username
            session.permanent = remember
            return jsonify(success=True, redirect="/")

    return jsonify(success=False, message="Sai tài khoản hoặc mật khẩu")

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")

# ================== API BẢO VỆ (VÍ DỤ) ==================

@app.route("/api/download/<path:filename>")
@login_required
def download(filename):
    return jsonify(success=True, file=filename)

