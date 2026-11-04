const fs = require('fs');

// 1. MarketplacePage.tsx
let mp = fs.readFileSync('frontend/src/pages/public/MarketplacePage.tsx', 'utf8');
mp = mp.replace(
  'id="catalog-section" className="w-full scroll-mt-36 bg-[#F5EFE6] py-7 text-left lg:py-9"',
  'id="catalog-section" className="w-full scroll-mt-36 bg-[#FAF8F5] py-7 text-left lg:py-9"'
);

const oldHeader = `        {/* SCANMS Standard "KHÁM PHÁ SẢN PHẨM" Header */}
        <div className="mb-5 rounded-2xl bg-[#FAF7F2] border border-[#DFD6C5] border-b-[3px] border-b-[#C59B58] shadow-[0_2px_12px_rgba(35,29,21,0.04)]">
          <div className="py-3.5 sm:py-4 px-4 text-center">
            <h2
              className="m-0 text-base sm:text-[17px] uppercase tracking-[0.04em] select-none"
              style={{ color: '#8C6226', fontWeight: 600 }}
            >
              ĐƠN HÀNG HÔM NAY · SẢN PHẨM TIẾP THỊ LIÊN KẾT
            </h2>
          </div>
        </div>`;

const newHeader = `        {/* SCANMS Refined Editorial Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-[#EAE4D7]">
          <div>
            <span className="text-[11px] font-bold tracking-widest text-[#B88E4F] uppercase block mb-1">
              HỆ SINH THÁI NHÃN HÀNG TRỰC THUỘC
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#1A1612] tracking-tight m-0">
              Kho Sản Phẩm & Chiến Dịch Tiếp Thị
            </h2>
            <p className="text-xs text-[#7D715E] mt-1 m-0">
              Sản phẩm chính hãng với thù lao bảo chứng và tài nguyên truyền thông cho Creator.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-white border border-[#EAE4D7] text-[#1A1612] shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#059669]" />
              {items.length} Sản phẩm mở bán
            </span>
          </div>
        </div>`;

if (mp.includes(oldHeader)) {
  mp = mp.replace(oldHeader, newHeader);
} else {
  // Replace via regex if whitespace varies
  mp = mp.replace(/\{\/\* SCANMS Standard "KHÁM PHÁ SẢN PHẨM" Header \*\/\}[\s\S]*?<\/h2>\s*<\/div>\s*<\/div>/, newHeader.trim());
}
fs.writeFileSync('frontend/src/pages/public/MarketplacePage.tsx', mp, 'utf8');

// 2. MarketplaceProductCard.tsx
let pc = fs.readFileSync('frontend/src/components/marketplace/MarketplaceProductCard.tsx', 'utf8');
pc = pc.replace(
  'hover:shadow-[0_8px_24px_rgba(75,57,34,0.10)]',
  'hover:shadow-[0_10px_28px_rgba(196,155,91,0.14)]'
);
pc = pc.replace(
  'className="flex h-11 items-center justify-center rounded-xl border border-[#C59B58] text-[#B88E4F] hover:bg-[#FBF5EB] disabled:border-[#DFD6C5] disabled:text-[#7D715E] disabled:opacity-50"',
  'className="flex h-11 items-center justify-center rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-[#1A1612] hover:border-[#C49B5B] hover:text-[#C49B5B] hover:bg-white transition-all disabled:opacity-50"'
);
pc = pc.replace(
  'className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#C59B58] px-2 text-center text-[10px] font-semibold leading-4 text-[#231D15] hover:bg-[#B88E4F] disabled:bg-[#F3EFE6] disabled:text-[#7D715E] sm:text-[11px]"',
  'className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#C49B5B] px-3 text-center text-xs font-bold text-white hover:bg-[#B88E4F] shadow-xs transition-all active:scale-[0.98] disabled:bg-[#EAE4D7] disabled:text-[#7D715E]"'
);
fs.writeFileSync('frontend/src/components/marketplace/MarketplaceProductCard.tsx', pc, 'utf8');

console.log('Successfully applied refined editorial layout and crisp card hierarchy!');
