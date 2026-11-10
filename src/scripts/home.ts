// Homepage behaviour: mobile menu, systems accordion, key-marker on the systems strip, open/closed state (Europe/Kyiv).
// Everything here is an enhancement: without scripts the content, anchors and the schedule are all visible.
import { HOURS } from "../data/home";

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

/* ---------- Mobile menu ---------- */
const toggle = document.querySelector<HTMLButtonElement>(".menu-toggle");
const menu = document.getElementById("mobile-menu");
function setMenu(open: boolean) {
  if (!toggle || !menu) return;
  toggle.setAttribute("aria-expanded", String(open));
  menu.hidden = !open;
  document.documentElement.classList.toggle("menu-open", open);
  if (open) menu.querySelector<HTMLElement>("a")?.focus();
}
toggle?.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
menu?.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest("a")) setMenu(false); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && toggle?.getAttribute("aria-expanded") === "true") { setMenu(false); toggle.focus(); }
});
window.matchMedia("(min-width: 75em)").addEventListener("change", (m) => { if (m.matches) setMenu(false); });

/* ---------- Systems accordion ---------- */
// Closed panels: grid rows 0fr (CSS under .js), then hidden="until-found" — not focusable, still found by Ctrl+F.
const items = Array.from(document.querySelectorAll<HTMLElement>(".sys"));
const OPEN_MS = 320;
const timers = new WeakMap<HTMLElement, number>();
function setOpen(li: HTMLElement, open: boolean) {
  const btn = li.querySelector<HTMLButtonElement>(".sys__btn");
  const clip = li.querySelector<HTMLElement>(".sys__clip");
  if (!clip || li.hasAttribute("data-open") === open) return;
  window.clearTimeout(timers.get(li));
  btn?.setAttribute("aria-expanded", String(open));
  if (open) {
    clip.removeAttribute("hidden");
    void clip.offsetHeight; // commit the closed state so the transition runs
    li.setAttribute("data-open", "");
  } else {
    li.removeAttribute("data-open");
    timers.set(li, window.setTimeout(() => clip.setAttribute("hidden", "until-found"), reduce.matches ? 0 : OPEN_MS));
  }
}
function openSystem(id: string, only = false) {
  for (const li of items) {
    if (li.dataset.sys === id) setOpen(li, only ? true : !li.hasAttribute("data-open"));
    else if (only) setOpen(li, false);
  }
  markCurrent(id);
}
for (const li of items) {
  const clip = li.querySelector<HTMLElement>(".sys__clip");
  if (!li.hasAttribute("data-open")) clip?.setAttribute("hidden", "until-found");
  clip?.addEventListener("beforematch", () => openSystem(li.dataset.sys || "", true));
  li.querySelector(".sys__btn")?.addEventListener("click", () => openSystem(li.dataset.sys || ""));
}

/* ---------- Systems strip + key-marker ---------- */
const strip = document.querySelector<HTMLElement>("[data-systems]");
const marker = strip?.querySelector<HTMLElement>("[data-marker]");
const cells = Array.from(strip?.querySelectorAll<HTMLAnchorElement>("a.systems__item") || []);
let current = cells[0];
const wide = window.matchMedia("(min-width: 75em)");

