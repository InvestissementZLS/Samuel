const QRCode = require('qrcode');

QRCode.toFile('C:\\Users\\samue\\.gemini\\antigravity\\brain\\ccc1cd30-83ec-435f-8b79-159814fd3ca3\\expo_qr.png', 'exp://192.168.2.15:8081', {
  color: {
    dark: '#000000',
    light: '#ffffff'
  }
}, function (err) {
  if (err) throw err;
  console.log('done');
});
