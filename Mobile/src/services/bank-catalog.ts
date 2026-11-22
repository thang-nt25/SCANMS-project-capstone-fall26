import { z } from "zod";
export const BankCatalogSchema = z.object({ code: z.literal("00"), data: z.array(z.object({ id: z.number(), name: z.string(), code: z.string(), bin: z.string().regex(/^\d{6}$/), shortName: z.string(), logo: z.string() })) });
export type CatalogBank = z.infer<typeof BankCatalogSchema>["data"][number];
export const bankStoredName = (bank: CatalogBank) => `${bank.shortName} (${bank.bin})`;
export const bankMatches = (bank: CatalogBank, query: string) => {
  const normalize = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").replace(/[đĐ]/g, "d").toLowerCase();
  return normalize(`${bank.name} ${bank.shortName} ${bank.code} ${bank.bin}`).includes(normalize(query.trim()));
};
export async function loadBankCatalog(signal: AbortSignal) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener("abort", cancel);
  if (signal.aborted) controller.abort();
  const timeout = setTimeout(cancel, 15000);
  try {
    // Public catalog only: never send SCANMS session or beneficiary information.
    const response = await fetch("https://api.vietqr.io/v2/banks", { signal: controller.signal });
    if (!response.ok) throw new Error("Chưa tải được danh sách ngân hàng. Vui lòng thử lại.");
    return BankCatalogSchema.parse(await response.json()).data.sort((a, b) => a.shortName.localeCompare(b.shortName, "vi"));
  } finally { clearTimeout(timeout); signal.removeEventListener("abort", cancel); }
}
