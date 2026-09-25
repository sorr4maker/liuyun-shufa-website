/* ============================================================
   留云诗墨书法院 · 官网交互脚本
   ------------------------------------------------------------
   ⚠️ 集中配置区：以下信息为全站唯一数据源。
   后续修改电话、微信、地址、学费、老师介绍等，
   只需修改 CONFIG 对象，页面各处会自动同步更新。
   ============================================================ */
const CONFIG = {
  schoolName: "留云诗墨书法院",
  slogan: "习字明理，以墨养心",
  phone: "13829226945",
  wechat: "13829226945",
  address: "广东省东莞市石碣镇樱桃路1号二楼",
  ageRange: "5岁以上",
  schedule: "全年招生，具体时间请提前联系；休假会提前通知",
  // 备案通过后填入工信部核发的完整备案号
  icpBeian: "",
  year: new Date().getFullYear(),

  // ============================================================
  // 相关活动（首页底部板块）：新增/删除活动只改这个数组。
  // 用法：复制一段 { ... } 放到数组最前面（新的显示在前面），
  // 改 date / title / desc / status 四个字段；
  // statusType 填 "is-done"（已举办，金色）或不填（筹备中，灰色）；
  // link 填公众号文章或媒体报道网址，没有就删掉 link 和 linkText 两行。
  // ============================================================
  activities: [
    {
      date: "2025年11月15日-30日 · 东城展览馆",
      title: "留云翰墨·薪火相承：黄海忠师生书法临创作品展",
      desc: "东莞市书法家协会等指导，中共东莞市书法家协会支部委员会、东城文化服务中心主办，本院承办。师生临创作品80余幅参展，涵盖篆、隶、楷、行、草多种书体。",
      status: "已圆满举办",
      statusType: "is-done",
      link: "https://pub.timedg.com/s/2025-11/19/AP691d868ce4b004aa49ef206e.html",
      linkText: "媒体报道"
    },
    {
      date: "2024年8月26日 · 本地生活号「石碣圈」专题报道",
      title: "这家开了12年的书法学校来到石碣",
      desc: "「石碣圈」专题报道本院进驻石碣：少儿硬笔、少儿软笔、成人书法三大习字方向，中式水墨风格院区环境，同期开放免费体验。",
      status: "媒体报道",
      statusType: "is-done",
      link: "https://mp.weixin.qq.com/s/PRmOIqiCzmP4g0SH6cVgqw",
      linkText: "阅读原文"
    }
  ],

};

/* ============================================================
   工具函数
   ============================================================ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ---------- Toast 轻提示 ---------- */
let toastTimer = null;
function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  // 强制重排以触发过渡
  void toast.offsetWidth;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => { toast.hidden = true; }, 320);
  }, 2400);
}

/* ---------- 一键复制 ---------- */
async function copyText(text, successMsg) {
  if (!text) return;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // 降级方案（非安全上下文）
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.className = "copy-buffer";
      ta.setAttribute("aria-hidden", "true");
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    showToast(successMsg);
  } catch (err) {
    showToast("复制失败，请长按手动复制：" + text);
  }
}

/* ============================================================
   1. 联系方式集中注入
   ============================================================ */
function injectContactFields() {
  $$("[data-field]").forEach((el) => {
    const key = el.dataset.field;
    if (CONFIG[key] !== undefined && CONFIG[key] !== null) {
      el.textContent = String(CONFIG[key]);
    }
  });
  // 所有 tel: 链接同步
  $$('a[href^="tel:"]').forEach((a) => {
    a.href = `tel:${CONFIG.phone}`;
  });
  const icpRow = $("#icpRow");
  if (icpRow) {
    icpRow.hidden = !String(CONFIG.icpBeian || "").trim();
  }
}

/* ============================================================
   2. 顶部导航：页面状态 + 移动端折叠菜单
   ============================================================ */
