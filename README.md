# Levana_Core

Dashboard ของ workspace Kesh (repo `i-rinkung/claude-dotfiles`) บน GitHub Pages อ่านข้อมูลสดทุกครั้งที่โหลด ไม่เก็บข้อมูลไว้ที่ไหน

- 11 route (hash): `#today` (หน้าแรก), `#runs`, `#run/<run_id>`, `#issues`, `#issue/<n>`, `#agents`, `#usage`, `#lessons`, `#files`, `#errors`, `#more` (มือถือ) Runs / Issues / Lessons ค้นหาแยกกัน ไม่มีค้นหารวม
- token 5h: 1% = 15,000 token (100% = 1,500,000) เวลาเริ่ม/รีเซ็ตของหน้าต่าง 5 ชม. **ประมาณ** (run log มีแต่วันที่ ไม่มีเวลา) ส่วน "จองให้ <agent>" = ค่าเฉลี่ย token ของ 10 handoff ล่าสุดของ agent ถัดไปใน run ที่ยังเดินอยู่
- ตีกลับ > 20% = สีแดง + ไอคอน + ข้อความ (สีประจำตัว agent ใช้เฉพาะการ์ด)
- สถานะ token: แถบ "GITHUB TOKEN API" แสดง ใช้ได้/ใช้ไม่ได้ + เวลาตรวจล่าสุด + ปุ่มตรวจอีกครั้ง (ไม่แสดงวันหมดอายุ)
- ธีม: design D4 (`design/v2/d4/`) token ใน `style.css` ปุ่มมุมขวาบน เริ่มตาม `prefers-color-scheme` แล้วจำใน `localStorage` key `lvn-mode`
- ข้อมูลอ่านจาก GitHub GraphQL/REST ด้วย token ที่ใส่ใน browser เท่านั้น (เก็บใน `localStorage` key `levana_token` ของเครื่องนั้น, ปุ่ม "ลบ token" อยู่ที่หน้า เพิ่มเติม)
- repo นี้ public แต่ไม่มีข้อมูลหรือ token ในโค้ด คนที่ไม่มี token เห็นแค่ฟอร์มใส่ token
- ไม่มี build step: `index.html`, `app.js` (router/shell), `api.js` (fetch + apiStatus), `ui.js` (components), `views/*.js`, `style.css`, `logic.js` (pure function), `parse.js`, ฟอนต์ WOFF2 ใน `fonts/` (OFL) และ `vendor/` (marked, DOMPurify, ตรึงเวอร์ชันเดิม)

## ตั้งค่าครั้งแรก
1. Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save
2. สร้าง token: GitHub Settings → Developer settings → Fine-grained tokens → Repository access: Only `claude-dotfiles` → Permissions: **Contents: Read-only**, **Issues: Read-only**
3. เปิด `https://i-rinkung.github.io/Levana_Core/` แล้ววาง token

## Test
```
node --test "test/*.test.js"
```
test ที่อ่านไฟล์จริงจะใช้ `../claude-dotfiles` (หรือ `KESH_ROOT`) ถ้าไม่มีจะข้าม

## E2E (dev only, ไม่ขึ้น Pages)
ต้องมี Playwright แบบ global (`NODE_PATH=$(npm root -g)`):
```
node e2e/smoke.js        # ทุกหน้า x 390/1440 x light/dark, mock GraphQL, screenshot -> design/v2/build-shots/
node e2e/behaviours.js   # พฤติกรรม: CHECK toggle, 401, 502 + banner, empty, recheck, theme
```
