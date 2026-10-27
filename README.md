# Levana_Core

Dashboard ของ workspace Kesh (repo `i-rinkung/claude-dotfiles`) บน GitHub Pages อ่านข้อมูลสดทุกครั้งที่โหลด ไม่เก็บข้อมูลไว้ที่ไหน

- 5 หน้า: ภาพรวม, Issues, สถิติ, ไฟล์ (.md เลือก branch ได้), Agents
- ข้อมูลอ่านจาก GitHub REST API ด้วย token ที่ใส่ใน browser เท่านั้น (เก็บใน `localStorage` key `levana_token` ของเครื่องนั้น, ปุ่ม "ลบ token" ลบได้)
- repo นี้ public แต่ไม่มีข้อมูลหรือ token ในโค้ด คนที่ไม่มี token เห็นแค่ฟอร์มใส่ token
- ไม่มี build step: `index.html`, `app.js`, `style.css`, `parse.js` (copy จาก `claude-dotfiles/dashboard/src/parse.js`)

## ตั้งค่าครั้งแรก
1. Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save
2. สร้าง token: GitHub Settings → Developer settings → Fine-grained tokens → Repository access: Only `claude-dotfiles` → Permissions: **Contents: Read-only**, **Issues: Read-only**
3. เปิด `https://i-rinkung.github.io/Levana_Core/` แล้ววาง token

## Test
```
node --test "test/*.test.js"
```
test ที่อ่านไฟล์จริงจะใช้ `../claude-dotfiles` (หรือ `KESH_ROOT`) ถ้าไม่มีจะข้าม
