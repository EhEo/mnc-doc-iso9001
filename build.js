/**
 * ISO문서번역 정적 사이트 빌드 스크립트
 * 사용법: node build.js
 * 출력:  docs/index.html  (GitHub Pages / 로컬에서 바로 열기 가능)
 */
const fs   = require('fs');
const path = require('path');

const ROOT   = __dirname;                          // ISO문서번역/
const SRC    = path.join(ROOT, '한국어번역');       // 소스 MD 폴더
const DIST   = path.join(ROOT, 'docs');            // 출력 폴더

// ─── 폴더 번호별 카테고리 레이블 ───────────────────────────────────────────
const FOLDER_LABELS = {
  '00':  '00. 절차서 목록',
  '1':   '01. 조직맥락결정',
  '2':   '02. 품질매뉴얼',
  '3':   '03. 문서관리',
  '10':  '10. 내부심사',
  '11':  '11. 개발품 품질보증',
  '12':  '12. PPAP 승인',
  '13':  '13. 제품품질기획(APQP)',
  '14':  '14. 정보보안방침',
  '15':  '15. 의사소통',
  '16':  '16. 생산계획수립',
  '17':  '17. 주문접수·계약검토',
  '18':  '18. 신제품개발',
  '19':  '19. 특수특성관리',
  '20':  '20. 시험생산',
  '21':  '21. 구매·공급업체평가',
  '22':  '22. 보관·입출고',
  '23':  '23. 생산라인 셋업',
  '24':  '24. QC 검사',
  '25':  '25. 한도샘플관리',
  '26':  '26. 산포제품처리',
  '27':  '27. 부적합품(NG)처리',
  '28':  '28. NG 신뢰성 처리',
  '29':  '29. 부적합품 사용요청',
  'ref': '참조문서',
};

