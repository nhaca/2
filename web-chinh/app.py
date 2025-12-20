from flask import Flask, request, jsonify, render_template, session, redirect
from functools import wraps
import json
import os

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "phuc_dep_zai_secret_key")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USERS_FILE = os.path.join(BASE_DIR, "users.json")

def load_users():
    if not os.path.exists(USERS_FILE): return []
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f: return json.load(f)
    except: return []

# Đảm bảo có admin mặc định
if not any(u.get("role") == "admin" for u in load_users()):
    users = load_users()
    users.append({"username": "admin", "password": "123", "role": "admin"})
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=4)

# API TRẠNG THÁI (Dùng cho trang chủ)
@app.route("/api/me")
def me():
    if not session.get("username"):
        return jsonify(logged_in=False)
    return jsonify(
        logged_in=True,
        username=session.get("username"),
        role=session.get("role", "user")
    )

# API ĐĂNG NHẬP
@app.route("/api/login", methods=["POST"])
def login():
    data = request.json or {}
    u_name = data.get("username", "").strip()
    p_word = data.get("password", "").strip()

    users = load_users()
    for u in users:
        if u["username"] == u_name and u["password"] == p_word:
            session["username"] = u["username"]
            session["role"] = u.get("role", "user")
            return jsonify(success=True)
    return jsonify(success=False, message="Sai tài khoản hoặc mật khẩu")

# API ĐĂNG XUẤT
@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify(success=True)

# PROXY ẢNH (Giữ nguyên chức năng bảo mật ảnh của bạn)
@app.route("/img_proxy")
def img_proxy():
    import requests
    url = request.args.get('url')
    if not url: return "No URL", 400
    res = requests.get(url, stream=True)
    return (res.content, res.status_code, res.headers.items())

@app.route("/")
def home(): return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True)