function markerTransform(cell: HTMLElement) {
  const wrap = marker?.parentElement;
  if (!wrap) return "none";
  const w = wrap.getBoundingClientRect();
  const r = cell.getBoundingClientRect();
  return `translate3d(${r.left - w.left}px,0,0) scaleX(${r.width / 100})`;
}
function placeMarker(cell: HTMLElement | undefined) {
  if (!marker || !cell || !wide.matches) return;
  marker.style.transform = markerTransform(cell);
}
function markCurrent(id: string) {
  const cell = cells.find((c) => c.dataset.system === id);
  if (!cell) return;
  cells.forEach((c) => c.classList.toggle("is-current", c === cell));
  current = cell;
  placeMarker(cell);
}
for (const cell of cells) {
  cell.addEventListener("click", (e) => {
    const id = cell.dataset.system || "";
    const li = items.find((x) => x.dataset.sys === id);
    if (!li) return;
    e.preventDefault();
    openSystem(id, true);
    li.scrollIntoView({ behavior: reduce.matches ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#sys-${id}`);
    li.querySelector<HTMLButtonElement>(".sys__btn")?.focus({ preventScroll: true });
  });
  cell.addEventListener("pointerenter", () => placeMarker(cell));
  cell.addEventListener("focus", () => placeMarker(cell));
}
strip?.addEventListener("pointerleave", () => placeMarker(current));
strip?.addEventListener("focusout", (e) => { if (!strip.contains(e.relatedTarget as Node)) placeMarker(current); });

function initMarker() {
  if (!marker || !cells.length) return;
  if (!wide.matches) { marker.style.transform = ""; return; }
  strip?.classList.add("has-marker");
  const first = cells[0];
  const last = cells[cells.length - 1];
  if (reduce.matches || !("animate" in marker)) { placeMarker(current); return; }
  // Effect 1 (§8.7): one pass along the 9 systems after load, stops on «Діагностика авто».
  marker.style.transition = "none";
  const anim = marker.animate(
    [
      { transform: markerTransform(first), offset: 0 },
      { transform: markerTransform(last), offset: 0.66 },
      { transform: markerTransform(first), offset: 1 },
    ],
    { duration: 900, easing: "cubic-bezier(.65,0,.35,1)", delay: 350 },
  );
  placeMarker(current);
  anim.finished.finally(() => { marker.style.transition = ""; });
}
document.fonts?.ready.then(initMarker) ?? initMarker();
let raf = 0;
window.addEventListener("resize", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (wide.matches) { strip?.classList.add("has-marker"); placeMarker(current); } }); });

// Deep link #sys-<id> opens that system.
const hash = location.hash.match(/^#sys-([\w-]+)$/);
if (hash && items.some((x) => x.dataset.sys === hash[1])) openSystem(hash[1], true);

/* ---------- Open / closed (Europe/Kyiv, C-005) ---------- */
const DAY_ACC = ["у неділю", "у понеділок", "у вівторок", "у середу", "у четвер", "у п’ятницю", "у суботу"];
const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
function kyivNow() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Kyiv", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "0";
  return { day: WD[get("weekday")] ?? 0, min: Number(get("hour")) * 60 + Number(get("minute")) };
}
function hoursState() {
  const { day, min } = kyivNow();
  const today = HOURS[day];
  const todayText = today ? `Сьогодні: ${today[0]}:00–${today[1]}:00` : "Сьогодні вихідний";
  if (today && min >= today[0] * 60 && min < today[1] * 60) return { todayText, open: true, status: `Відкрито до ${today[1]}:00` };
  if (today && min < today[0] * 60) return { todayText, open: false, status: `Зачинено, відкриємось сьогодні о ${today[0]}:00` };
  for (let k = 1; k <= 7; k += 1) {
    const d = (day + k) % 7;
    const h = HOURS[d];
    if (h) return { todayText, open: false, status: `Зачинено, відкриємось ${k === 1 ? "завтра" : DAY_ACC[d]} о ${h[0]}:00` };
  }
  return { todayText, open: false, status: "Зачинено" };
}
function renderHours() {
  const s = hoursState();
  document.querySelectorAll<HTMLElement>("[data-hours]").forEach((el) => {
    el.querySelector("[data-hours-today]")!.textContent = s.todayText;
    const st = el.querySelector<HTMLElement>("[data-hours-status]")!;
    st.textContent = s.status;
    st.classList.toggle("is-open", s.open);
    el.hidden = false;
  });
  document.documentElement.classList.add("hours-ready");
}
renderHours();
setInterval(renderHours, 60_000);
