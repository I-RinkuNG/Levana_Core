# Levana_Core Design System

3 ธีม x 2 โหมด, token ชุดเดียว. ได้แรงบันดาลใจจากเกม (สี/รูปร่างเท่านั้น) ไม่ใช้ asset, โลโก้, ฟอนต์ของเกม.
ไฟล์: `tokens.css` (ค่า) · `mockup.html` (หน้า Today ตัวอย่าง) · `shots/` (ภาพ 1280px x6, 400px x3)

## หลักคิด
- **HUD เรียบ**: มุมตัดเฉียง + bracket + แถบหัว + label mono ตัวเล็ก; ไม่มี glow แรง ไม่มี scanline
- **Token ตั้งชื่อตามหน้าที่** (แบบ Primer fg/bg/border) ไม่ตั้งตามสี; ธีมเปลี่ยนแค่ค่า ไม่เปลี่ยนชื่อ (แบบ Carbon)
- **Carbon dashboard**: ตัวเลขสำคัญไว้บนสุด (alert > KPI > กราฟ/รายการ), สีเดิมตลอด, จำกัด KPI 4 ใบ
- **Hierarchy ด้วยพื้นผิว** (`--bg` < `--surface` < `--surface-2`) ไม่ใช้ shadow
- Mobile-first: 1 คอลัมน์; >=1024px เป็น 2 คอลัมน์ (3fr / 2fr); density กลาง (แถว ~44px)
- Motion: `--dur:140ms` เฉพาะ hover/สี; `prefers-reduced-motion` ตั้งเป็น 0
- ห้ามใช้สีอย่างเดียวสื่อความ: tag มีข้อความ, bar มีตัวเลข %

## Token (ใช้ร่วมกันทุกธีม)
| token | หน้าที่ |
|---|---|
| `--bg` | พื้นหลังหน้า |
| `--surface` / `--surface-2` | การ์ด / แถบหัว, hover, ราง bar |
| `--fg` / `--fg-muted` | ตัวอักษรหลัก / รอง, label |
| `--border` / `--border-strong` | เส้นแบ่งบาง / กรอบ HUD, input, ปุ่ม |
| `--accent` / `--accent-fg` | สีหลัก (ลิงก์, bar, active) / ตัวอักษรบนพื้น accent |
| `--accent-2` | สีรอง (ตัวเลือก ใช้กับ chart series ที่ 2) |
| `--danger` `--warn` `--ok` | สถานะ (ใช้เป็นตัวอักษรได้บน `--surface`) |
| `--focus` | focus ring 2px |
| `--font-ui` `--font-mono` `--font-display` | ฟอนต์ |
| `--cut` | ขนาดมุมตัด (ตามธีม) |
| `--radius` | มุมโค้งของ element เล็ก (0-2px) |
| `--label-tracking` | ระยะอักษร label mono |
| `--space-1..6` `--text-xs..xl` `--dur` `--bw` | spacing 4/8/12/16/24/32, ตัวอักษร 11/13/15/18/28, motion, ความหนาเส้น |

ใช้: `<html data-theme="ark|czn|mix" data-mode="light|dark">`

## ธีม
| ธีม | mood | สีหลัก (dark / light) | cut | display font |
|---|---|---|---|---|
| `ark` | tactical ขาว/ดำ/เทา เส้นบาง | accent ฟ้า #4cc3ff / #0a62a8, รอง เหลือง #f2c744 / #7a5a00 | 10px | Plex Thai |
| `czn` | gothic มืด ม่วง+แดงเข้ม | ม่วง #b98cff / #6a2bb0, รอง แดง #ff6b83 / #a01630 | 14px | Noto Serif Thai |
| `mix` | เทากราไฟต์แบบ Ark + สัญญาณเหลือง + แดงเข้มแบบ CZN | เหลือง #f2c744 / #7a5a00 (light), รอง ชมพูแดง #ff6e8e / #9c1f48 | 12px | Plex Thai |

