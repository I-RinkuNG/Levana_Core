// generates agents.html partial (mock data)
import { writeFileSync } from 'node:fs';
const G = [
  ['สายสร้าง', 'BUILD 05', [['Kotev','เขียนโค้ด',482,9,8,36],['Tzayar','ออกแบบ',296,6,10,4],['Bona','วางโครงสร้าง',88,4,0,3],['Oseh','รันคำสั่ง',31,5,0,0],['Tak','ปรับโค้ด',22,1,0,0]]],
  ['สายค้นและตรวจ', 'CHECK 05', [['Bochek','ทดสอบ',171,25,24,34],['Amet','ตรวจข้อเท็จจริง',140,7,4,13],['Rosh','วางแผนวิจัย',120,3,0,10],['Cheker','ดึงข้อมูล',64,4,0,9],['Zekher','ดูแล lessons',45,2,0,11]]],
];
let n = 0;
const card = ([name, role, tok, ho, b, les]) => { n++; const over = b > 20;
  return `<li class="op${over ? ' warn' : ''}" data-ag="${name.toLowerCase()}"><span class="op-ini" aria-hidden="true">${name[0]}<span class="mono">${String(n).padStart(2,'0')}</span></span><b class="op-name" translate="no">${name.toUpperCase()}</b>
  <div class="op-body"><span class="meta">${role}</span><b class="num op-val">${tok}k</b><span class="op-bar" style="--w:${Math.round(tok/482*100)}%" role="img" aria-label="token 7 วัน ${tok}k จากสูงสุด 482k"></span>
  <dl><dt class="meta">handoff</dt><dd class="num">${ho}</dd><dt class="meta">ตีกลับ</dt><dd class="num${over ? ' bad-t' : ''}">${over ? '<svg class="ico sm" aria-hidden="true"><use href="#i-errors"/></svg>' : ''}${b}%</dd></dl>
  <span class="bnc${over ? ' over' : ''}" role="img" aria-label="ตีกลับ ${b}% เกณฑ์ 20%${over ? ' เกินเกณฑ์' : ''}"><i style="--w:${b*2}%"></i></span>
  <a class="more" href="#">lessons ${les}</a></div></li>`; };
const html = `    <header class="topbar">
      <div class="title">
        <h1>Agents</h1>
        <p class="fresh meta" aria-live="polite"><span class="dot" aria-hidden="true"></span>อัปเดต <span class="num" translate="no">14:32</span> (2 นาทีที่แล้ว) · ข้อมูล 7 วัน</p>
      </div>
      <button class="iconbtn" type="button" aria-label="รีเฟรชข้อมูล"><svg class="ico" aria-hidden="true"><use href="#i-refresh"/></svg></button>
      <button class="iconbtn" type="button" data-theme-toggle aria-label="สลับโหมดสว่าง/มืด"><svg class="ico" aria-hidden="true"><use href="#i-theme"/></svg></button>
    </header>
    <main id="main" class="page agents">
      <ul class="strip" aria-label="สรุป agent">
        <li><span class="mono" translate="no">TOKEN 7D</span><b class="num">1.46M</b></li>
        <li><span class="mono" translate="no">BOUNCE</span><b class="num">12%</b></li>
        <li><span class="mono" translate="no">OVER 20%</span><b class="num bad-t">1</b></li>
        <li class="d-only"><span class="mono" translate="no">HANDOFF</span><b class="num">66</b></li>
        <li class="d-only"><span class="mono" translate="no">LESSONS</span><b class="num">120</b></li>
      </ul>
      <div class="banner keep" role="alert" data-show="error" hidden><svg class="ico" aria-hidden="true"><use href="#i-errors"/></svg><p><b>โหลดสถิติ agent ไม่ได้</b> runs/ อ่านไม่ได้ (GitHub 502 ตอน 14:31) ตัวเลขด้านล่างเป็นของ 13:58 ลองใหม่ หรือตรวจ token ที่หน้า วันนี้</p><button class="btn" type="button">ลองอีกครั้ง</button></div>
      <p class="brief" data-hide="loading empty"><span class="mono" translate="no">ALERT</span><span>Bochek ตีกลับ <b class="num bad-t">24%</b> เกินเกณฑ์ 20% · ส่วนใหญ่เรื่อง test ขาด</span></p>
      <section class="flat" aria-labelledby="h-sq">
        <div class="hd"><span class="tab" translate="no">SQUAD 10</span><h2 id="h-sq">ทีม agent</h2></div>
        <div class="sk" data-show="loading" hidden aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <div class="empty" data-show="empty" hidden><svg class="ico" aria-hidden="true"><use href="#i-empty"/></svg><p><b>ยังไม่มีสถิติใน 7 วัน</b> agent ทั้ง 10 ยังไม่ได้รับงาน เมื่อมี run แรก การ์ดจะขึ้นที่นี่</p><a class="btn primary" href="#">เริ่ม run ใหม่</a></div>
        <div data-hide="loading empty"><p class="meta sub">แถบฟ้า = token 7 วันเทียบคนที่ใช้มากสุด · แถบตีกลับมีเส้นเกณฑ์ 20% (เกินแล้วเป็นสีแดง + ไอคอน)</p>
${G.map(([t, tab, a]) => `        <div class="group"><h3><span class="tab" translate="no">${tab}</span>${t}</h3><ul class="cards">
${a.map(card).join('\n')}
        </ul></div>`).join('\n')}
        </div></section>
    </main>`;
writeFileSync(new URL('./agents.html', import.meta.url), html);
