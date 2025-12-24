from flask import (
    Flask, request, jsonify, render_template,
    session, Response, stream_with_context, redirect
)
from functools import wraps
import json
import os
import requests

app = Flask(__name__)

# ================== CONFIG ==================
app.secret_key = "sk-gttURQqGrEIovSGrsDfkD9Hw8H5REP3MQwQjPWGfZUqzo7vH"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USERS_FILE = os.path.join(BASE_DIR, "users.json")
RESOURCES_FILE = os.path.join(BASE_DIR, "resources.json")

# ================== DATA HELPERS ==================
def load_data(file_path):
    if not os.path.exists(file_path):
        return []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_data(file_path, data):
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

def ensure_initial_setup():
    """Khởi tạo dữ liệu nếu file chưa tồn tại"""
    if not os.path.exists(USERS_FILE):
        sample_users = [
            {"username": "admin", "password": "123", "allowed_ids": "all"},
            {"username": "khach01", "password": "123", "allowed_ids": ["1"]}
        ]
        save_data(USERS_FILE, sample_users)
    
    if not os.path.exists(RESOURCES_FILE):
        # Bạn nên dán danh sách 6 nhân vật Google Drive của bạn vào đây
        save_data(RESOURCES_FILE, [])

ensure_initial_setup()

# ================== AUTH GUARD ==================
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("username"):
            return jsonify(success=False, message="Vui lòng đăng nhập"), 401
        return f(*args, **kwargs)
    return decorated

# ================== ROUTES ==================
@app.route("/")
def home():
    items = load_data(RESOURCES_FILE)
    return render_template("index.html", items=items)

# ================== AUTH API ==================
@app.route("/api/login", methods=["POST"])
def login():
    data = request.json or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    users = load_data(USERS_FILE)
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
    
    users = load_data(USERS_FILE)
    user = next((u for u in users if u["username"] == session["username"]), None)
    
    return jsonify(
        logged_in=True,
        username=session.get("username"),
        allowed_ids=user.get("allowed_ids", []) if user else []
    )

# ================== DOWNLOAD & PROXY ==================

@app.route("/img_proxy")
@login_required
def img_proxy():
    img_url = request.args.get("url")
    if not img_url: return "Missing url", 400
    try:
        # Tăng timeout và stream nội dung để nhanh hơn
        resp = requests.get(img_url, timeout=15, stream=True)
        return Response(resp.content, content_type=resp.headers.get("Content-Type", "image/jpeg"))
    except Exception as e:
        return str(e), 500

@app.route("/api/download/<res_id>")
@login_required
def download_file(res_id):
    # 1. Kiểm tra quyền sở hữu
    users = load_data(USERS_FILE)
    user = next((u for u in users if u["username"] == session["username"]), None)
    
    if not user:
        return "Lỗi xác thực người dùng", 403
    
    allowed = user.get("allowed_ids", [])
    if allowed != "all" and str(res_id) not in [str(i) for i in allowed]:
        return "Bạn không có quyền tải nhân vật này. Vui lòng liên hệ Admin!", 403

    # 2. Tìm tài nguyên
    resources = load_data(RESOURCES_FILE)
    item = next((x for x in resources if str(x["id"]) == str(res_id)), None)
    
    if not item:
        return "Tài nguyên không tồn tại", 404

    # 3. CHUYỂN HƯỚNG TẢI FILE (Tối ưu tốc độ)
    # Thay vì dùng requests.get(stream=True) làm server bị chậm, 
    # dùng redirect sẽ giúp máy khách tải trực tiếp từ Google Drive.
    return redirect(item["file_url"])

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)
