const QRCode = require("qrcode");

// Use your deployed URL (Render/ngrok/etc.)
const baseUrl = "https://21b785d40ca1.ngrok-free.app";  

// Generate QR codes for 5 tables
for (let table = 1; table <= 5; table++) {
  // 👇 Only customer dashboard, not kitchen
  const url = `${baseUrl}/?table=${table}`;
  const filename = `table${table}_qr.png`;

  QRCode.toFile(
    filename,
    url,
    {
      color: {
        dark: "#000000",
        light: "#ffffff"
      }
    },
    function (err) {
      if (err) throw err;
      console.log(`✅ Customer QR Code generated for Table ${table}: ${filename}`);
    }
  );
}