const header = $("#siteHeader");
const navToggle = $("#navToggle");
const mainNav = $("#mainNav");
const pageTopSentinel = $("#pageTopSentinel");

if (header && pageTopSentinel) {
  const headerObserver = new IntersectionObserver(([entry]) => {
    header.classList.toggle("is-scrolled", !entry.isIntersecting);
  });
  headerObserver.observe(pageTopSentinel);
}

if (navToggle && mainNav) {
  navToggle.addEventListener("click", () => {
    const open = mainNav.classList.toggle("is-open");
    document.body.classList.toggle("is-menu-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
  });
}

/* ============================================================
   3. 单页视图路由：点击导航切换内容区块
   ------------------------------------------------------------
   每个 <section data-view="..."> 是一个"页面"，
   点导航 → 显示对应视图，隐藏其余；支持 URL hash 直达
   （#about / #courses ...），刷新或分享链接都能回到原页。
   ============================================================ */
const viewSections = $$("[data-view]");
const navLinks = $$(".nav-link");

// 视图分组：一个导航目标可同时激活多个区块。
// 首页 = 首屏 + 免费体验流程 + 相关活动；
// 联系我们 = 仅联系信息与地图（不含体验流程）。
const VIEW_GROUPS = {
  home: ["home", "experience", "activities"],
  contact: ["contact"],
};

function validHash(name) {
  const group = VIEW_GROUPS[name] || [name];
  return group.some((v) => viewSections.some((s) => s.dataset.view === v));
}

function showView(name) {
  if (!name) name = "home";
  const group = VIEW_GROUPS[name] || [name];
  viewSections.forEach((sec) => {
    sec.classList.toggle("is-active", group.includes(sec.dataset.view));
  });
  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${name}`);
  });
  // 切换视图后回到顶部
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  // 手动触发该视图内的淡入动效（隐藏区块的 reveal 不会被滚动观察器触发）
  viewSections.forEach((sec) => {
    if (group.includes(sec.dataset.view)) {
      sec.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
    }
  });
  // 更新 aria 状态
  const activeLink = navLinks.find((l) => l.getAttribute("href") === `#${name}`);
  navLinks.forEach((l) => l.setAttribute("aria-current", l === activeLink ? "page" : "false"));
}

// 导航点击：切换视图 + 更新地址栏 hash + 收起移动端菜单
navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const name = link.getAttribute("href").slice(1);
    showView(name);
    if (location.hash !== `#${name}`) {
      history.pushState({ view: name }, "", `#${name}`);
    }
    if (mainNav && navToggle) {
      mainNav.classList.remove("is-open");
      document.body.classList.remove("is-menu-open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "打开菜单");
    }
  });
});

// 浏览器前进/后退、或用户手动改地址栏 hash
function showViewFromLocation() {
  const name = location.hash.slice(1);
  showView(name && validHash(name) ? name : "home");
}

window.addEventListener("hashchange", showViewFromLocation);
window.addEventListener("popstate", showViewFromLocation);