// ─── 유틸 ──────────────────────────────────────────────────────────────────
function formatDate(date) {
  const p = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}`;
}

function getFolderKey(folderName) {
  // e.g. "1.조직맥락결정_절차" → "1"
  //      "00. ★절차서목록_전체프로세스관리" → "00"
  //      "참조문서" → "ref"
  if (folderName === '참조문서') return 'ref';
  const m = folderName.match(/^(\d+)/);
  return m ? m[1] : folderName;
}

function extractTitle(content, filename) {
  const m = content.match(/^#+\s+(.+)/m);
  if (m) return m[1].trim();
  return filename.replace(/\.md$/, '').replace(/_/g, ' ');
}

// ─── MD 파일 스캔 ──────────────────────────────────────────────────────────
function scanDocs(srcDir) {
  const results = [];

  function walk(dir, parentFolder) {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        // top-level folder → use as category; nested → inherit parent
        const folder = parentFolder || e.name;
        walk(full, folder);
      } else if (e.name.endsWith('.md')) {
        try {
          const stat  = fs.statSync(full);
          const raw   = fs.readFileSync(full, 'utf-8');
          const rel   = path.relative(srcDir, full).replace(/\\/g, '/');
          const folder = parentFolder || '';
          const key    = getFolderKey(folder);
          results.push({
            path:        rel,
            name:        e.name,
            title:       extractTitle(raw, e.name),
            folder:      folder,
            folderKey:   key,
            folderLabel: FOLDER_LABELS[key] || folder,
            modified:    stat.mtimeMs,
            modifiedStr: formatDate(stat.mtime),
            content:     raw,
          });
        } catch(err) {
          console.warn(`  [SKIP] ${e.name}: ${err.message}`);
        }
      }
    }
  }

  walk(srcDir, null);
  return results;
}

// ─── 사이드바 HTML 생성 ────────────────────────────────────────────────────
function buildSidebar(grouped) {
  // Sort folder keys by numeric order
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === 'ref') return 1;
    if (b === 'ref') return -1;
    return parseInt(a || '0') - parseInt(b || '0');
  });

  let html = '';
  for (const key of sortedKeys) {
    const docs  = grouped[key];
    if (!docs || docs.length === 0) continue;
    const label = FOLDER_LABELS[key] || key;
    html += `<div class="sidebar-section">`;
    html += `<div class="sidebar-section-title open" onclick="toggleSection(this)">${label} <span class="count">(${docs.length})</span></div>`;
    html += `<ul class="sidebar-list open">`;
    for (const doc of docs) {
      const escapedPath = doc.path.replace(/'/g, "\\'");
      html += `<li class="sidebar-item" onclick="loadDoc('${escapedPath}')" data-path="${doc.path}">`;
      html += `<span class="sidebar-item-text">${doc.name.replace(/\.md$/, '')}</span>`;
      html += `</li>`;
    }
    html += `</ul></div>`;
  }
  return html;
}

// ─── 전체 HTML 생성 ────────────────────────────────────────────────────────
function generateHTML(docs, grouped) {
  const dataJson   = JSON.stringify(docs);
  const sidebarHtml = buildSidebar(grouped);
  const totalFiles  = docs.length;
  const latestDate  = docs.length > 0
    ? formatDate(new Date(Math.max(...docs.map(d => d.modified)))).substring(0, 10)
    : new Date().toISOString().substring(0, 10);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>M&amp;C Electronics Vina ISO 문서 한국어 번역</title>
<link rel="preconnect" href="https://cdn.jsdelivr.net">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.min.css">
<script src="https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/highlight.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
:root{
  --bg:#fff; --bg-sidebar:#f8f9fa; --bg-header:#1a4971;
  --text:#1a202c; --text-muted:#718096; --border:#e2e8f0;
  --accent:#1a6cb0; --accent-light:#ebf4ff;
  --hover:#edf2f7; --shadow:0 1px 3px rgba(0,0,0,.08);
  --font:'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',-apple-system,sans-serif;
}
body{font-family:var(--font);font-size:14px;line-height:1.6;color:var(--text);background:var(--bg);display:flex;flex-direction:column;height:100vh;overflow:hidden;}

/* Header */
.header{background:var(--bg-header);color:#fff;padding:10px 20px;display:flex;align-items:center;gap:12px;flex-shrink:0;z-index:100;}
.header h1{font-size:15px;font-weight:700;letter-spacing:-.3px;}
.header .sub{font-size:11px;opacity:.75;}
.header .spacer{flex:1;}
.header .info{font-size:11px;opacity:.65;text-align:right;}

/* Layout */
.layout{display:flex;flex:1;overflow:hidden;}

/* Sidebar */
.sidebar{width:280px;min-width:220px;max-width:380px;background:var(--bg-sidebar);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden;flex-shrink:0;resize:horizontal;}
.sidebar-search{padding:10px;border-bottom:1px solid var(--border);position:relative;}
.sidebar-search input{width:100%;padding:7px 10px 7px 32px;border:1px solid var(--border);border-radius:6px;font-size:12px;font-family:var(--font);outline:none;background:#fff;}
.sidebar-search input:focus{border-color:var(--accent);box-shadow:0 0 0 2px rgba(26,108,176,.1);}
.sidebar-search .search-icon{position:absolute;left:18px;top:50%;transform:translateY(-50%);font-size:12px;pointer-events:none;opacity:.5;}
.sidebar-search .clear-btn{position:absolute;right:18px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:13px;color:var(--text-muted);display:none;padding:0 2px;}
.sidebar-search .clear-btn.show{display:block;}
/* 검색 결과 패널 */
.search-results{display:none;flex-direction:column;border-top:1px solid var(--border);background:#fff;overflow-y:auto;max-height:55vh;}
.search-results.show{display:flex;}
.sr-header{padding:7px 12px;font-size:11px;font-weight:700;color:var(--text-muted);background:var(--bg-sidebar);border-bottom:1px solid var(--border);flex-shrink:0;}
.sr-item{padding:9px 12px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .1s;}
.sr-item:hover{background:var(--accent-light);}
.sr-title{font-size:12px;font-weight:600;color:var(--text);margin-bottom:2px;}
.sr-folder{font-size:10px;color:var(--text-muted);margin-bottom:4px;}
.sr-excerpt{font-size:11px;color:#555;line-height:1.5;word-break:break-all;}
.sr-excerpt mark{background:#fff3cd;color:#856404;border-radius:2px;padding:0 2px;font-style:normal;}
.sr-no-result{padding:16px 12px;font-size:12px;color:var(--text-muted);text-align:center;}
.sidebar-nav{flex:1;overflow-y:auto;padding:6px 0;}
.sidebar-section{margin-bottom:2px;}
.sidebar-section-title{padding:7px 14px;font-size:11px;font-weight:700;color:var(--text-muted);cursor:pointer;user-select:none;display:flex;align-items:center;gap:5px;letter-spacing:.3px;}
.sidebar-section-title::before{content:'▶';font-size:8px;transition:transform .15s;}
.sidebar-section-title.open::before{transform:rotate(90deg);}
.count{font-weight:400;opacity:.7;}
.sidebar-list{list-style:none;overflow:hidden;max-height:0;transition:max-height .25s ease;}
.sidebar-list.open{max-height:3000px;}
.sidebar-item{padding:5px 14px 5px 22px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:5px;transition:background .1s;white-space:nowrap;overflow:hidden;}
.sidebar-item:hover{background:var(--hover);}
.sidebar-item.active{background:var(--accent-light);color:var(--accent);font-weight:500;border-right:3px solid var(--accent);}
.sidebar-item.hidden{display:none;}
.sidebar-item-text{overflow:hidden;text-overflow:ellipsis;}

/* Main */
.main{flex:1;overflow-y:auto;padding:28px 44px;max-width:980px;}
.welcome{text-align:center;padding:70px 40px;color:var(--text-muted);}
.welcome h2{font-size:22px;color:var(--text);margin-bottom:12px;}
.welcome p{font-size:13px;line-height:1.9;margin-bottom:8px;}
.welcome .stats{display:flex;justify-content:center;gap:32px;margin-top:24px;flex-wrap:wrap;}
.welcome .stat{text-align:center;}
.welcome .stat .num{font-size:28px;font-weight:700;color:var(--accent);display:block;}
.welcome .stat .lbl{font-size:11px;color:var(--text-muted);}

.doc-header{margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid var(--border);}
.doc-path{font-size:11px;color:var(--text-muted);margin-bottom:4px;}
.doc-meta{font-size:11px;color:var(--text-muted);margin-top:6px;display:flex;gap:14px;flex-wrap:wrap;}

/* Markdown */
.markdown-body{font-size:14px;line-height:1.8;}
.markdown-body h1{font-size:22px;font-weight:700;margin:28px 0 14px;padding-bottom:7px;border-bottom:2px solid var(--border);}
.markdown-body h2{font-size:18px;font-weight:700;margin:24px 0 10px;padding-bottom:5px;border-bottom:1px solid var(--border);}
.markdown-body h3{font-size:15px;font-weight:700;margin:20px 0 8px;}
.markdown-body h4{font-size:14px;font-weight:700;margin:16px 0 6px;}
.markdown-body p{margin:0 0 12px;}
.markdown-body ul,.markdown-body ol{margin:0 0 12px;padding-left:24px;}
.markdown-body li{margin-bottom:4px;}
.markdown-body blockquote{border-left:3px solid var(--accent);margin:12px 0;padding:8px 14px;background:var(--accent-light);border-radius:0 4px 4px 0;color:var(--text-muted);}
.markdown-body pre{background:#f6f8fa;border:1px solid var(--border);border-radius:6px;padding:14px;overflow-x:auto;margin:12px 0;font-size:12px;line-height:1.5;}
.markdown-body code{background:#f1f3f4;padding:1px 5px;border-radius:3px;font-size:12px;font-family:Consolas,'Courier New',monospace;}
.markdown-body pre code{background:none;padding:0;border-radius:0;}
.markdown-body table{width:100%;border-collapse:collapse;margin:14px 0;font-size:13px;}
.markdown-body th{background:var(--bg-header);color:#fff;padding:8px 12px;text-align:left;font-weight:600;}
.markdown-body td{padding:7px 12px;border-bottom:1px solid var(--border);}
.markdown-body tr:nth-child(even) td{background:#f7fafc;}
.markdown-body tr:hover td{background:var(--accent-light);}
.markdown-body a{color:var(--accent);text-decoration:none;}
.markdown-body a:hover{text-decoration:underline;}
.markdown-body hr{border:none;border-top:1px solid var(--border);margin:20px 0;}
.markdown-body img{max-width:100%;border-radius:4px;}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="h1">M&amp;C Electronics Vina</div>
    <h1>ISO 9001 / IATF 16949 품질문서 한국어 번역</h1>
  </div>
  <span class="sub">총 ${totalFiles}개 문서</span>
  <div class="spacer"></div>
  <div class="info">최종 업데이트: ${latestDate}</div>
</div>
<div class="layout">
  <div class="sidebar">
    <div class="sidebar-search">
      <span class="search-icon">🔍</span>
      <input type="text" id="search" placeholder="파일명 · 본문 검색..." oninput="filterDocs(this.value)" autocomplete="off">
      <button class="clear-btn" id="clear-btn" onclick="clearSearch()" title="검색 초기화">✕</button>
    </div>
    <div class="search-results" id="search-results"></div>
    <div class="sidebar-nav" id="sidebar-nav">${sidebarHtml}</div>
  </div>
  <div class="main" id="main">
    <div class="welcome">
      <h2>📄 ISO 품질문서 한국어 번역 뷰어</h2>
      <p>M&amp;C Electronics Vina의 ISO 9001 / IATF 16949 기반<br>품질경영시스템 문서 (베트남어 원본 → 한국어 번역)</p>
      <p>왼쪽 사이드바에서 문서를 선택하거나 검색창을 이용하세요.</p>
      <div class="stats">
        <div class="stat"><span class="num">${totalFiles}</span><span class="lbl">번역 완료 문서</span></div>
        <div class="stat"><span class="num">${Object.keys(grouped).length}</span><span class="lbl">절차 카테고리</span></div>
        <div class="stat"><span class="num">${latestDate}</span><span class="lbl">최종 업데이트</span></div>
      </div>
    </div>
  </div>
</div>
<script>
const docs = ${dataJson};
const docMap = {};
for (const d of docs) docMap[d.path] = d;

function toggleSection(el) {
  el.classList.toggle('open');
  const ul = el.nextElementSibling;
  if (ul) ul.classList.toggle('open');
}

let _searchTimer = null;

function clearSearch() {
  const inp = document.getElementById('search');
  inp.value = '';
  filterDocs('');
  inp.focus();
}

function filterDocs(q) {
  const lower = q.toLowerCase().trim();
  const clearBtn = document.getElementById('clear-btn');
  const resultsEl = document.getElementById('search-results');

  // Clear button visibility
  if (clearBtn) clearBtn.classList.toggle('show', !!lower);

  // Reset sidebar visibility
  document.querySelectorAll('.sidebar-item').forEach(li => {
    li.classList.remove('hidden');
  });

  if (!lower) {
    resultsEl.classList.remove('show');
    resultsEl.innerHTML = '';
    return;
  }

  // ── 사이드바 파일명 필터 ──────────────────────────────────
  document.querySelectorAll('.sidebar-item').forEach(li => {
    const path = (li.dataset.path || '').toLowerCase();
    const text = li.textContent.toLowerCase();
    li.classList.toggle('hidden', !text.includes(lower) && !path.includes(lower));
  });
  document.querySelectorAll('.sidebar-section').forEach(sec => {
    const title = sec.querySelector('.sidebar-section-title');
    const list  = sec.querySelector('.sidebar-list');
    const hasVisible = [...sec.querySelectorAll('.sidebar-item')].some(li => !li.classList.contains('hidden'));
    if (hasVisible) {
      list && list.classList.add('open');
      title && title.classList.add('open');
    }
  });

  // ── 본문 전문 검색 (디바운스 150ms) ──────────────────────
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => {
    const re = new RegExp(lower.replace(/[.*+?^{}()|[\]\\$]/g, '\\$&'), 'gi');
    const matches = [];

    for (const doc of docs) {
      const text = doc.content || '';
      if (!text.toLowerCase().includes(lower)) continue;

      // 첫 번째 매칭 위치로 발췌 생성
      const idx = text.toLowerCase().indexOf(lower);
      const start = Math.max(0, idx - 70);
      const end   = Math.min(text.length, idx + lower.length + 70);
      let excerpt = text.substring(start, end)
        .replace(/[#*_\`>]/g, '')   // 마크다운 기호 제거
        .replace(/\\n+/g, ' ')       // 줄바꿈 → 공백
        .trim();
      if (start > 0) excerpt = '…' + excerpt;
      if (end < text.length) excerpt += '…';

      // 매칭 단어 강조
      const safeExcerpt = excerpt.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const highlighted = safeExcerpt.replace(re, m => \`<mark>\${m}</mark>\`);

      // 전체 본문에서 총 매칭 횟수
      const totalHits = (text.match(re) || []).length;

      matches.push({ doc, excerpt: highlighted, totalHits });
    }

    if (matches.length === 0) {
      resultsEl.classList.add('show');
      resultsEl.innerHTML = \`<div class="sr-no-result">본문 검색 결과 없음</div>\`;
      return;
    }

    // 매칭 횟수 많은 순 정렬
    matches.sort((a, b) => b.totalHits - a.totalHits);

    const rows = matches.slice(0, 30).map(m => {
      const escapedPath = m.doc.path.replace(/'/g, "\\\\'");
      return \`<div class="sr-item" onclick="loadDoc('\${escapedPath}', '\${lower.replace(/'/g, "\\\\'")}')">
        <div class="sr-title">\${m.doc.name.replace(/\\.md$/, '')}</div>
        <div class="sr-folder">\${m.doc.folderLabel} &nbsp;·&nbsp; 일치 \${m.totalHits}건</div>
        <div class="sr-excerpt">\${m.excerpt}</div>
      </div>\`;
    }).join('');

    resultsEl.classList.add('show');
    resultsEl.innerHTML = \`<div class="sr-header">본문 검색 결과 \${matches.length}건 (상위 30개 표시)</div>\${rows}\`;
  }, 150);
}

function loadDoc(docPath) {
  const doc = docMap[docPath];
  if (!doc) { console.warn('doc not found:', docPath); return; }

  // Highlight active
  document.querySelectorAll('.sidebar-item').forEach(li => li.classList.remove('active'));
  const active = document.querySelector(\`.sidebar-item[data-path="\${CSS.escape(docPath)}"]\`);
  if (active) {
    active.classList.add('active');
    active.scrollIntoView({ block: 'nearest' });
  }

  // Configure marked
  marked.setOptions({ breaks: true, gfm: true });

  // Render markdown
  const rendered = marked.parse(doc.content || '');

  const main = document.getElementById('main');
  main.innerHTML = \`
    <div class="doc-header">
      <div class="doc-path">📁 \${doc.folder} / \${doc.name}</div>
      <div class="doc-meta">
        <span>📅 수정일: \${doc.modifiedStr}</span>
        <span>📂 분류: \${doc.folderLabel}</span>
      </div>
    </div>
    <div class="markdown-body">\${rendered}</div>
  \`;
  main.scrollTop = 0;

  // Syntax highlight
  main.querySelectorAll('pre code').forEach(block => {
    if (typeof hljs !== 'undefined') hljs.highlightElement(block);
  });
}
</script>
</body>
</html>`;
}

// ─── 메인 빌드 실행 ────────────────────────────────────────────────────────
console.log('=== ISO 문서번역 정적 사이트 빌드 ===\n');
console.log('1. MD 파일 스캔 중...');

const docs = scanDocs(SRC);
console.log(`   ${docs.length}개 파일 발견\n`);

// Group by folderKey
const grouped = {};
for (const doc of docs) {
  if (!grouped[doc.folderKey]) grouped[doc.folderKey] = [];
  grouped[doc.folderKey].push(doc);
}

console.log('2. HTML 생성 중...');
const html = generateHTML(docs, grouped);

if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });
const outPath = path.join(DIST, 'index.html');
fs.writeFileSync(outPath, html, 'utf-8');

const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log(`   출력: ${outPath}`);
console.log(`   크기: ${kb} KB\n`);
console.log('3. 빌드 완료!');
console.log(`   로컬 열기: start ${outPath}`);
