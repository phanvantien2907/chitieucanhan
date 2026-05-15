# Luồng Terraform + CI/CD của dự án

## Tổng quan: 2 workflow độc lập

Dự án có **2 file workflow GitHub Actions hoàn toàn tách biệt**, mỗi cái phục vụ một mục đích khác nhau:

| File | Mục đích | Khi nào chạy |
|---|---|---|
| `terraform.yml` | Tạo/hủy hạ tầng AWS (EC2, EIP, Security Group) | **Thủ công** — bạn bấm nút trên GitHub |
| `ci-cd.yml` | Build Docker → SCP lên server → SSH chạy | **Tự động** khi push lên `main` hoặc `develop` |

---

## 📌 Phần 1: Terraform — Khởi tạo hạ tầng

### Terraform chạy ở đâu?

> **GitHub Actions chạy Terraform, KHÔNG phải local.**

File `terraform.yml` dùng `workflow_dispatch` — tức là bạn **bấm tay trên GitHub UI**, không cần push code.

### Terraform tạo ra gì?

Từ `main.tf`, Terraform sẽ tạo trên AWS:
- 1 **Security Group** — mở cổng 22 (SSH), 80 (HTTP), 443 (HTTPS)
- 1 **EC2 instance** — Ubuntu 26.04 LTS, t3.micro, 20GB gp3
- 1 **Elastic IP (EIP)** — IP tĩnh gắn vào EC2 (IP này sẽ không đổi khi restart)
- Khi EC2 khởi động lần đầu, `user_data.sh` tự cài: **Docker** + **Git**

---

## 🔄 Luồng đầy đủ: Lần đầu khởi tạo + Deploy

### Giai đoạn 1 — Chuẩn bị (làm 1 lần duy nhất)

> **Làm trên local, không cần push code**

**Bước 1**: Tạo SSH key pair trên AWS Console (hoặc đã có rồi)
- Tên key: `do-an-cloud-key-v3-tf` (đã hardcode trong `main.tf`)
- Download file `.pem` về máy, giữ kỹ

**Bước 2**: Thêm các **GitHub Secrets** vào repo (Settings → Secrets → Actions):

```
AWS_ACCESS_KEY_ID        ← AWS IAM key
AWS_SECRET_ACCESS_KEY    ← AWS IAM secret
TF_SSH_PUBLIC_KEY        ← nội dung file .pub của key pair
SSH_KEY                  ← nội dung file .pem (private key) để CI/CD SSH vào server
PROD_HOST                ← IP của EC2 (điền SAU khi Terraform apply xong)
FIREBASE_API_KEY         ← ...
FIREBASE_AUTH_DOMAIN     ← ...
FIREBASE_PROJECT_ID      ← ...
FIREBASE_STORAGE_BUCKET  ← ...
FIREBASE_MESSAGING_SENDER_ID ← ...
FIREBASE_APP_ID          ← ...
```

---

### Giai đoạn 2 — Khởi tạo hạ tầng (Terraform)

> **Làm trên GitHub UI, không cần push code**

1. Vào GitHub repo → tab **Actions**
2. Chọn workflow **"Terraform Infrastructure"** ở sidebar trái
3. Bấm **"Run workflow"** → chọn action = **`plan`** trước → bấm Run
4. Đợi xem output, nếu ổn thì **Run workflow** lần nữa → chọn **`apply`**
5. Sau khi apply xong, **đọc log** của step `"Lưu EC2 IP vào GitHub Secrets"`:
   ```
   ==========================================
   EC2 Public IP: 13.xxx.xxx.xxx
   Hãy copy IP trên vào GitHub Secret: EC2_HOST
   ==========================================
   ```
6. Copy IP đó → vào GitHub Secrets → tạo secret `PROD_HOST` = IP vừa copy

> ⚠️ **Đây là bước thủ công** — workflow nhắc bạn tự copy IP vào Secret. Code chưa tự động hóa bước này.

---

### Giai đoạn 3 — Deploy app (CI/CD)

> **Tự động khi bạn push code lên `main`**

