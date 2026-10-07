const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const keys = new Map();

function generateKey(type = 'FREE') {
  const raw = crypto.randomBytes(16).toString('hex').toUpperCase();
  const key = `${type}-${raw.slice(0,8)}-${raw.slice(8,16)}`;
  const expires = type === 'VIP'
    ? Date.now() + 30 * 24 * 3600 * 1000
    : Date.now() + 24 * 3600 * 1000;
  keys.set(key, { type, device_id: null, created: Date.now(), expires });
  return key;
}

for (let i = 0; i < 5; i++) generateKey('FREE');
for (let i = 0; i < 2; i++) generateKey('VIP');

app.post('/api/login', (req, res) => {
  const { key, device_id } = req.body;
  if (!key || !device_id) return res.json({ code: 'error', msg: 'Thiếu key hoặc device_id' });
  const entry = keys.get(key.trim().toUpperCase());
  if (!entry) return res.json({ code: 'not_found', msg: 'Key không tồn tại' });
  if (Date.now() > entry.expires) return res.json({ code: 'expired', msg: 'Key đã hết hạn' });
  if (!entry.device_id) { entry.device_id = device_id; }
  else if (entry.device_id !== device_id) return res.json({ code: 'device_mismatch', msg: 'Key đã dùng thiết bị khác' });
  res.json({ code: 'active', type: entry.type, seconds_left: Math.floor((entry.expires - Date.now()) / 1000), msg: 'Đăng nhập thành công' });
});

app.post('/api/getkey', (req, res) => {
  const key = generateKey('FREE');
  res.json({ code: 'ok', key, expires_in: '24h' });
});

app.post('/api/findkey', (req, res) => {
  res.json({ code: 'not_found', msg: 'Không tìm thấy key cho IP này' });
});

app.get('/api/status', (req, res) => {
  res.json({ online: true, keys_total: keys.size, version: '23.7.20' });
});

app.post('/api/admin/create', (req, res) => {
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) return res.status(401).json({ code: 'unauthorized' });
  const key = generateKey(req.body.type === 'VIP' ? 'VIP' : 'FREE');
  res.json({ code: 'ok', key });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
