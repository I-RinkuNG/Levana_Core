# Levana_Core

Dashboard ของ workspace Kesh (repo `i-rinkung/claude-dotfiles`) บน GitHub Pages อ่านข้อมูลสดทุกครั้งที่โหลด ไม่เก็บข้อมูลไว้ที่ไหน

- 6 หน้า: **วันนี้** (`#today` หน้าแรก: KPI token 5h / issues / runs / ตีกลับ, token ต่อ agent, อัตราตีกลับต่อ agent, ค้นหา + กรอง All/Open/Rejected ฝั่ง client), ภาพรวม, Issues, สถิติ, ไฟล์ (.md เลือก branch ได้), Agents
- token 5h: 1% = 15,000 token (100% = 1,500,000) รวมจากช่อง tokens ของ run ที่ชื่อไฟล์ขึ้นต้นด้วยวันนี้
- ธีม: MIX อย่างเดียว (token ใน `style.css`, ต้นฉบับ/ธีมอื่นอยู่ใน `design/`) ปุ่ม DARK/LIGHT มุมขวาบน เริ่มตาม `prefers-color-scheme` แล้วจำใน `localStorage` key `lv-mode`
- เตือน token หมดอายุ: อ่าน header `github-authentication-token-expiration` ถ้าเหลือ <= 7 วันแสดงแถบเตือน; ไม่มี header = ไม่แสดง **หมายเหตุ:** GitHub ไม่ใส่ header นี้ใน `Access-Control-Expose-Headers` เบราว์เซอร์จากโดเมน github.io จึงอาจอ่านไม่ได้ (แถบเตือนจึงอาจไม่ขึ้นจริง)
- ข้อมูลอ่านจาก GitHub REST API ด้วย token ที่ใส่ใน browser เท่านั้น (เก็บใน `localStorage` key `levana_token` ของเครื่องนั้น, ปุ่ม "ลบ token" ลบได้)
- repo นี้ public แต่ไม่มีข้อมูลหรือ token ในโค้ด คนที่ไม่มี token เห็นแค่ฟอร์มใส่ token
- ไม่มี build step: `index.html`, `app.js`, `style.css`, `logic.js` (pure function), `parse.js` (copy จาก `claude-dotfiles/dashboard/src/parse.js`)

## ตั้งค่าครั้งแรก
1. Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save
2. สร้าง token: GitHub Settings → Developer settings → Fine-grained tokens → Repository access: Only `claude-dotfiles` → Permissions: **Contents: Read-only**, **Issues: Read-only**
3. เปิด `https://i-rinkung.github.io/Levana_Core/` แล้ววาง token

## Test
```
node --test "test/*.test.js"
```
test ที่อ่านไฟล์จริงจะใช้ `../claude-dotfiles` (หรือ `KESH_ROOT`) ถ้าไม่มีจะข้าม
