"use strict";

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { nanoid } = require("nanoid");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

const DB_PATH = path.join(__dirname, "db.json");
const HISTORY_PATH = path.join(__dirname, "orders-history.json");

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "supersecretkey12345", // 🔒 change this in production
    resave: false,
    saveUninitialized: false,
  })
);

// --- Ensure history file exists ---
if (!fs.existsSync(HISTORY_PATH)) fs.writeFileSync(HISTORY_PATH, "[]");

// --- Helpers ---
function readDB() {
  const txt = fs.readFileSync(DB_PATH, "utf8");
  return JSON.parse(txt);
}
function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}
function saveToHistory(order) {
  const history = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf8"));
  history.unshift(order);
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

// --- Dummy Manager Credentials ---
const MANAGER = { username: "admin", password: "1234" };

// --- AUTH ROUTES ---
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username === MANAGER.username && password === MANAGER.password) {
    req.session.user = username;
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, msg: "Invalid credentials" });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// --- API: Menu ---
app.get("/api/menu", (req, res) => {
  const db = readDB();
  res.json({
    menu: db.menu,
    categories: Array.from(new Set(db.menu.map((m) => m.category))),
  });
});

// --- API: Place Order ---
app.post("/api/order", (req, res) => {
  const { table, items, total } = req.body || {};
  if (!table || !Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ error: "Invalid payload: table and at least one item required." });
  }

  const db = readDB();
  if (!db.tables.includes(Number(table))) {
    return res.status(400).json({ error: "Unknown table." });
  }

  const orderId = `ORD-${nanoid(6).toUpperCase()}`;
  const etaMinutes = 20 + Math.floor(Math.random() * 15);

  const order = {
    orderId,
    table: Number(table),
    items,
    total,
    etaMinutes,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  db.orders.unshift(order);
  db.kitchen.unshift({ ...order });
  writeDB(db);

  saveToHistory(order);

  res.json({ ok: true, orderId, etaMinutes });
});

// --- Manager Dashboard (Protected) ---
app.get("/api/manager/orders", (req, res) => {
  if (!req.session.user) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const history = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf8"));
  res.json({ orders: history });
});

// --- API: Get Order Status ---
app.get("/api/orders/:orderId", (req, res) => {
  const db = readDB();
  const order = db.orders.find((o) => o.orderId === req.params.orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});

// --- API: Kitchen queue ---
app.get("/api/kitchen", (req, res) => {
  const db = readDB();
  res.json({ orders: db.kitchen });
});

// --- API: Kitchen mark complete ---
app.post("/api/kitchen/:orderId/complete", (req, res) => {
  const db = readDB();
  const { orderId } = req.params;

  const kitchenOrder = db.kitchen.find((o) => o.orderId === orderId);
  const order = db.orders.find((o) => o.orderId === orderId);

  if (!kitchenOrder || !order)
    return res.status(404).json({ error: "Order not found" });

  kitchenOrder.status = "completed";
  order.status = "completed";
  order.completedAt = new Date().toISOString();

  writeDB(db);
  res.json({ ok: true });
});

// --- SPA fallback (optional) ---
app.get("*", (req, res, next) => {
  if (
    req.path.startsWith("/api/") ||
    req.path.endsWith(".html") ||
    req.path.includes(".")
  )
    return next();
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`Smart e-Menu running on http://localhost:${PORT}`);
});