พื้นหลังแต่ละธีม (dark / light): ark #0e1114 / #e9ecef · czn #0b0710 / #efe9f3 · mix #0f0e13 / #ecebf0. ค่าครบอยู่ใน `tokens.css`.

## กฎ component
- **HUD frame** (`.hud > .in`): ใช้กับ KPI, alert, dialog เท่านั้น. ชั้นนอกสี `--border-strong` + clip-path ตัดมุมบนซ้าย/ล่างขวา, ชั้นใน `--surface` ตัดมุมเท่ากันลบ .42px ให้เส้นเฉียงหนา ~1px. Bracket รูปตัว L 10px สี `--accent` ที่มุมบนขวา/ล่างซ้าย. แถบหัว `--surface-2` + label mono. สถานะ warn/danger เปลี่ยนสีกรอบและ bracket
- **Card ทั่วไป** (กราฟ, รายการ): กรอบ 1px `--border`, radius `--radius`, แถบหัวเหมือน HUD. ไม่ตัดมุม เพื่อให้ HUD เด่นเฉพาะจุด
- **Nav**: tab แนวนอนเลื่อนได้; active = `--accent` + เส้นล่าง 2px; ไม่ใช้พื้นทึบ
- **KPI**: label mono UPPERCASE + เลขลำดับ, ค่า 28px mono, คำอธิบาย 11px `--fg-muted`; token ใช้ meter 6px
- **Bar chart**: แนวนอน, สีเดียว (`--accent`) แถวสูงสุดเข้ม 100% อื่น 55%; มีชื่อ agent ซ้าย, "% · K" ขวา (1% = 15K); เรียงมากไปน้อย
- **Tag**: ขอบ 1px สีเดียวกับตัวอักษร, mono UPPERCASE 11px, ข้อความบอกสถานะเสมอ (ok/warn/bad/info)
- **Button**: min-height 36px; primary = `--accent` + `--accent-fg`; อื่นขอบ `--border-strong`; hover เปลี่ยนพื้นภายใน 140ms. Segmented control สำหรับธีม/กรอง ใช้ `aria-pressed`
- **Input ค้นหา**: ขอบ `--border-strong`, placeholder `--fg-muted`; กรอง issues + runs แบบ live
- **Dialog**: `<dialog>` ห่อด้วย HUD warn; ปิดด้วย Esc/ปุ่ม; backdrop ดำ 55%
- **Touch target** >= 32px (ปุ่ม seg) / 36px (ปุ่มหลัก)

## Font (รองรับไทย)
- UI: **IBM Plex Sans Thai** (SIL OFL) → fallback Noto Sans Thai, Sarabun, system-ui
- Mono: **JetBrains Mono** (OFL) ใช้กับ label/id/ตัวเลข (ภาษาอังกฤษและตัวเลขเท่านั้น; mono ไม่มีอักษรไทย)
- Display ธีม czn: **Noto Serif Thai** (OFL) ให้อารมณ์ gothic โดยยังอ่านไทยได้
- โหลดผ่าน Google Fonts (`display=swap`); ถ้าออฟไลน์ใช้ fallback ได้ ไม่พัง

