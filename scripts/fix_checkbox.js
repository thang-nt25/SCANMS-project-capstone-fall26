const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/merchant/ShopSampleManagementTab.tsx', 'utf8');

const target = `<tr key={s.id} data-sample-row={s.id} className="bg-white align-middle transition-colors hover:bg-[#FBF5EB]/30 [&>td]:px-3 [&>td]:py-3.5">\r\n                          {/* Column 1: KOL */}`;
const targetLF = `<tr key={s.id} data-sample-row={s.id} className="bg-white align-middle transition-colors hover:bg-[#FBF5EB]/30 [&>td]:px-3 [&>td]:py-3.5">\n                          {/* Column 1: KOL */}`;

const replacement = `<tr key={s.id} data-sample-row={s.id} className="bg-white align-middle transition-colors hover:bg-[#FBF5EB]/30 [&>td]:px-3 [&>td]:py-3.5">
                          {/* Column 0: Checkbox */}
                          <td className="py-3.5 px-3 align-middle w-10">
                            {s.status === 'PENDING' ? (
                              <input
                                type="checkbox"
                                aria-label={\`Chọn yêu cầu của \${s.collaboratorInfo?.fullName || 'KOL'}\`}
                                checked={selectedSampleIds.includes(s.id)}
                                onChange={(e) => handleToggleSelectSample(s.id, e.target.checked)}
                                className="rounded border-[#EAE4D7] text-[#C59B58] focus:ring-[#C59B58] cursor-pointer"
                              />
                            ) : null}
                          </td>
                          {/* Column 1: KOL */}`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('frontend/src/pages/merchant/ShopSampleManagementTab.tsx', code, 'utf8');
  console.log('Replaced target with CRLF');
} else if (code.includes(targetLF)) {
  code = code.replace(targetLF, replacement);
  fs.writeFileSync('frontend/src/pages/merchant/ShopSampleManagementTab.tsx', code, 'utf8');
  console.log('Replaced target with LF');
} else {
  console.error('Target not found in ShopSampleManagementTab.tsx');
}
