const fs = require('fs');

// Patch 1: MarketplaceProductCard.tsx
let cardCode = fs.readFileSync('frontend/src/components/marketplace/MarketplaceProductCard.tsx', 'utf8');
if (!cardCode.includes("import { authService } from '@/services/auth.service';")) {
  cardCode = cardCode.replace(
    "import { StoreCooperationAction } from '../affiliate/StoreCooperationAction';",
    "import { StoreCooperationAction } from '../affiliate/StoreCooperationAction';\nimport { authService } from '@/services/auth.service';"
  );
}

if (!cardCode.includes("isAffiliateOrStaff")) {
  cardCode = cardCode.replace(
    "  const soldCount = Number(product.soldCount ?? 0);",
    "  const user = authService.getCurrentUser();\n  const isAffiliateOrStaff = user?.role === 'COLLABORATOR' || user?.role === 'SHOP_MANAGER' || user?.role === 'SYSTEM_MANAGER' || user?.role === 'SYSTEM_ADMIN';\n  const soldCount = Number(product.soldCount ?? 0);"
  );
}

const oldBadgeRegex = /\{product\.commissionRate\s*&&\s*product\.commissionRate\s*>\s*0\s*&&\s*\([\s\S]*?Thù lao tiếp thị:\s*\{product\.commissionRate\}%[\s\S]*?\)\}/;
if (oldBadgeRegex.test(cardCode)) {
  const newBadge = `{isAffiliateOrStaff && product.commissionRate && product.commissionRate > 0 ? (
            <span className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FBF5EB] border border-[#EEDFC6] text-[#8F682E]">
              Thù lao tiếp thị: {product.commissionRate}%
            </span>
          ) : (
            <span className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F5EFE6] border border-[#DFD6C5] text-[#6B5E4B]">
              ✨ Chính hãng 100%
            </span>
          )}`;
  cardCode = cardCode.replace(oldBadgeRegex, newBadge);
}
fs.writeFileSync('frontend/src/components/marketplace/MarketplaceProductCard.tsx', cardCode, 'utf8');
console.log('MarketplaceProductCard updated successfully');
