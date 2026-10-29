(function(){
  var d=document.documentElement,q=new URLSearchParams(location.search);
  if(q.get('shot'))d.classList.add('shot');
  function meta(){var m=document.querySelector('meta[name=theme-color]');if(m)m.content=getComputedStyle(d).getPropertyValue('--bg').trim();}
  meta();
  document.querySelectorAll('[data-theme-toggle]').forEach(function(b){
    b.setAttribute('aria-pressed',d.dataset.mode==='dark');
    b.addEventListener('click',function(){d.dataset.mode=d.dataset.mode==='dark'?'light':'dark';try{localStorage.setItem('lvn-mode',d.dataset.mode)}catch(e){}b.setAttribute('aria-pressed',d.dataset.mode==='dark');meta();});
  });
  var root=document.querySelector('.app'),sel=document.querySelector('[data-mock=state]');
  function setState(s){
    root.dataset.state=s;
    document.querySelectorAll('[data-show]').forEach(function(el){el.hidden=el.dataset.show.split(' ').indexOf(s)<0;});
    document.querySelectorAll('[data-hide]').forEach(function(el){el.hidden=el.dataset.hide.split(' ').indexOf(s)>=0;});
    root.setAttribute('aria-busy',s==='loading');
  }
  var st=q.get('state')||'ready';setState(st);
  if(sel){sel.value=st;sel.addEventListener('change',function(){setState(sel.value)});}
  var cd=document.querySelector('[data-countdown]');
  if(cd&&!q.get('shot')){var t=1*3600+48*60+20;setInterval(function(){t=Math.max(0,t-1);var h=t/3600|0,m=(t%3600)/60|0,s=t%60;cd.textContent=[h,m,s].map(function(n){return String(n).padStart(2,'0')}).join(':');},1000);}
})();