// 点击品牌 logo 回到首页视图
const brandLink = $(".brand");
if (brandLink) {
  brandLink.addEventListener("click", (e) => {
    e.preventDefault();
    showView("home");
    if (location.hash !== "#home") {
      history.pushState({ view: "home" }, "", "#home");
    }
    if (mainNav && navToggle) {
      mainNav.classList.remove("is-open");
      document.body.classList.remove("is-menu-open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "打开菜单");
    }
  });
}

/* ============================================================
   4. 联系弹窗
   ============================================================ */
const modal = $("#contactModal");
let lastFocused = null;

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(",");

function getFocusableElements(dialog) {
  return $$(FOCUSABLE_SELECTOR, dialog).filter((el) => !el.hidden && el.getAttribute("aria-hidden") !== "true");
}

function trapFocus(event, dialog) {
  if (event.key !== "Tab" || !dialog || dialog.hidden) return;
  const focusable = getFocusableElements(dialog);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function updateDialogState() {
  const hasOpenDialog = (modal && !modal.hidden) || (lightbox && !lightbox.hidden);
  document.body.classList.toggle("is-dialog-open", Boolean(hasOpenDialog));
}

function openModal() {
  if (!modal) return;
  lastFocused = document.activeElement;
  modal.hidden = false;
  updateDialogState();
  const focusable = modal.querySelector("a, button");
  if (focusable) setTimeout(() => focusable.focus(), 60);
}

function closeModal() {
  if (!modal) return;
  modal.hidden = true;
  updateDialogState();
  if (lastFocused) lastFocused.focus();
}

$$(".js-open-contact").forEach((btn) => btn.addEventListener("click", openModal));
$$(".js-close-modal").forEach((el) => el.addEventListener("click", closeModal));

/* ============================================================
   5. 微信咨询：复制微信号
   ============================================================ */
async function handleWechat() {
  await copyText(CONFIG.wechat, `微信号 ${CONFIG.wechat} 已复制，请前往微信添加`);
}

$$(".js-wechat-action").forEach((btn) => btn.addEventListener("click", handleWechat));
$$(".js-copy-wechat").forEach((btn) => btn.addEventListener("click", handleWechat));

/* ============================================================
   6. 复制地址
   ============================================================ */
$$(".js-copy-address").forEach((btn) =>
  btn.addEventListener("click", () => copyText(CONFIG.address, "地址已复制，可粘贴到地图App导航"))
);

/* ============================================================
   7. 师生作品：点击查看大图
   ============================================================ */
const workCards = $$(".work-card");

/* ---------- Lightbox 大图预览 ---------- */
const lightbox = $("#lightbox");
const lightboxTitle = $("#lightboxTitle");
const lightboxTag = $("#lightboxTag");
let lightboxLastFocused = null;

function setLightboxImage(sourceImage, title, tag = "", orientation = "portrait") {
  if (!lightbox || !sourceImage) return;
  lightboxLastFocused = document.activeElement;
  const lbContent = $(".lightbox-content", lightbox);
  const lbMedia = $(".lightbox-media", lightbox);
  if (!lbMedia) return;
  for (const mode of ["landscape", "wide", "tall"]) {
    if (lbContent) lbContent.classList.toggle(`is-${mode}`, orientation === mode);
    lbMedia.classList.toggle(`is-${mode}`, orientation === mode);
  }
  lbMedia.tabIndex = orientation === "tall" ? 0 : -1;

  const previewImage = document.createElement("img");
  if (sourceImage.srcset) previewImage.srcset = sourceImage.srcset;
  previewImage.src = sourceImage.currentSrc || sourceImage.src;
  previewImage.alt = sourceImage.alt || "";
  lbMedia.replaceChildren(previewImage);

  if (lightboxTitle) lightboxTitle.textContent = title || "作品预览";
  if (lightboxTag) lightboxTag.textContent = tag;
  lightbox.hidden = false;
  updateDialogState();
  const closeButton = $(".lightbox-close", lightbox);
  if (closeButton) setTimeout(() => closeButton.focus(), 60);
}

function openLightbox(card) {
  if (!lightbox || !card) return;
  const caption = card.querySelector(".work-caption");
  const catEl = card.querySelector(".work-cat");
  const orientation = card.dataset.orientation || (card.dataset.category === "environment" ? "landscape" : "portrait");
  const firstImg = card.querySelector(".work-media img");
  setLightboxImage(
    firstImg,
    caption ? caption.textContent : "作品预览",
    catEl ? catEl.textContent : "",
    orientation
  );
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.hidden = true;
  updateDialogState();
  if (lightboxLastFocused) lightboxLastFocused.focus();
}

workCards.forEach((card) => {
  card.addEventListener("click", () => openLightbox(card));
  card.setAttribute("tabindex", "0");
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", "查看作品大图");
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openLightbox(card);
    }
  });
});