## Contrast (WCAG 2.1 AA)
คำนวณด้วยสคริปต์จากค่าใน `tokens.css`: ตัวอักษรปกติ >= 4.5:1, เส้นกรอบ UI (`--border-strong` บน `--surface`) >= 3:1.
**ผล: 78 คู่ ผ่านทั้งหมด** (6 ธีม-โหมด x 13 คู่: fg/bg, fg/surface, fg-muted/bg|surface|surface-2, accent/bg|surface, accent-fg/accent, accent-2/surface, danger/warn/ok บน surface, border-strong/surface)
ข้อสังเกต: `mix` light ใช้ accent เป็นเหลืองเข้ม (#7a5a00, "amber ink") เพราะเหลืองสดไม่ผ่านบนพื้นขาว; `--border` (เส้นแบ่งบาง) เป็นตกแต่ง ไม่นับเป็นข้อมูลสำคัญ.

<details><summary>ตารางเต็ม</summary>

| theme | mode | pair | fg | bg | ratio | AA |
|---|---|---|---|---|---|---|
| ark | light | fg / bg | #14181c | #e9ecef | 15.04 | pass |
| ark | light | fg / surface | #14181c | #ffffff | 17.84 | pass |
| ark | light | fg-muted / bg | #55606b | #e9ecef | 5.41 | pass |
| ark | light | fg-muted / surface | #55606b | #ffffff | 6.42 | pass |
| ark | light | fg-muted / surface-2 | #55606b | #f1f3f5 | 5.77 | pass |
| ark | light | accent / bg | #0a62a8 | #e9ecef | 5.33 | pass |
| ark | light | accent / surface | #0a62a8 | #ffffff | 6.32 | pass |
| ark | light | accent-fg / accent | #ffffff | #0a62a8 | 6.32 | pass |
| ark | light | accent-2 / surface | #7a5a00 | #ffffff | 6.38 | pass |
| ark | light | danger / surface | #b3261e | #ffffff | 6.54 | pass |
| ark | light | warn / surface | #7a5a00 | #ffffff | 6.38 | pass |
| ark | light | ok / surface | #1b6e3c | #ffffff | 6.28 | pass |
| ark | light | border-strong / surface | #7d8995 | #ffffff | 3.57 | pass |
| ark | dark | fg / bg | #e8ecef | #0e1114 | 15.94 | pass |
| ark | dark | fg / surface | #e8ecef | #171b20 | 14.56 | pass |
| ark | dark | fg-muted / bg | #98a3ad | #0e1114 | 7.37 | pass |
| ark | dark | fg-muted / surface | #98a3ad | #171b20 | 6.74 | pass |
| ark | dark | fg-muted / surface-2 | #98a3ad | #20262c | 5.95 | pass |
| ark | dark | accent / bg | #4cc3ff | #0e1114 | 9.52 | pass |
| ark | dark | accent / surface | #4cc3ff | #171b20 | 8.70 | pass |
| ark | dark | accent-fg / accent | #04121c | #4cc3ff | 9.52 | pass |
| ark | dark | accent-2 / surface | #f2c744 | #171b20 | 10.73 | pass |
| ark | dark | danger / surface | #ff7b72 | #171b20 | 6.86 | pass |
| ark | dark | warn / surface | #f2c744 | #171b20 | 10.73 | pass |
| ark | dark | ok / surface | #56d38a | #171b20 | 9.13 | pass |
| ark | dark | border-strong / surface | #66727e | #171b20 | 3.52 | pass |
| czn | light | fg / bg | #1d1225 | #efe9f3 | 15.12 | pass |
| czn | light | fg / surface | #1d1225 | #fbf8fd | 17.12 | pass |
| czn | light | fg-muted / bg | #5d4b6e | #efe9f3 | 6.53 | pass |
| czn | light | fg-muted / surface | #5d4b6e | #fbf8fd | 7.40 | pass |
| czn | light | fg-muted / surface-2 | #5d4b6e | #f1eaf6 | 6.61 | pass |
| czn | light | accent / bg | #6a2bb0 | #efe9f3 | 6.82 | pass |
| czn | light | accent / surface | #6a2bb0 | #fbf8fd | 7.72 | pass |
| czn | light | accent-fg / accent | #ffffff | #6a2bb0 | 8.12 | pass |
| czn | light | accent-2 / surface | #a01630 | #fbf8fd | 7.52 | pass |
| czn | light | danger / surface | #a01630 | #fbf8fd | 7.52 | pass |
| czn | light | warn / surface | #8a4b00 | #fbf8fd | 6.46 | pass |
| czn | light | ok / surface | #1d6b45 | #fbf8fd | 6.15 | pass |
| czn | light | border-strong / surface | #85689f | #fbf8fd | 4.45 | pass |
| czn | dark | fg / bg | #efe8f5 | #0b0710 | 16.66 | pass |
| czn | dark | fg / surface | #efe8f5 | #150e1d | 15.76 | pass |
| czn | dark | fg-muted / bg | #a898b8 | #0b0710 | 7.46 | pass |
| czn | dark | fg-muted / surface | #a898b8 | #150e1d | 7.06 | pass |
| czn | dark | fg-muted / surface-2 | #a898b8 | #1f1529 | 6.55 | pass |
| czn | dark | accent / bg | #b98cff | #0b0710 | 7.85 | pass |
| czn | dark | accent / surface | #b98cff | #150e1d | 7.42 | pass |
| czn | dark | accent-fg / accent | #14081f | #b98cff | 7.62 | pass |
| czn | dark | accent-2 / surface | #ff6b83 | #150e1d | 6.91 | pass |
| czn | dark | danger / surface | #ff6b83 | #150e1d | 6.91 | pass |
| czn | dark | warn / surface | #e8a54a | #150e1d | 8.91 | pass |
| czn | dark | ok / surface | #5fd09a | #150e1d | 9.87 | pass |
| czn | dark | border-strong / surface | #7b5a99 | #150e1d | 3.38 | pass |
| mix | light | fg / bg | #17151c | #ecebf0 | 15.26 | pass |
| mix | light | fg / surface | #17151c | #ffffff | 18.10 | pass |
| mix | light | fg-muted / bg | #58546a | #ecebf0 | 6.12 | pass |
| mix | light | fg-muted / surface | #58546a | #ffffff | 7.26 | pass |
| mix | light | fg-muted / surface-2 | #58546a | #f2f0f6 | 6.42 | pass |
| mix | light | accent / bg | #7a5a00 | #ecebf0 | 5.38 | pass |
| mix | light | accent / surface | #7a5a00 | #ffffff | 6.38 | pass |
| mix | light | accent-fg / accent | #ffffff | #7a5a00 | 6.38 | pass |
| mix | light | accent-2 / surface | #9c1f48 | #ffffff | 7.77 | pass |
| mix | light | danger / surface | #a8173f | #ffffff | 7.34 | pass |
| mix | light | warn / surface | #7a5a00 | #ffffff | 6.38 | pass |
| mix | light | ok / surface | #1b6e3c | #ffffff | 6.28 | pass |
| mix | light | border-strong / surface | #7f7894 | #ffffff | 4.19 | pass |
| mix | dark | fg / bg | #eceaf1 | #0f0e13 | 16.11 | pass |
| mix | dark | fg / surface | #eceaf1 | #18171e | 14.92 | pass |
| mix | dark | fg-muted / bg | #a29fb1 | #0f0e13 | 7.44 | pass |
| mix | dark | fg-muted / surface | #a29fb1 | #18171e | 6.89 | pass |
| mix | dark | fg-muted / surface-2 | #a29fb1 | #23212b | 6.14 | pass |
| mix | dark | accent / bg | #f2c744 | #0f0e13 | 11.92 | pass |
| mix | dark | accent / surface | #f2c744 | #18171e | 11.04 | pass |
| mix | dark | accent-fg / accent | #16120a | #f2c744 | 11.58 | pass |
| mix | dark | accent-2 / surface | #ff6e8e | #18171e | 6.67 | pass |
| mix | dark | danger / surface | #ff6e8e | #18171e | 6.67 | pass |
| mix | dark | warn / surface | #f2c744 | #18171e | 11.04 | pass |
| mix | dark | ok / surface | #5fd09a | #18171e | 9.30 | pass |
| mix | dark | border-strong / surface | #756f88 | #18171e | 3.72 | pass |

</details>

## ข้อจำกัด
- mockup เป็นหน้า Today หน้าเดียว (ข้อมูล hard-code); tab อื่นยังไม่ทำ
- ยังไม่ได้ตรวจ keyboard/screen reader เต็มรูปแบบ (มี focus ring, aria-pressed, label, dialog native)
- ยังไม่ได้ใช้ skill impeccable / design:accessibility-review ตรงๆ (คุม cap) ตรวจ contrast ด้วยสคริปต์แทน
