/**
 * generate_qr.js
 * -------------------------
 * Generates QR codes for each restaurant table that open the
 * Smart e-Menu (index.html) hosted by your server.
 */

const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

// 🖥️ Your deployed or local server URL
// 👉 Replace ngrok URL when redeployed (same as in server.js)
const baseUrl = "https://kirby-eudemonistic-loise.ngrok-free.dev";

// 📂 Ensure folder exists to save QR images
const qrDir = path.join(__dirname, "public", "qrcodes");
if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

// 🍽️ Generate QR codes for 5 tables
for (let table = 1; table <= 5; table++) {
  // Each QR opens the Smart e-Menu page for that table
  const url = `${baseUrl}/?table=${table}`;
  const filename = path.join(qrDir, `table${table}.png`);

  QRCode.toFile(
    filename,
    url,
    {
      width: 300,
      margin: 2,
      color: {
        dark: "#0b1220",   // restaurant dark theme
        light: "#ffffff",
      },
    },
    (err) => {
      if (err) throw err;
      console.log(`✅ QR Code generated for Table ${table}: ${filename}`);
    }
  );
}

console.log("\n🎉 All QR codes generated successfully!");
console.log("📁 Check the 'public/qrcodes' folder for PNG images.\n");
