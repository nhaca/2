from flask import (
    Flask, request, jsonify, render_template,
    session, Response, stream_with_context
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
    # Tạo tài khoản mặc định
    users = load_data(USERS_FILE)
    if not users:
        save_data(USERS_FILE, [{"username": "admin", "password": "123"}])
    
    # Tạo dữ liệu mẫu nếu chưa có tài nguyên
    if not os.path.exists(RESOURCES_FILE):
        sample_res = [
            {
                "id": "res_001",
                "title": "Nhân vật Gấu Trúc 3D",
                "category": "nhanvat",
                "img_url": "https://example.com/bear.jpg",
                "file_url": "https://example.com/bear.fla",
                "description": "Model 3D đầy đủ Rigging."
            }
        ]
        save_data(RESOURCES_FILE, sample_res)

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
    # Load tài nguyên để render trực tiếp nếu cần (hoặc dùng API riêng)
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
    return jsonify(
        logged_in=bool(session.get("username")),
        username=session.get("username")
    )

# ================== RESOURCE API ==================
@app.route("/api/resources")
def get_resources():
    return jsonify(load_data(RESOURCES_FILE))

# ================== DOWNLOAD & PROXY ==================

@app.route("/img_proxy")
@login_required
def img_proxy():
    img_url = request.args.get("url")
    if not img_url: return "Missing url", 400

    try:
        resp = requests.get(img_url, timeout=10)
        return Response(
            resp.content,
            content_type=resp.headers.get("Content-Type", "image/jpeg")
        )
    except Exception as e:
        return str(e), 500

@app.route("/api/download/<res_id>")
@login_required
def download_file(res_id):
    """
    Tải file an toàn bằng cách lấy link từ server thay vì lộ link ở Front-end
    """
    resources = load_data(RESOURCES_FILE)
    item = next((x for x in resources if x["id"] == res_id), None)
    
    if not item:
        return "Tài nguyên không tồn tại", 404

    try:
        # Proxy file để ẩn link gốc (stream để tránh tốn RAM server)
        file_resp = requests.get(item["file_url"], stream=True, timeout=30)
        
        def generate():
            for chunk in file_resp.iter_content(chunk_size=8192):
                yield chunk

        return Response(
            stream_with_context(generate()),
            headers={
                "Content-Disposition": f"attachment; filename={res_id}.fla",
                "Content-Type": "application/octet-stream"
            }
        )
    except Exception as e:
        return f"Lỗi: {str(e)}", 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
