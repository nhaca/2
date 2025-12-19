from flask import Flask, request, jsonify, render_template, session, redirect
from functools import wraps
import json
import os

app = Flask(__name__)

# ⚠️ Production nên dùng biến môi trường
app.secret_key = os.environ.get("SECRET_KEY", "phuc_dep_zai_secret_key")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USERS_FILE = os.path.join(BASE_DIR, "users.json")


# ================== UTIL ==================
def load_users():
    if not os.path.exists(USERS_FILE):
        return []
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return []


def save_users(users):
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=4)


def ensure_admin():
    users = load_users()
    if not any(u.get("role") == "admin" for u in users):
        users.append({
            "username": "admin",
            "password": "adminphucdepzai@",
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
            return jsonify(success=False, message="Forbidden"), 403
        return f(*args, **kwargs)
    return decorated


# ================== PAGES ==================
@app.route("/")
def home():
    if session.get("role") == "admin":
        return redirect("/admin-dashboard")
    if session.get("username"):
        return redirect("/user-dashboard")
    return render_template("index.html")


@app.route("/user-dashboard")
def user_dashboard():
    if not session.get("username"):
        return redirect("/")
    if session.get("role") == "admin":
        return redirect("/admin-dashboard")
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

    return jsonify(success=False, message="Sai tài khoản hoặc mật khẩu")


@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")


@app.route("/api/me")
@login_required
def me():
    return jsonify(
        logged_in=True,
        username=session.get("username"),
        role=session.get("role", "user")
    )


# ================== ADMIN API ==================
@app.route("/api/admin/users")
@admin_required
def admin_users():
    users = [{
        "username": u["username"],
        "role": u.get("role", "user")
    } for u in load_users()]

    return jsonify(success=True, users=users)


@app.route("/api/admin/create-user", methods=["POST"])
@admin_required
def create_user():
    data = request.json or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    role = data.get("role", "user")

    if not username or not password:
        return jsonify(success=False, message="Thiếu username hoặc password")

    users = load_users()
    if any(u["username"] == username for u in users):
        return jsonify(success=False, message="Username đã tồn tại")

    users.append({
        "username": username,
        "password": password,
        "role": role
    })
    save_users(users)

    return jsonify(success=True)


# ❌ KHÔNG app.run khi deploy Render
# Gunicorn sẽ gọi app
if __name__ == "__main__":
    app.run()
