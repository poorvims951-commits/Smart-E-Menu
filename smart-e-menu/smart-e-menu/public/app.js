"use strict";

/** -----------------------------
 * Utility & App State
 * ------------------------------*/
const $ = (sel) => document.querySelector(sel);
const app = $("#app");
$("#year").textContent = new Date().getFullYear();

const state = {
  table: null,
  lockedTable: false,   // 🚨 NEW: track if table came from QR
  categories: [],
  menu: [],
  activeCategory: "All",
  cart: []
};

function getQueryParam(name){
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}
function saveCart(){
  if (!state.table) return;
  localStorage.setItem(`cart_table_${state.table}`, JSON.stringify(state.cart));
}
function loadCart(){
  if (!state.table) return;
  const raw = localStorage.getItem(`cart_table_${state.table}`);
  state.cart = raw ? JSON.parse(raw) : [];
  syncCartBadge();
}
function syncCartBadge(){
  const count = state.cart.reduce((sum, it) => sum + it.qty, 0);
  $("#cart-count").textContent = count;
}
function currency(n){ return `₹${n}`; }

/** Placeholder SVG image generator */
function svgPlaceholder(text){
  const fg = "0f172a"; // slate
  const t = encodeURIComponent(text);
  return `data:image/svg+xml;utf8,
  <svg xmlns='http://www.w3.org/2000/svg' width='600' height='380'>
    <rect width='100%' height='100%' fill='#fff7ed'/>
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
          font-family='Segoe UI, Roboto, Arial' font-weight='700' font-size='40'
          fill='#${fg}'>${t}</text>
  </svg>`;
}

/** -----------------------------
 * Rendering Views
 * ------------------------------*/
function render(){
  const route = location.hash.replace("#","") || "home";
  if (route === "home") return renderHome();
  if (route === "menu") return renderMenu();
  if (route === "cart") return renderCart();
  if (route.startsWith("confirm")) return renderConfirm();
  renderHome();
}

function renderHome(){
  app.innerHTML = `
    <div class="container">
      <section class="hero">
        <h2>Welcome to <strong>Southern Spice</strong></h2>
        <p class="muted">Scan · Browse · Order — no app needed.</p>
        <div class="section" style="margin-top:16px">
          <h3>Your Table</h3>
          <p class="small">Select your table (1–5). If you scanned a QR, this is pre-filled.</p>
          <div class="table-picker" id="table-picker"></div>
          <div style="margin-top:12px; display:flex; gap:8px;">
            <a class="btn" href="#menu">Start Ordering</a>
            <a class="btn ghost" href="#cart">View Cart</a>
          </div>
        </div>
        <div class="section">
          <h3>Categories</h3>
          <div class="tabs" id="tabs"></div>
        </div>
      </section>

      <section class="section">
        <h3>Popular Dishes</h3>
        <div class="grid" id="popular"></div>
      </section>
    </div>
  `;
  renderTablePicker();
  renderTabs();
  renderPopular();
}

function renderTablePicker(){
  const c = $("#table-picker");
  c.innerHTML = "";
  const tables = [1,2,3,4,5];
  tables.forEach(t => {
    const b = document.createElement("button");
    b.className = "table-btn" + (state.table == t ? " active" : "");
    b.textContent = "Table " + t;

    // 🚨 If locked, disable all other tables
    if (state.lockedTable && state.table !== t) {
      b.disabled = true;
      b.classList.add("disabled");
    } else {
      b.onclick = () => {
        state.table = t;
        localStorage.setItem("table", t);
        render(); // refresh
      };
    }

    c.appendChild(b);
  });
}

function renderTabs(){
  const tabs = $("#tabs");
  tabs.innerHTML = "";
  const allCats = ["All", ...state.categories];
  allCats.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "tab" + (state.activeCategory === cat ? " active" : "");
    btn.textContent = cat;
    btn.onclick = () => { state.activeCategory = cat; location.hash = "#menu"; };
    tabs.appendChild(btn);
  });
}

function renderPopular(){
  const box = $("#popular");
  const picks = state.menu.slice(0, 4);
  picks.forEach(item => box.appendChild(menuCard(item)));
}

function renderMenu(){
  app.innerHTML = `
    <div class="container">
      <div class="section">
        <h2>Menu</h2>
        <div class="tabs" id="tabs"></div>
      </div>
      <div class="grid" id="menu-grid"></div>
    </div>
  `;
  renderTabs();

  const list = state.menu.filter(it => state.activeCategory === "All" || it.category === state.activeCategory);
  const grid = $("#menu-grid");
  grid.innerHTML = "";
  list.forEach(item => grid.appendChild(menuCard(item)));
}

