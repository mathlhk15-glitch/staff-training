// ============================================================
// 창원경일고등학교 교직원 연수 포털 - 공통 스크립트
// ============================================================

/* ---------- 경로 보정 (하위 폴더에서도 동일 파일 재사용) ---------- */
function sitePath(p) {
  // 현재 문서 위치 기준으로 data/ 등 루트 자원 경로를 계산
  const depth = (window.SITE_DEPTH || 0);
  return "../".repeat(depth) + p;
}

/* ---------- 즐겨찾기 (localStorage) ---------- */
const FAV_KEY = "staffTrainingFavorites";
function getFavorites() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); }
  catch (e) { return []; }
}
function toggleFavorite(id) {
  let favs = getFavorites();
  if (favs.includes(id)) favs = favs.filter(x => x !== id);
  else favs.push(id);
  try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch (e) {}
  return favs;
}

/* ---------- 검토 상태 판정 ---------- */
// "최신 법령"을 날짜만으로 자동 단정하지 않습니다.
// verified/verifiedDate는 실제 검토 후 trainings.js에서 수동 지정합니다.
function computeStatus(item, today) {
  today = today || new Date();
  const verifiedDate = item.verifiedDate || item.reviewedDate;
  const reviewed = verifiedDate ? new Date(verifiedDate + "T00:00:00") : null;
  const diffDays = reviewed ? Math.floor((today - reviewed) / 86400000) : Infinity;
  const currentAcademicYear = today.getMonth() >= 2 ? today.getFullYear() : today.getFullYear() - 1;
  const stale = !item.verified || !reviewed || diffDays > 365 || currentAcademicYear > item.year;
  return {
    stale,
    diffDays,
    label: stale ? "재검토 필요" : "검토 완료"
  };
}

function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

/* ---------- 인앱 브라우저 감지 ---------- */
// 카카오톡, 네이버, 라인, 인스타그램, 페이스북, 밴드 등 알려진 인앱 브라우저 토큰.
// 학교 자체 메신저(예: 쿨메신저)의 정확한 UA 토큰이 확인되면 이 배열에 추가하면 됩니다.
const INAPP_UA_PATTERNS = [
  /KAKAOTALK/i, /NAVER/i, /Line\//i, /Instagram/i, /FBAN|FBAV/i,
  /BAND\//i, /Whale/i, /DaumApps/i, /Everytime/i,
  /; wv\)/i, /Version\/4\.0.*Chrome.*Mobile Safari/i
  // 학교 메신저 UA 토큰이 확인되면 아래처럼 한 줄 추가:
  // /CoolMessenger/i,
];
function isInAppBrowser() {
  const ua = navigator.userAgent || "";
  return INAPP_UA_PATTERNS.some(re => re.test(ua));
}

function showToast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

function initInAppBanner() {
  const banner = document.getElementById("inappBanner");
  if (!banner) return;
  if (isInAppBrowser()) {
    banner.style.display = "block";
    const btn = document.getElementById("inappCopyBtn");
    if (btn) {
      btn.addEventListener("click", () => {
        const url = location.href;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(
            () => showToast("링크가 복사되었습니다. Chrome/Safari에 붙여넣어 열어주세요."),
            () => showToast(url)
          );
        } else {
          showToast(url);
        }
      });
    }
  }
}

/* 인쇄 버튼 클릭 시 인앱 브라우저면 인쇄 대신 안내 */
function guardedPrint() {
  if (isInAppBrowser()) {
    showToast("카카오톡/인앱 브라우저에서는 인쇄가 제한됩니다. 우측 상단 메뉴에서 'Chrome/Safari로 열기'를 선택해 주세요.");
    const banner = document.getElementById("inappBanner");
    if (banner) banner.style.display = "block";
    return;
  }
  window.print();
}

