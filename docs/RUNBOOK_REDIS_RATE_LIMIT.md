# RUNBOOK VẬN HÀNH & XỬ LÝ SỰ CỐ: REDIS RATE LIMITING (FR-14)

> **Mã quy trình:** `SOP-SCANMS-OPS-014`  
> **Phạm vi áp dụng:** Hệ thống Chống Click Spam & Rate Limiting chuyển hướng tiếp thị (FR-14)  
> **Mục tiêu:** Đảm bảo độ sẵn sàng 99.99% cho luồng redirect khách hàng, ngăn chặn tool cày click ảo và xử lý kịp thời khi Redis gặp sự cố.

---

## 1. 🏛️ TỔNG QUAN KIẾN TRÚC & CƠ CHẾ HOẠT ĐỘNG

SCANMS triển khai cơ chế Rate Limiting phân tán 2 tầng sử dụng Redis In-Memory và thuật toán **Sliding Window Log (Sorted Set - ZSET)** nguyên tử qua Lua script:

```
[Khách hàng / Tool Click]
          │ (HTTP GET /r/:shortCode)
          ▼
   [Reverse Proxy / CDN] (Cloudflare / Nginx - Kiểm tra TRUSTED_PROXIES)
          │
          ▼
   [SCANMS Backend (NestJS)]
          │
          ├─► [Redis Cluster/Standalone (Primary)]
          │     └─ Lua Script: ZREMRANGEBYSCORE + ZCARD + ZADD + EXPIRE (Atomic)
          │        - Cửa sổ giây: Tối đa 10 clicks / giây / IP (rl:v1:click:sec:{ipHash})
          │        - Cửa sổ phút: Tối đa 60 clicks / phút / IP (rl:v1:click:min:{ipHash})
          │
          └─► [Fallback Memory Buffer (Secondary - Khi Redis Degraded)]
                └─ Sliding Window Map cục bộ giới hạn tối đa 10,000 entries (Chống tràn RAM)
```

### 1.1 Nguyên tắc thiết kế cốt lõi
1. **Zero Downtime cho khách thật:** Nếu Redis mất kết nối hoặc timeout quá `20ms`, hệ thống tự động suy thoái (`Degraded Fallback`) sang RAM cục bộ mà **KHÔNG BAO GIỜ** làm gián đoạn chuyển hướng HTTP 302 của khách hàng.
2. **Không ghi đè dữ liệu khi vi phạm:** Click vượt ngưỡng rate limit vẫn chuyển hướng 302 đến sản phẩm đích nhưng **bị tước cookie attribution (`scanms_attr`)**, không tính hoa hồng và không ghi nhận lượt click hợp lệ.
3. **Bảo mật danh tính IP:** Mọi IP được băm HMAC SHA-256 (`ipHash`) trước khi lưu vào Redis hoặc gửi ra monitoring; tuyệt đối không để lộ IP thô.

---

## 2. 📊 CHỈ SỐ GIÁM SÁT (MONITORING METRICS)

Hệ thống cung cấp 2 cổng giám sát thời gian thực:
- **Public Health Endpoint:** `GET /api/referral-links/rate-limit/health` (hoặc `/r/rate-limit/health`)
- **Admin Dashboard Realtime:** `GET /api/admin/referral-links/rate-limit/dashboard` (Yêu cầu quyền `SYSTEM_ADMIN`)

### Bảng định nghĩa các chỉ số giám sát:

