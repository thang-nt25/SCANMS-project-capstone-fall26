const fs = require('fs');

let code = fs.readFileSync('frontend/src/pages/merchant/ShopSampleManagementTab.tsx', 'utf8');

// 1. Add state variables inside ShopSampleManagementTab component
const stateTarget = "  const [bulkExporting, setBulkExporting] = useState(false);";
if (!code.includes("selectedSampleIds")) {
  code = code.replace(
    "  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'",
    "  const [selectedSampleIds, setSelectedSampleIds] = useState<string[]>([]);\n  const [bulkApproving, setBulkApproving] = useState(false);\n  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'"
  );
}

// 2. Add handleBulkApproveSamples handler
if (!code.includes("handleBulkApproveSamples")) {
  const handlerCode = `
  const handleToggleSelectSample = (id: string, checked: boolean) => {
    setSelectedSampleIds((prev) => (checked ? [...prev, id] : prev.filter((i) => i !== id)));
  };

  const handleBulkApproveSamples = async () => {
    if (selectedSampleIds.length === 0) return;
    setBulkApproving(true);
    let successCount = 0;
    try {
      await Promise.all(
        selectedSampleIds.map(async (id) => {
          try {
            await api.patch(\`/sample-requests/\${id}/approve\`, {});
            successCount++;
          } catch (e) {
            console.error('Failed to approve sample:', id, e);
          }
        })
      );
      toast.success(\`Đã duyệt thành công \${successCount}/\${selectedSampleIds.length} yêu cầu mẫu 0đ!\`);
      setSamples((prev) => prev.map((s) => (selectedSampleIds.includes(s.id) ? { ...s, status: 'APPROVED' } : s)));
      setSelectedSampleIds([]);
    } catch (err: any) {
      toast.error('Có lỗi xảy ra khi duyệt hàng loạt.');
    } finally {
      setBulkApproving(false);
    }
  };
`;
  code = code.replace("  const handleApproveSample = async (sampleId: string) => {", handlerCode + "\n  const handleApproveSample = async (sampleId: string) => {");
}

// 3. Add bulk action bar above the table
const bulkBarCode = `{selectedSampleIds.length > 0 && (
              <div className="flex items-center justify-between p-3 mb-3 bg-[#FBF5EB] border border-[#EEDFC6] rounded-xl animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#C59B58] text-[#1A1612] font-bold text-xs">
                    Đã chọn {selectedSampleIds.length} yêu cầu
                  </span>
                  <span className="text-xs text-[#7D715E]">Thao tác hàng loạt:</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={bulkApproving}
                    onClick={handleBulkApproveSamples}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{bulkApproving ? 'Đang duyệt...' : \`Duyệt nhanh hàng loạt (\${selectedSampleIds.length})\`}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSampleIds([])}
                    className="p-1.5 text-xs text-[#7D715E] hover:text-[#1A1612] cursor-pointer"
                    title="Bỏ chọn"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            <div className="overflow-x-auto rounded-2xl border border-[#EAE4D7] bg-white shadow-[0_2px_10px_rgb(35_29_21_/_2%)]">`;

if (!code.includes("selectedSampleIds.length > 0")) {
  code = code.replace(
    '<div className="overflow-x-auto rounded-2xl border border-[#EAE4D7] bg-white shadow-[0_2px_10px_rgb(35_29_21_/_2%)]">',
    bulkBarCode
  );
}

// 4. Update table colgroup and thead
const oldColgroup = '<colgroup><col className="w-[17%]" /><col className="w-[24%]" /><col className="w-[21%]" /><col className="w-[20%]" /><col className="w-[18%]" /></colgroup>';
const newColgroup = '<colgroup><col className="w-[5%]" /><col className="w-[17%]" /><col className="w-[23%]" /><col className="w-[19%]" /><col className="w-[18%]" /><col className="w-[18%]" /></colgroup>';
if (code.includes(oldColgroup)) {
  code = code.replace(oldColgroup, newColgroup);
}

const oldTheadRow = `<tr className="border-b border-[#EAE4D7] bg-[#FBF5EB]/40 font-bold text-[#7D715E]">
                    <th className="py-3 px-3 font-medium">Nhà sáng tạo</th>`;
const newTheadRow = `<tr className="border-b border-[#EAE4D7] bg-[#FBF5EB]/40 font-bold text-[#7D715E]">
                    <th className="py-3 px-3 font-medium w-10">
                      <input
                        type="checkbox"
                        aria-label="Chọn tất cả yêu cầu chờ duyệt"
                        checked={
                          filteredSamples.filter(s => s.status === 'PENDING').length > 0 &&
                          selectedSampleIds.length === filteredSamples.filter(s => s.status === 'PENDING').length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSampleIds(filteredSamples.filter(s => s.status === 'PENDING').map(s => s.id));
                          } else {
                            setSelectedSampleIds([]);
                          }
                        }}
                        className="rounded border-[#EAE4D7] text-[#C59B58] focus:ring-[#C59B58] cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-3 font-medium">Nhà sáng tạo</th>`;

if (code.includes(oldTheadRow)) {
  code = code.replace(oldTheadRow, newTheadRow);
}

// 5. Update tbody row
const oldRowStart = `<tr key={s.id} data-sample-row={s.id} className="bg-white align-middle transition-colors hover:bg-[#FBF5EB]/30 [&>td]:px-3 [&>td]:py-3.5">
                          {/* Column 1: KOL */}`;
const newRowStart = `<tr key={s.id} data-sample-row={s.id} className="bg-white align-middle transition-colors hover:bg-[#FBF5EB]/30 [&>td]:px-3 [&>td]:py-3.5">
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

if (code.includes(oldRowStart)) {
  code = code.replace(oldRowStart, newRowStart);
}

// colSpan from 5 to 6 on empty
code = code.replace('<td colSpan={5} className="py-12', '<td colSpan={6} className="py-12');

fs.writeFileSync('frontend/src/pages/merchant/ShopSampleManagementTab.tsx', code, 'utf8');
console.log('ShopSampleManagementTab updated with bulk sample approval successfully');