/* ---------- 선택 인쇄 ---------- */
function initSelectivePrint() {
  const list = document.getElementById("selectPrintList");
  if (!list) return;
  const checkboxes = list.querySelectorAll("input[type=checkbox]");

  function applyNoPrint() {
    checkboxes.forEach(cb => {
      const sec = document.getElementById(cb.dataset.target);
      if (!sec) return;
      sec.classList.toggle("no-print", !cb.checked);
    });
  }
  checkboxes.forEach(cb => cb.addEventListener("change", applyNoPrint));

  const allBtn = document.getElementById("selectAllBtn");
  const goBtn = document.getElementById("selectPrintGoBtn");
  const fullBtn = document.getElementById("fullPrintBtn");
  if (allBtn) allBtn.addEventListener("click", () => {
    checkboxes.forEach(cb => cb.checked = true);
    applyNoPrint();
  });
  if (goBtn) goBtn.addEventListener("click", () => { applyNoPrint(); guardedPrint(); });
  if (fullBtn) fullBtn.addEventListener("click", () => {
    checkboxes.forEach(cb => cb.checked = true);
    applyNoPrint();
    guardedPrint();
  });

  window.addEventListener("afterprint", () => {
    // 인쇄 후 웹 화면은 전체 내용을 다시 보이게 하되 체크 상태는 유지합니다.
    document.querySelectorAll(".tr-section.no-print").forEach(sec => sec.classList.remove("no-print"));
  });
}

/* ---------- 패널 토글 (목차 / 3분 핵심 / 선택 인쇄) ---------- */
function initPanelToggles() {
  document.querySelectorAll("[data-toggle-panel]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-toggle-panel");
      const panel = document.getElementById(id);
      if (!panel) return;
      const willShow = !panel.classList.contains("show");
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("show"));
      document.querySelectorAll("[data-toggle-panel]").forEach(b => b.classList.remove("on"));
      if (willShow) { panel.classList.add("show"); btn.classList.add("on"); }
    });
  });
}

/* ---------- 본문 검색 (search-index.json 지연 로딩) ---------- */
let __searchIndexPromise = null;
function loadSearchIndex() {
  if (!__searchIndexPromise) {
    __searchIndexPromise = fetch(sitePath("data/search-index.json"))
      .then(r => r.json())
      .catch(() => []);
  }
  return __searchIndexPromise;
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeSearch(value) {
  return String(value || "")
    .toLocaleLowerCase("ko-KR")
    .replace(/[\s·ㆍ•‧_\-–—/()\[\]{}:：.,'"“”‘’]+/g, "");
}

function highlight(text, query) {
  const safeText = escapeHtml(text);
  const escapedQuery = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escapedQuery) return safeText;
  return safeText.replace(new RegExp(escapedQuery, "gi"), m => `<mark>${m}</mark>`);
}

function snippetAround(text, query, radius) {
  radius = radius || 70;
  const lower = String(text).toLocaleLowerCase("ko-KR");
  const qLower = String(query).toLocaleLowerCase("ko-KR");
  const idx = lower.indexOf(qLower);
  if (idx === -1) return String(text).slice(0, 140) + (String(text).length > 140 ? "…" : "");
  const start = Math.max(0, idx - radius);
  const end = Math.min(String(text).length, idx + query.length + radius);
  return (start > 0 ? "…" : "") + String(text).slice(start, end) + (end < String(text).length ? "…" : "");
}

function findMatchingSection(doc, query) {
  const nq = normalizeSearch(query);
  if (!nq || !Array.isArray(doc.sections)) return null;
  return doc.sections.find(sec =>
    normalizeSearch(sec.title).includes(nq) || normalizeSearch(sec.text || "").includes(nq)
  ) || null;
}

function runSearch(query, resultsEl) {
  resultsEl.innerHTML = "";
  if (!query || query.trim().length < 1) return;
  loadSearchIndex().then(index => {
    const q = query.trim();
    const nq = normalizeSearch(q);
    const hits = [];
    index.forEach(doc => {
      const training = (typeof TRAININGS !== "undefined") ? TRAININGS.find(t => t.id === doc.id) : null;
      const keywordText = training ? (training.keywords || []).join(" ") : (doc.keywords || []).join(" ");
      const section = findMatchingSection(doc, q);
      const searchable = [doc.title, doc.category, doc.audience, keywordText, doc.text]
        .map(normalizeSearch).join(" ");
      if (searchable.includes(nq) || section) {
        const anchor = section ? `#${encodeURIComponent(section.id)}` : "";
        const sourceText = section && section.text ? section.text : doc.text;
        const snippet = snippetAround(sourceText, q);
        hits.push({ doc, snippet, anchor });
      }
    });
    if (hits.length === 0) {
      resultsEl.innerHTML = `<div class="search-hint">'${escapeHtml(q)}'에 대한 검색 결과가 없습니다.</div>`;
      return;
    }
    resultsEl.innerHTML = hits.map(h => {
      const href = `${sitePath(h.doc.file)}?q=${encodeURIComponent(q)}${h.anchor}`;
      return `
      <a class="search-result-card" style="display:block" href="${escapeHtml(href)}">
        <h4>${escapeHtml(h.doc.title)} <span style="font-weight:400;color:var(--ink-soft);font-size:.78rem">· ${escapeHtml(h.doc.category)}</span></h4>
        <div class="snippet">${highlight(h.snippet, q)}</div>
      </a>`;
    }).join("");
  });
}

function initSearchBox() {
  const input = document.getElementById("searchInput");
  const clearBtn = document.getElementById("searchClear");
  const resultsEl = document.getElementById("searchResults");
  const listArea = document.getElementById("listArea");
  if (!input || !resultsEl) return;
  let timer = null;
  input.addEventListener("input", () => {
    clearBtn.classList.toggle("show", input.value.length > 0);
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (input.value.trim()) {
        if (listArea) listArea.style.display = "none";
        runSearch(input.value, resultsEl);
      } else {
        resultsEl.innerHTML = "";
        if (listArea) listArea.style.display = "";
      }
    }, 200);
  });
  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.classList.remove("show");
    resultsEl.innerHTML = "";
    if (listArea) listArea.style.display = "";
    input.focus();
  });
}