| Chỉ số (Metric Field) | Ý nghĩa | Ngưỡng an toàn | Mức độ nghiêm trọng khi vượt |
| :--- | :--- | :--- | :--- |
| `status` | Trạng thái hoạt động (`ok` hoặc `degraded`) | `ok` | **CRITICAL** nếu `degraded` |
| `backend` | Backend đang xử lý (`redis` hoặc `in_memory_fallback`) | `redis` | **HIGH** nếu chuyển sang fallback |
| `redisMetrics.redisLatencyMs` | Độ trễ xử lý lệnh Redis (ms) | `< 20ms` | **WARNING** nếu `> 50ms` |
| `redisMetrics.redisErrorCount` | Số lỗi kết nối / thực thi Redis | `0` | **HIGH** nếu tăng liên tục |
| `redisMetrics.redisTimeoutCount` | Số lần lệnh kiểm tra vượt quá timeout (20ms) | `0` | **WARNING** nếu `> 5 lần/phút` |
| `metrics.uniqueBlockedIpsCount` | Số địa chỉ IP duy nhất đã bị chặn rate limit | Tùy biến | Theo dõi đợt tấn công Botnet |
| `metrics.blockedRatioPercent` | Tỷ lệ % click bị chặn trên tổng click | `< 5.0%` | **WARNING** nếu `> 20.0%` |
| `metrics.isBlockedRateHigh` | Cờ cảnh báo tỷ lệ chặn bất thường | `false` | **HIGH** nếu `true` |
| `spikes.topLinks` | Top 5 referral link có lưu lượng click đột biến cao nhất | Bình thường | Kiểm tra nghi vấn spam link cụ thể |
| `spikes.topStores` | Top 5 gian hàng có lưu lượng click đột biến cao nhất | Bình thường | Phát hiện gian lận gian hàng |

---

## 3. 🚨 MA TRẬN CẢNH BÁO (ALERT MATRIX & SEVERITY)

### 🔴 Cảnh báo 1: `REDIS_DEGRADED` (Mức độ: CRITICAL)
- **Điều kiện kích hoạt:** `status === 'degraded'` hoặc `isRedisActive === false`.
- **Hệ quả:** Hệ thống tự chuyển sang bộ đếm RAM cục bộ. Nếu hệ thống chạy nhiều Pod/Instance, hạn mức rate limit sẽ không được đồng bộ giữa các node, kẻ xấu có thể chia tải để né giới hạn.
- **Hành động ngay:** Kiểm tra tiến trình Redis, bộ nhớ server, kết nối mạng giữa Backend và Redis.

### 🟡 Cảnh báo 2: `REDIS_HIGH_LATENCY_OR_TIMEOUT` (Mức độ: WARNING)
- **Điều kiện kích hoạt:** `redisLatencyMs > 50ms` hoặc `redisTimeoutCount > 10`.
- **Hệ quả:** Request có thể bị chậm lại tới cận ngưỡng timeout (20ms) trước khi rơi vào fallback.
- **Hành động ngay:** Kiểm tra lệnh Redis chậm (Slowlog), tải CPU máy chủ Redis, hoặc số lượng kết nối đồng thời.

### 🟠 Cảnh báo 3: `CLICK_SPAM_ANOMALY_SPIKE` (Mức độ: HIGH)
- **Điều kiện kích hoạt:** `metrics.isBlockedRateHigh === true` (Tỷ lệ chặn click vượt quá 20% khi tổng số request >= 20).
- **Hệ quả:** Nền tảng đang bị tấn công cày click ảo (DDoS / Click Fraud).
- **Hành động ngay:** Tra cứu `uniqueBlockedIpsCount` và các link thuộc `spikes.topLinks`. Nếu phát hiện dải IP độc hại, tiến hành chặn tại lớp Cloudflare / WAF / Nginx.

---

## 4. 🛠️ QUY TRÌNH XỬ LÝ SỰ CỐ (STANDARD OPERATING PROCEDURES)

### 📋 KỊCH BẢN A: REDIS BỊ CRASH HOẶC DISCONNECT
1. **Xác nhận sự cố:**
   - Kiểm tra API Health: `curl http://localhost:3000/api/referral-links/rate-limit/health`
   - Quan sát log backend: Tìm chuỗi `[OPERATIONAL ALERT - REDIS DEGRADED]`.
2. **Kiểm tra dịch vụ Redis:**
   - Trên Linux/Docker:
     ```bash
     docker ps | grep redis
     systemctl status redis-server
     ```
   - Trên Windows Server:
     ```powershell
     Get-Process redis-server -ErrorAction SilentlyContinue
     ```
3. **Khởi động lại Redis:**
   - Nếu dùng Docker: `docker restart scanms-redis`
   - Nếu dùng Systemd: `systemctl restart redis-server`
   - Nếu chạy process trực tiếp: Khởi động lại service qua service manager.
4. **Kiểm tra tự phục hồi (Auto-Recovery):**
   - Backend SCANMS có cơ chế tự động kết nối lại (`retryStrategy`). Ngay khi Redis online, log backend sẽ ghi:
     `✔ [OPERATIONAL RECOVERY] Kết nối Redis rate limiting đã được khôi phục.`
   - Kiểm tra lại Health API đảm bảo `status: "ok"`, `isDegraded: false`.

