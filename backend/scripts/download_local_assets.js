const https = require('https');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.resolve(__dirname, '../../frontend/public/assets');

const IMAGES_TO_DOWNLOAD = [
  // KOL Avatars
  {
    filename: 'kol-avatar-thang.jpg',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  },
  {
    filename: 'kol-avatar-ha.jpg',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
  },
  {
    filename: 'kol-avatar-depxinh.jpg',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
  },
  {
    filename: 'kol-avatar-nghia.jpg',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
  },
  {
    filename: 'kol-avatar-nam.jpg',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
  },
  // Shop Logos
  {
    filename: 'shop-sora-skin.jpg',
    url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80',
  },
  {
    filename: 'shop-techstore.jpg',
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=80',
  },
  {
    filename: 'shop-my-pham-xanh.jpg',
    url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&auto=format&fit=crop&q=80',
  },
  {
    filename: 'shop-store-a.jpg',
    url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&auto=format&fit=crop&q=80',
  },
  {
    filename: 'shop-store-b.jpg',
    url: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&auto=format&fit=crop&q=80',
  },
  {
    filename: 'shop-flagship.jpg',
    url: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&auto=format&fit=crop&q=80',
  },
  {
    filename: 'shop-real-db.jpg',
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&auto=format&fit=crop&q=80',
  },
];

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImage(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download: status ${res.statusCode}`));
      }
      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close(() => resolve());
      });
      fileStream.on('error', (err) => {
        fs.unlink(dest, () => reject(err));
      });
    }).on('error', reject);
  });
}

async function main() {
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }

  console.log('Bắt đầu tải các ảnh .jpg/.png cục bộ vào frontend/public/assets...');
  for (const item of IMAGES_TO_DOWNLOAD) {
    const dest = path.join(ASSETS_DIR, item.filename);
    try {
      await downloadImage(item.url, dest);
      const stats = fs.statSync(dest);
      console.log(`✔ Đã lưu file cục bộ: ${item.filename} (${(stats.size / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`✖ Lỗi khi tải ${item.filename}:`, err.message);
    }
  }
  console.log('Hoàn thành tải ảnh cục bộ!');
}

main();
