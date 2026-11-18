// ===== The data (6 pages from class) =====
const PAGES = [
  { id: 1, url: "pune-food-guide.com",       text: "Where to eat in Pune - vada pav and biryani and pizza",              links: [2] },
  { id: 2, url: "best-pizza-pune.com",       text: "Fresh wood-fired pizza made daily - try our cheese pizza",           links: [1, 3] },
  { id: 3, url: "college-canteen-blog.com",  text: "Student reviews of canteen food and chai and Friday pizza",          links: [2, 4] },
  { id: 4, url: "pizza-recipes-home.com",    text: "Make pizza at home - pizza dough and pizza sauce",                   links: [2, 5] },
  { id: 5, url: "cheap-eats-pune.com",       text: "Good food under 100 rupees - misal and dosa and pizza slices",       links: [2] },
  { id: 6, url: "pizza-pizza-pizza.com",     text: "pizza pizza pizza pizza pizza pizza pizza pizza pizza pizza",        links: [1] },
];

// ===== PageRank (power iteration) =====
const D = 0.85;
function pageRank(pages, d = D, tol = 1e-8, maxIter = 100) {
  const N = pages.length;
  let pr = Object.fromEntries(pages.map(p => [p.id, 1 / N]));
  let iter = 0;
  for (; iter < maxIter; iter++) {
    const next = Object.fromEntries(pages.map(p => [p.id, (1 - d) / N]));
    for (const p of pages) {
      if (p.links.length === 0) {                 // dangling page: share with everyone
        for (const q of pages) next[q.id] += d * pr[p.id] / N;
      } else {
        for (const to of p.links) next[to] += d * pr[p.id] / p.links.length;
      }
    }
    const diff = pages.reduce((s, p) => s + Math.abs(next[p.id] - pr[p.id]), 0);
    pr = next;
    if (diff < tol) { iter++; break; }
  }
  return { pr, iter };
}
const { pr: PR, iter: ITERS } = pageRank(PAGES);

// ===== The old way: count keyword matches =====
const words = s => s.toLowerCase().match(/[a-z0-9]+/g) || [];
function keywordScore(page, terms) {
  const w = words(page.text);
  return terms.reduce((s, t) => s + w.filter(x => x === t).length, 0);
}

// ===== Rendering =====
const $ = id => document.getElementById(id);
const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function highlight(text, terms) {
  if (!terms.length) return esc(text);
  const re = new RegExp(`\\b(${terms.map(t => t.replace(/[^a-z0-9]/g, "")).join("|")})\\b`, "gi");
  return esc(text).replace(re, "<mark>$1</mark>");
}

function item(rank, page, terms, scoreHTML, isSpam) {
  return `<li class="${isSpam ? "spam" : ""}">
    <span class="rank">${rank}</span>
    <div>
      <div class="url">${esc(page.url)}${isSpam ? '<span class="badge">keyword stuffing</span>' : ""}</div>
      <div class="text">${highlight(page.text, terms)}</div>
    </div>
    <div class="score">${scoreHTML}</div>
  </li>`;
}

function search(q) {
  const terms = [...new Set(words(q))];
  const matches = PAGES.map(p => ({ p, kw: keywordScore(p, terms) })).filter(r => r.kw > 0);

  const oldList = [...matches].sort((a, b) => b.kw - a.kw || a.p.id - b.p.id);
  const prList  = [...matches].sort((a, b) => PR[b.p.id] - PR[a.p.id] || b.kw - a.kw);

  const spamId = 6;
  $("old").innerHTML = oldList.length
    ? oldList.map((r, i) => item(i + 1, r.p, terms, `${r.kw}<small>matches</small>`, r.p.id === spamId)).join("")
    : `<li class="empty">No pages contain “${esc(q)}”.</li>`;
  $("pr").innerHTML = prList.length
    ? prList.map((r, i) => item(i + 1, r.p, terms, `${PR[r.p.id].toFixed(3)}<small>PageRank</small>`, false)).join("")
    : `<li class="empty">No pages contain “${esc(q)}”.</li>`;

  // one-line explanation of the difference
  const v = $("verdict");
  if (!matches.length) { v.textContent = ""; return; }
  const oldTop = oldList[0].p, prTop = prList[0].p;
  if (oldTop.id !== prTop.id) {
    v.innerHTML = `The old way puts <strong>${oldTop.url}</strong> first because it repeats the word most. ` +
      `PageRank puts <strong>${prTop.url}</strong> first because the most pages link to it.`;
  } else {
    v.innerHTML = `Both methods agree: <strong>${oldTop.url}</strong> comes first.`;
  }

  document.querySelectorAll(".chips button").forEach(b => b.classList.toggle("on", b.dataset.q === q.trim().toLowerCase()));
}

// ===== Link graph (SVG) =====
function drawGraph() {
  const pos = { 1: [140, 110], 2: [360, 210], 3: [580, 110], 4: [580, 320], 5: [360, 370], 6: [140, 320] };
  const maxPR = Math.max(...Object.values(PR));
  const r = id => 22 + 30 * (PR[id] / maxPR);
  const svg = $("svg");
  let s = `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 z" fill="#6b7385"/></marker></defs>`;

  for (const p of PAGES) {
    for (const to of p.links) {
      const [x1, y1] = pos[p.id], [x2, y2] = pos[to];
      const both = PAGES.find(q => q.id === to).links.includes(p.id);
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
      const ux = dx / len, uy = dy / len;
      const off = both ? 9 : 0;                       // two-way links drawn side by side
      const ox = -uy * off, oy = ux * off;
      const sx = x1 + ux * r(p.id) + ox, sy = y1 + uy * r(p.id) + oy;
      const ex = x2 - ux * (r(to) + 4) + ox, ey = y2 - uy * (r(to) + 4) + oy;
      s += `<line class="edge" x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" marker-end="url(#arrow)"/>`;
    }
  }
  for (const p of PAGES) {
    const [x, y] = pos[p.id];
    s += `<circle class="node ${p.id === 6 ? "spam" : ""}" cx="${x}" cy="${y}" r="${r(p.id)}"/>
      <text class="num" x="${x}" y="${y + 5}">${p.id}</text>
      <text class="lbl" x="${x}" y="${y + r(p.id) + 18}">${p.url} · ${PR[p.id].toFixed(3)}</text>`;
  }
  svg.innerHTML = s;

  $("tbl").innerHTML = [...PAGES].sort((a, b) => PR[b.id] - PR[a.id]).map(p => {
    const from = PAGES.filter(q => q.links.includes(p.id)).map(q => q.id);
    return `<tr><td>${p.id}</td><td>${p.url}</td><td>${p.links.join(", ")}</td><td>${from.length ? from.join(", ") : "nobody"}</td><td>${PR[p.id].toFixed(4)}</td></tr>`;
  }).join("");
  $("iters").textContent = ITERS;
}

// ===== Wire up =====
$("form").addEventListener("submit", e => { e.preventDefault(); search($("q").value); });
document.querySelectorAll(".chips button").forEach(b =>
  b.addEventListener("click", () => { $("q").value = b.dataset.q; search(b.dataset.q); }));
drawGraph();
search($("q").value);