---

### 📋 KỊCH BẢN B: REDIS CHẬM, ĐẦY BỘ NHỚ (OOM) HOẶC TIMEOUT
1. **Kiểm tra dung lượng RAM sử dụng của Redis:**
   ```bash
   redis-cli info memory
   ```
   - Xem trường `used_memory_human` và `maxmemory_human`.
2. **Kiểm tra chính sách giải phóng bộ nhớ (Eviction Policy):**
   - Đảm bảo cấu hình `maxmemory-policy` trong `redis.conf` là:
     ```conf
     maxmemory-policy volatile-lru
     ```
   - Điều này đảm bảo khi đầy bộ nhớ, Redis tự động giải phóng các Sorted Set rate limit cũ mà không gây crash server.
3. **Kiểm tra lệnh chạy chậm (Slowlog):**
   ```bash
   redis-cli slowlog get 10
   ```
4. **Dọn dẹp key hết hạn nếu cần thiết:**
   ```bash
   redis-cli scan 0 match "rl:v1:click:*" count 1000
   ```

---

### 📋 KỊCH BẢN C: PHÁT HIỆN TẤN CÔNG CLICK SPAM / BOTNET
1. **Phân tích đối tượng tấn công:**
   - Gọi endpoint Dashboard:
     ```bash
     curl -H "Authorization: Bearer <ADMIN_JWT>" http://localhost:3000/api/admin/referral-links/rate-limit/dashboard
     ```
   - Xác định `spikes.topLinks` và `uniqueBlockedIpsCount`.
2. **Kiểm tra nhật ký sự kiện kiểm toán:**
   - Gọi API: `GET /api/admin/referral-links/tracking/events?isValid=false`
   - Lấy danh sách `maskedIp` và tần suất truy cập bất thường.
3. **Chặn tại biên (Edge Mitigation):**
   - Thêm IP hoặc dải ASN vào Firewall Cloudflare / Nginx:
     ```nginx
     deny 203.0.113.50;
     ```
   - Bật Cloudflare Under Attack Mode hoặc Challenge (Managed Challenge / Turnstile) trên route `/r/*` nếu lưu lượng tấn công vượt quá 5,000 req/s.
4. **Khóa tạm thời Referral Link bị cày click:**
   - Quản trị viên sử dụng API `PATCH /api/admin/referral-links/:id/block` với lý do `ABNORMAL_CLICK_SPAM_DETECTED`.

---

## 5. 🔍 BỘ LỆNH CHUẨN ĐOÁN NHANH (QUICK DIAGNOSTIC CHEATSHEET)

```bash
# 1. Kiểm tra ping và latency tức thời
redis-cli --latency -h 127.0.0.1 -p 6379

# 2. Kiểm tra thông tin bộ nhớ và số lượng client đang kết nối
redis-cli info stats
redis-cli info clients

# 3. Đếm số lượng key rate limit đang hoạt động
redis-cli dbsize

# 4. Giám sát luồng lệnh thời gian thực (Lưu ý: Chỉ chạy trong môi trường dev hoặc triage khẩn cấp)
redis-cli monitor

# 5. Kiểm tra hàng đợi Click Queue (FR-13 / FR-14)
redis-cli llen scanms:click_queue:pending
redis-cli zcard scanms:click_queue:processing_zset
redis-cli llen scanms:click_queue:dlq
```

---

## 6. 📝 THÔNG TIN LIÊN HỆ & ESCALATION

| Vai trò | Người phụ trách | Trách nhiệm |
| :--- | :--- | :--- |
| **Team Leader & Tech Lead** | Nguyễn Thành Thắng | Kiến trúc hệ thống, xử lý sự cố Backend & DB |
| **DevOps / Infrastructure** | Quản trị viên hạ tầng SCANMS | Hạ tầng Redis, Reverse Proxy, Firewall WAF |
| **Tài liệu tham chiếu** | `docs/FR-14_CHONG_CLICK_SPAM_REDIS_RATE_LIMIT_DUYET_NGHIEP_VU.txt` | Đặc tả nghiệp vụ đã duyệt |
