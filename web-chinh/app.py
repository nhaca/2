from flask import Flask, request, jsonify, render_template, session
from functools import wraps
import json
import os

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "phuc_dep_zai_secret_key")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USERS_FILE = os.path.join(BASE_DIR, "users.json")


# ================== UTIL ==================
def load_users():
    if not os.path.exists(USERS_FILE):
        return []
    with open(USERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


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
        return jsonify(success=False, message="Thiếu thông tin")

    for u in load_users():
        if u["username"] == username and u["password"] == password:
            session["username"] = username
            return jsonify(success=True)

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


# ================== PROTECTED API (VD) ==================
@app.route("/api/download/<path:filename>")
@login_required
def download(filename):
    return jsonify(success=True, file=filename)


if __name__ == "__main__":
    app.run(debug=True)