/* 문서 페이지 내부: 본문 검색으로 들어온 경우 해당 단어 위치로 스크롤 + 하이라이트 */
function highlightIncomingQuery() {
  const params = new URLSearchParams(location.search);
  const q = params.get("q");
  if (!q) return;
  const content = document.querySelector(".doc-content");
  if (!content) return;
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
  let node;
  let firstMatch = null;
  const qLower = q.toLowerCase();
  while ((node = walker.nextNode())) {
    if (node.nodeValue.toLowerCase().includes(qLower)) {
      const span = document.createElement("mark");
      const idx = node.nodeValue.toLowerCase().indexOf(qLower);
      const before = node.nodeValue.slice(0, idx);
      const match = node.nodeValue.slice(idx, idx + q.length);
      const after = node.nodeValue.slice(idx + q.length);
      const frag = document.createDocumentFragment();
      frag.appendChild(document.createTextNode(before));
      span.textContent = match;
      frag.appendChild(span);
      frag.appendChild(document.createTextNode(after));
      node.parentNode.replaceChild(frag, node);
      if (!firstMatch) firstMatch = span;
    }
  }
  const hashTarget = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  const target = hashTarget || firstMatch;
  if (target) {
    setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
  }
}

/* ---------- 문서 페이지 메타데이터: trainings.js 단일 참조 ---------- */
function initTrainingPageMeta() {
  const id = document.body && document.body.dataset.trainingId;
  if (!id || typeof TRAININGS === "undefined") return;
  const item = TRAININGS.find(t => t.id === id);
  if (!item) return;
  const status = computeStatus(item);
  const badge = document.getElementById("statusBadge");
  if (badge) {
    badge.textContent = status.stale ? "⚠ 법령 및 지침 개정 여부 재검토 필요" : "● 자료 검토 완료";
    badge.className = `badge ${status.stale ? "warn" : "ok"}`;
  }
  const meta = document.getElementById("pageMeta");
  if (meta) meta.textContent = `기준일 ${fmtDate(item.baseDate)} · 최종 검토 ${fmtDate(item.reviewedDate)}`;
  const top = document.getElementById("pageTopMeta");
  if (top) top.innerHTML = `${item.year}학년도 적용<br>최종 업데이트 ${fmtDate(item.reviewedDate)}`;
  const footerMeta = document.getElementById("pageFooterMeta");
  if (footerMeta) footerMeta.textContent = `기준일 ${fmtDate(item.baseDate)} · 최종 검토 ${fmtDate(item.reviewedDate)}`;
}

document.addEventListener("DOMContentLoaded", () => {
  initTrainingPageMeta();
  initInAppBanner();
  initPanelToggles();
  initSelectivePrint();
  initSearchBox();
  highlightIncomingQuery();
  document.querySelectorAll("[data-print-btn]").forEach(b => b.addEventListener("click", guardedPrint));
});