```
git push origin main
        ↓
GitHub Actions chạy ci-cd.yml
        ↓
[Job: build]
  → docker build (nhúng Firebase env vào lúc build)
  → docker save → app.tar
  → upload artifact lên GitHub
        ↓
[Job: deploy-main] (chỉ chạy khi branch = main)
  → download app.tar
  → SCP copy app.tar lên /home/ubuntu/ trên EC2
  → SSH vào EC2:
      docker load < app.tar
      docker stop app || true
      docker rm app   || true
      docker run -d -p 3000:3000 --name app --restart unless-stopped my-nextjs-app:latest
```

App chạy trên port **3000** của EC2.

---

## 📊 Sơ đồ luồng tổng hợp

```
LẦN ĐẦU (setup 1 lần):
┌─────────────────────────────────────────────────────────────┐
│  LOCAL                                                       │
│  1. Tạo SSH key pair trên AWS Console                        │
│  2. Thêm tất cả Secrets vào GitHub repo                      │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  GITHUB ACTIONS (bấm tay - không cần push code)             │
│  Workflow: terraform.yml                                     │
│  Chọn action = plan → xem output → chọn apply               │
│  → Tạo EC2 + EIP + Security Group trên AWS                  │
│  → In ra IP của EC2                                          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  LOCAL (thủ công 1 lần)                                      │
│  Copy IP từ log → thêm vào GitHub Secret: PROD_HOST          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
DEPLOY (mỗi lần có thay đổi code):
┌─────────────────────────────────────────────────────────────┐
│  git push origin main                                        │
│        ↓                                                     │
│  GitHub Actions tự động chạy ci-cd.yml                      │
│        ↓                                                     │
│  Build Docker image → Đóng gói app.tar                      │
│        ↓                                                     │
│  SCP copy app.tar lên EC2                                    │
│        ↓                                                     │
│  SSH vào EC2 → docker load → docker run                      │
│        ↓                                                     │
│  App chạy tại: http://<PROD_HOST>:3000                       │
└─────────────────────────────────────────────────────────────┘
```

---

## ❓ Câu hỏi thường gặp

### Terraform có chạy mỗi lần push code không?
**Không.** `terraform.yml` dùng `workflow_dispatch` — chỉ chạy khi bạn **bấm tay trên GitHub**. Push code không trigger Terraform.

### Tôi có cần chạy `terraform init` trên local không?
**Không bắt buộc.** GitHub Actions tự `terraform init` trong workflow. Bạn chỉ cần chạy local nếu muốn test/debug Terraform trước.

### Nếu EC2 bị xóa và tôi muốn tạo lại?
Vào GitHub Actions → "Terraform Infrastructure" → Run workflow → chọn `apply`. EC2 mới sẽ được tạo, lấy IP mới, cập nhật lại Secret `PROD_HOST`.

### Tôi muốn destroy hạ tầng?
Vào GitHub Actions → "Terraform Infrastructure" → Run workflow → chọn `destroy`.

> ⚠️ **Vấn đề hiện tại**: Workflow `destroy` chưa được implement trong file `terraform.yml` — chỉ có `plan` và `apply`, không có step `terraform destroy`. Cần thêm vào nếu muốn dùng.

---

## ⚠️ Điểm cần lưu ý trong code hiện tại

1. **`terraform.tfstate` đang commit lên git** — File này chứa thông tin hạ tầng nhạy cảm. Nên dùng **S3 backend** để lưu state thay vì commit vào repo.

2. **IP SSH mở cho toàn thế giới** — `allowed_ssh_ip = "0.0.0.0/0"` trong `variables.tf`. Nên đổi thành IP cố định của bạn.

3. **EC2 IP chưa tự cập nhật vào Secret** — Sau khi `apply`, bạn phải thủ công copy IP vào `PROD_HOST`. Có thể tự động hóa bằng GitHub CLI (`gh secret set`).

4. **Chưa có Nginx/reverse proxy** — App đang chạy thẳng port 3000, chưa có HTTPS/domain.