/* 老师海报：鼠标与键盘均可打开预览 */
$$(".teacher-poster").forEach((poster) => {
  const img = poster.querySelector("img");
  const cap = poster.querySelector("figcaption");
  const openTeacherPoster = () => setLightboxImage(img, cap ? cap.textContent : "老师介绍");
  poster.setAttribute("tabindex", "0");
  poster.setAttribute("role", "button");
  poster.setAttribute("aria-label", `查看${cap ? cap.textContent : "老师介绍"}大图`);
  poster.addEventListener("click", openTeacherPoster);
  poster.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openTeacherPoster();
    }
  });
});

$$(".js-close-lightbox").forEach((el) => el.addEventListener("click", closeLightbox));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (lightbox && !lightbox.hidden) {
      closeLightbox();
    } else if (modal && !modal.hidden) {
      closeModal();
    }
    return;
  }
  if (lightbox && !lightbox.hidden) {
    trapFocus(event, lightbox);
  } else if (modal && !modal.hidden) {
    trapFocus(event, modal);
  }
});

/* ============================================================
   8. 淡入动效与页面顶部状态
   ============================================================ */

/* 相关活动：由 CONFIG.activities 数据渲染，新增活动只改 CONFIG */
function renderActivities() {
  const grid = $("#activitiesGrid");
  if (!grid || !Array.isArray(CONFIG.activities)) return;
  const cards = CONFIG.activities.map((activity) => {
    const card = document.createElement("article");
    card.className = "activity-card";

    const date = document.createElement("p");
    date.className = "activity-date";
    date.textContent = activity.date || "";

    const title = document.createElement("h3");
    title.className = "activity-title";
    title.textContent = activity.title || "";

    const description = document.createElement("p");
    description.className = "activity-desc";
    description.textContent = activity.desc || "";

    const footer = document.createElement("div");
    footer.className = "activity-foot";
    const status = document.createElement("span");
    status.className = "activity-status";
    if (activity.statusType === "is-done") status.classList.add("is-done");
    status.textContent = activity.status || "";
    footer.appendChild(status);

    if (activity.link) {
      const link = document.createElement("a");
      link.className = "activity-link";
      link.href = activity.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = activity.linkText || "查看详情";
      footer.appendChild(link);
    }

    card.append(date, title, description, footer);
    return card;
  });
  grid.replaceChildren(...cards);
}
renderActivities();

const revealEls = $$(".section-head, .feature-card, .course-card, .work-card, .step-item, .teacher-poster, .contact-grid, .activity-card");

/* 返回顶部：离开页面顶部后出现 */
const backToTop = $("#backToTop");
if (backToTop && pageTopSentinel) {
  const backToTopObserver = new IntersectionObserver(([entry]) => {
    const isVisible = !entry.isIntersecting;
    backToTop.classList.toggle("is-visible", isVisible);
    backToTop.setAttribute("aria-hidden", String(!isVisible));
    backToTop.tabIndex = isVisible ? 0 : -1;
  }, { rootMargin: "600px 0px 0px 0px" });
  backToTopObserver.observe(pageTopSentinel);
  backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });

revealEls.forEach((el) => {
  el.classList.add("reveal");
  revealObserver.observe(el);
});

/* ============================================================
   初始化
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  injectContactFields();
  // 竖排题字：每字一个 span，避免 writing-mode 折列导致文字错乱
  $$(".section-title-vertical").forEach((el) => {
    const text = el.textContent.replace(/\s+/g, "");
    if (!text || el.querySelector("span")) return;
    el.textContent = "";
    Array.from(text).forEach((ch) => {
      const s = document.createElement("span");
      s.textContent = ch;
      el.appendChild(s);
    });
  });
  // 进入页面默认显示首页；若地址栏带 #xxx 则直达对应视图
  const initial = location.hash.slice(1);
  showView(initial && validHash(initial) ? initial : "home");
});