function menuCard(item){
  const card = document.createElement("div");
  card.className = "card";
  const cover = document.createElement("div");
  cover.className = "cover";

  const img = document.createElement("img");
  img.alt = item.name;
  img.src = (item.image === "placeholder") ? svgPlaceholder(item.name) : item.image;
  cover.appendChild(img);

  const title = document.createElement("h3");
  title.textContent = item.name;

  const desc = document.createElement("p");
  desc.textContent = item.description;

  const row = document.createElement("div");
  row.className = "row";
  const price = document.createElement("div");
  price.className = "price";
  price.textContent = currency(item.price);

  const btn = document.createElement("button");
  btn.className = "btn";
  btn.textContent = "Add to Cart";
  btn.onclick = () => addToCart(item);

  row.append(price, btn);
  card.append(cover, title, desc, row);
  return card;
}

function renderCart(){
  const sum = state.cart.reduce((s,it)=> s + it.price * it.qty, 0);
  app.innerHTML = `
    <div class="container">
      <div class="section">
        <h2>Your Cart</h2>
        <div class="cart-list" id="cart-list"></div>
        <div class="hr"></div>
        <div class="total">
          <span>Total</span>
          <span>${currency(sum)}</span>
        </div>
        <div style="display:flex; gap:8px; margin-top:12px;">
          <a class="btn ghost" href="#menu">Continue Shopping</a>
          <button class="btn secondary" ${!state.table || state.cart.length === 0 ? "disabled" : ""} id="place">Place Order</button>
        </div>
      </div>
    </div>
  `;

  const list = $("#cart-list");
  state.cart.forEach((it, idx) => {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <div><strong>${it.name}</strong><div class="small">${currency(it.price)}</div></div>
      <div class="qty">
        <button class="table-btn" data-act="dec">-</button>
        <span>${it.qty}</span>
        <button class="table-btn" data-act="inc">+</button>
      </div>
      <div>${currency(it.price * it.qty)}</div>
    `;
    row.querySelector('[data-act="dec"]').onclick = () => changeQty(idx, -1);
    row.querySelector('[data-act="inc"]').onclick = () => changeQty(idx, +1);
    list.appendChild(row);
  });

  const place = $("#place");
  if (place) place.onclick = async () => {
    const payload = {
      table: state.table,
      items: state.cart.map(({ id, name, price, qty }) => ({ id, name, price, qty })),
      total: state.cart.reduce((s,it)=> s + it.price * it.qty, 0)
    };
    const res = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.ok) {
      // Clear cart and show confirmation
      state.cart = [];
      saveCart();
      syncCartBadge();
      location.hash = `confirm?orderId=${data.orderId}&eta=${data.etaMinutes}`;
    } else {
      alert("Could not place order. Please try again.");
    }
  };
}

function renderConfirm(){
  const url = new URL(window.location.href);
  const orderId = url.searchParams.get("orderId") || "UNKNOWN";
  const eta = url.searchParams.get("eta") || "—";
  app.innerHTML = `
    <div class="container">
      <div class="confirm section">
        <h2>✅ Order Confirmed!</h2>
        <p>Thank you. Your order is on the way to the kitchen.</p>
        <p>Order ID: <code>${orderId}</code></p>
        <p>Estimated time: <strong>${eta} minutes</strong></p>
        <div style="margin-top:16px;">
          <a class="btn" href="#menu">Add More</a>
          <a class="btn ghost" href="#home">Home</a>
        </div>
      </div>
    </div>
  `;
}

/** -----------------------------
 * Cart ops
 * ------------------------------*/
function addToCart(item){
  const idx = state.cart.findIndex(it => it.id === item.id);
  if (idx >= 0) state.cart[idx].qty += 1;
  else state.cart.push({ id:item.id, name:item.name, price:item.price, qty:1 });
  saveCart();
  syncCartBadge();
}

function changeQty(index, delta){
  state.cart[index].qty += delta;
  if (state.cart[index].qty <= 0) state.cart.splice(index, 1);
  saveCart();
  renderCart();
  syncCartBadge();
}

/** -----------------------------
 * Init
 * ------------------------------*/
async function init(){
  const qTable = getQueryParam("table");
  const savedTable = localStorage.getItem("table");

  if (qTable) {
    state.table = Number(qTable);
    state.lockedTable = true;   // 🚨 QR → locked
  } else if (savedTable) {
    state.table = Number(savedTable);
    state.lockedTable = false;  // manual selection
  } else {
    state.table = null;
    state.lockedTable = false;
  }

  const res = await fetch("/api/menu");
  const data = await res.json();
  state.menu = data.menu;
  state.categories = data.categories;

  loadCart();
  render();
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", init);
