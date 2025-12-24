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
# Secret key dùng để mã hóa session (giữ đăng nhập)
app.secret_key = os.environ.get("sk-gttURQqGrEIovSGrsDfkD9Hw8H5REP3MQwQjPWGfZUqzo7vH")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USERS_FILE = os.path.join(BASE_DIR, "users.json")
RESOURCES_FILE = os.path.join(BASE_DIR, "resources.json")

# ================== DATA HELPERS ==================
def load_data(file_path):
    """Đọc dữ liệu từ file JSON"""
    if not os.path.exists(file_path):
        return []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_data(file_path, data):
    """Lưu dữ liệu vào file JSON"""
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

def ensure_initial_setup():
    """Tạo dữ liệu mặc định nếu file không tồn tại"""
    # 1. Tạo tài khoản admin mặc định
    users = load_data(USERS_FILE)
    if not users:
        save_data(USERS_FILE, [{"username": "admin", "password": "123"}])
    
    # 2. Tạo tài nguyên mẫu
    if not os.path.exists(RESOURCES_FILE):
        sample_res = [
            {
                "id": "1",
                "title": "Nhân vật Hắc Báo",
                "category": "tutien",
                "img_url": "https://i.ibb.co/bg3gMYKw/H-c-B-o-Nh-n.png",
                "file_url": "https://example.com/bear.fla",
                "description": "Nhân vật mẫu số 1"
            }
        ]
        save_data(RESOURCES_FILE, sample_res)

ensure_initial_setup()

# ================== AUTH GUARD ==================
def login_required(f):
    """Kiểm tra quyền truy cập: phải đăng nhập mới được xem ảnh/tải file"""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("username"):
            return jsonify(success=False, message="Vui lòng đăng nhập"), 401
        return f(*args, **kwargs)
    return decorated

# ================== ROUTES ==================
@app.route("/")
def home():
    """Trang chủ hiển thị danh sách tài nguyên"""
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
    """Kiểm tra trạng thái đăng nhập hiện tại"""
    return jsonify(
        logged_in=bool(session.get("username")),
        username=session.get("username")
    )

# ================== RESOURCE API ==================
@app.route("/api/resources")
def get_resources():
    return jsonify(load_data(RESOURCES_FILE))

# ================== MEDIA HANDLERS ==================

@app.route("/img_proxy")
@login_required
def img_proxy():
    """Proxy ảnh để bảo vệ link ảnh gốc"""
    img_url = request.args.get("url")
    if not img_url: return "Missing url", 400

    try:
        resp = requests.get(img_url, timeout=15)
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
    Xử lý tải file an toàn:
    Người dùng gọi /api/download/1 -> Server tìm link thật -> Tải về máy người dùng
    """
    resources = load_data(RESOURCES_FILE)
    
    # Tìm tài nguyên. Ép kiểu cả 2 về string để khớp tuyệt đối (id '1' == '1')
    item = next((x for x in resources if str(x["id"]) == str(res_id)), None)
    
    if not item:
        return "Tài nguyên không tồn tại trong hệ thống", 404

    try:
        # Flask đóng vai trò 'người trung gian' tải file
        file_resp = requests.get(item["file_url"], stream=True, timeout=60)
        
        # Stream_with_context giúp server không bị treo khi tải file dung lượng lớn
        def generate():
            for chunk in file_resp.iter_content(chunk_size=1024 * 8):
                if chunk:
                    yield chunk

        # Đặt tên file khi tải về là Title của tài nguyên (xóa khoảng trắng)
        filename = item.get("title", res_id).replace(" ", "_")
        
        return Response(
            stream_with_context(generate()),
            headers={
                "Content-Disposition": f"attachment; filename={filename}.fla",
                "Content-Type": "application/octet-stream"
            }
        )
    except Exception as e:
        return f"Lỗi kết nối tải file: {str(e)}", 500

# ================== RUN ==================
if __name__ == "__main__":
    # Host 0.0.0.0 để có thể truy cập từ mạng nội bộ nếu cần
    app.run(debug=True, host='0.0.0.0', port=5000)

