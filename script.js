const dot = document.getElementById('cursorDot');
window.addEventListener('mousemove', e => {
  dot.style.left = e.clientX + 'px';
  dot.style.top = e.clientY + 'px';
});
document.querySelectorAll('[data-hover], a, button').forEach(el => {
  el.addEventListener('mouseenter', () => dot.classList.add('hover'));
  el.addEventListener('mouseleave', () => dot.classList.remove('hover'));
});

const colors = ['#ff5d8f','#3a8dff','#ffc233','#20b26c'];
let last = 0;
window.addEventListener('mousemove', e => {
  const now = Date.now();
  if (now - last < 60) return;
  last = now;
  const s = document.createElement('div');
  s.textContent = '✦';
  s.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;
    color:${colors[Math.floor(Math.random()*colors.length)]};font-size:14px;
    pointer-events:none;z-index:9998;transform:translate(-50%,-50%);
    transition:opacity .6s, transform .6s cubic-bezier(.34,1.56,.64,1);`;
  document.body.appendChild(s);
  requestAnimationFrame(() => {
    s.style.opacity = '0';
    s.style.transform = `translate(-50%,-50%) translateY(-24px) scale(1.4)`;
  });
  setTimeout(() => s.remove(), 600);
});

document.querySelectorAll('[data-magnetic]').forEach(el => {
  el.addEventListener('mousemove', e => {
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    el.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
  });
  el.addEventListener('mouseleave', () => { el.style.transform = 'translate(0,0)'; });
});

document.querySelectorAll('[data-tilt]').forEach(el => {
  el.addEventListener('mousemove', e => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(600px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) translateY(-6px) scale(1.02)`;
  });
  el.addEventListener('mouseleave', () => { el.style.transform = ''; });
});

const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    document.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' });
  });
});
