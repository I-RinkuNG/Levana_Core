# Levana_Core

Dashboard ของ workspace Kesh (repo `i-rinkung/claude-dotfiles`) บน GitHub Pages อ่านข้อมูลสดทุกครั้งที่โหลด ไม่เก็บข้อมูลไว้ที่ไหน

- v3: 6 หน้า (hash): `#/` สรุป, `#/runs`, `#/run/<id>`, `#/issues`, `#/issue/<n>`, `#/agents`, `#/files[/<path>][?view=graph&gm=a|b]`, `#/log` ลิงก์เก่า (`#today`, `#usage`, `#lessons[/x]`, `#errors`, `#more`) redirect ให้เอง
- USAGE 5 ชม. มาจาก `rate_limits.five_hour` ของ statusline ผ่านไฟล์ `usage.json` บน branch `levana-usage` (ไม่มีการแปลง token เป็น %) เก่าเกิน 15 นาที (`USAGE_STALE_MS` ใน `logic.js`) หรือเลยเวลารีเซ็ต = "ข้อมูลเก่า" ถ้าไม่มีไฟล์ = "ยังไม่มีค่า"
- สถานะ run: `เสร็จ` / `กำลังทำ` + ป้าย `มีงานค้างต่อ` แยก (ไฟล์ `_*.md` และเอกสารที่ไม่มี handoff ไม่นับเป็น run)
- ตีกลับ > 20% = สีแดง + ไอคอน + ข้อความ
- Files: ต้นไม้ไฟล์ (git trees API) + เอกสาร + กราฟความเชื่อมโยง (force-graph 1.52.0 ตรึงใน `vendor/` มี `SHA256SUMS`) + ปุ่มแปล EN/TH บนเครื่อง (Translator API เฉพาะ Chrome/Edge เดสก์ท็อป ซ่อนที่อื่น) Lessons รวมอยู่ใน `lessons/`
- Log: บันทึกเหตุการณ์ (ไม่เก็บ token/เนื้อไฟล์) ที่ `localStorage` และส่งต่อไป Supabase ถ้าตั้ง `config.js` (ว่าง = เก็บในเครื่องเท่านั้น)
- ธีม: design v3 (`design/v3/`) ปุ่มล่างซ้ายของเมนู เริ่มตาม `prefers-color-scheme` แล้วจำใน `localStorage` key `lvn-mode`
- ข้อมูลอ่านจาก GitHub GraphQL/REST ด้วย token ที่ใส่ใน browser เท่านั้น (`localStorage` key `levana_token`) issue แบ่งหน้าได้สูงสุด 10 หน้า (history แสดง 10 commit ล่าสุดเท่านั้น)
- repo นี้ public แต่ไม่มีข้อมูลหรือ token ในโค้ด คนที่ไม่มี token เห็นแค่ฟอร์มใส่ token พร้อมลิงก์ `get token`
- ไม่มี build step: `index.html`, `app.js` (router/shell/drawer), `api.js`, `ui.js`, `translate.js`, `logbus.js`, `config.js`, `views/*.js`, `style.css`, `logic.js` (pure), `parse.js`, ฟอนต์ใน `fonts/` และ `vendor/` (marked, DOMPurify, force-graph โหลดแบบ lazy)

## usage.json (statusline)
ใน claude-dotfiles: `scripts/statusline.py` (ตั้งเป็น `statusLine` ใน `~/.claude/settings.json` ของเครื่อง PC: `"statusLine": {"type":"command","command":"python C:/Users/<you>/.claude/scripts/statusline.py"}`) เขียน `~/.claude/state/usage.json` และเรียก `scripts/push_usage.py` (ต้องมี `gh auth login` สิทธิ์ repo) ส่งขึ้น branch `levana-usage` ประมาณทุก 5 นาที ไม่แตะ `main`

## ตั้งค่า Supabase (ทำครั้งเดียว, Rin)
1. สร้างโปรเจกต์ Supabase (ฟรี) คัดลอก Project URL และ publishable key (`sb_publishable_...`) ใส่ `config.js` (`supabaseUrl`, `supabaseKey`) ทั้งคู่เป็น public โดยออกแบบ ข้อมูลป้องกันด้วย RLS
2. SQL editor รัน:
```sql
create table public.levana_log (
  id bigint generated always as identity primary key,
  ts timestamptz not null,
  received_at timestamptz not null default now(),
  level text not null check (level in ('debug','info','warn','error')),
  event text not null check (char_length(event) <= 64),
  route text check (char_length(route) <= 200),
  device jsonb,
  tz text check (char_length(tz) <= 64),
  message text check (char_length(message) <= 2000),
  detail jsonb check (pg_column_size(detail) <= 8192),
  session_id text check (char_length(session_id) <= 40),
  app_version text check (char_length(app_version) <= 40)
);
create index levana_log_ts on public.levana_log (ts desc);
alter table public.levana_log enable row level security;
revoke all on public.levana_log from anon, authenticated;
grant insert on public.levana_log to anon, authenticated;
grant select on public.levana_log to authenticated;
create policy log_insert on public.levana_log for insert to anon, authenticated with check (true);
create policy log_read_rin on public.levana_log for select to authenticated
  using (auth.uid() = '<RIN_USER_ID>'::uuid);
```
3. Auth → Users → เพิ่ม/ส่ง magic link ให้อีเมลของ Rin คัดลอก user id ใส่ `<RIN_USER_ID>` แล้วรัน policy ซ้ำ จากนั้นปิด new sign-ups และเพิ่ม URL ของ Pages ใน Redirect URLs
4. เปิดหน้า Log อย่างน้อยสัปดาห์ละครั้ง ไม่งั้นโปรเจกต์ฟรีถูกพักหลังไม่มีการใช้งาน 7 วัน

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
node e2e/smoke.js        # ทุกหน้า x 390/1440 x light/dark + states + graph, mock GitHub/Supabase, screenshot -> design/v3/build-shots/ (ไม่เขียนลง design/v2 หรือ design/shots)
node e2e/behaviours.js   # drawer, redirects, usage states, runs filter, files tree/graph/translate, log queue
```
