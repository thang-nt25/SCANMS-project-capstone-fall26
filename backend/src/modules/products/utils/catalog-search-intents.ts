// Shopping needs are distinct from product-type synonyms. Explicit matching
// uses the merchant's text. Type-based fallbacks remain labelled "related";
// they never add efficacy claims to products or modify catalogue data.
export const SEARCH_INTENTS = [
  {
    id: 'acne',
    aliases: ['trị mụn', 'giảm mụn', 'ngừa mụn', 'ngăn mụn', 'chăm sóc da mụn', 'da mụn', 'mụn trứng cá', 'mụn', 'acne', 'anti acne', 'acne care', 'acne treatment', 'pimples', 'blemish control'],
    terms: ['mụn', 'acne', 'pimple', 'blemish'],
    relatedTypes: ['sữa rửa mặt', 'cleanser', 'serum', 'toner'],
    exclude: '(khong[^.;,]{0,35}(tri mun|giam mun)|not[^.;,]{0,35}acne treatment)',
  },
  {
    id: 'hydration',
    aliases: ['dưỡng ẩm', 'cấp ẩm', 'giữ ẩm', 'da khô', 'khô da', 'hydration', 'hydrating', 'dry skin'],
    terms: ['dưỡng ẩm', 'cấp ẩm', 'giữ ẩm', 'da khô', 'hydrating', 'hydration', 'moisturizing', 'dry skin'],
    relatedTypes: ['kem dưỡng', 'moisturizer', 'serum', 'mặt nạ', 'mask'],
  },
  {
    id: 'brightening',
    aliases: ['trị thâm', 'mờ thâm', 'giảm thâm', 'thâm mụn', 'dưỡng sáng', 'sáng da', 'đều màu da', 'brightening', 'dark spots', 'uneven skin tone'],
    terms: ['mờ thâm', 'giảm thâm', 'thâm mụn', 'sáng da', 'dưỡng sáng', 'đều màu', 'brightening', 'dark spot'],
    relatedTypes: ['serum', 'kem dưỡng', 'toner'],
  },
  {
    id: 'repair',
    aliases: ['phục hồi', 'phục hồi da', 'làm dịu', 'dịu da', 'skin repair', 'skin barrier', 'soothing'],
    terms: ['phục hồi', 'làm dịu', 'dịu da', 'repair', 'barrier', 'soothing'],
    relatedTypes: ['serum', 'kem dưỡng', 'mặt nạ'],
  },
  {
    id: 'oil-control',
    aliases: ['kiềm dầu', 'kiểm soát dầu', 'giảm dầu', 'da dầu', 'da nhờn', 'oily skin', 'oil control'],
    terms: ['kiềm dầu', 'kiểm soát dầu', 'giảm dầu', 'da dầu', 'da nhờn', 'oily skin', 'oil control'],
    relatedTypes: ['sữa rửa mặt', 'cleanser', 'toner', 'serum'],
  },
  {
    id: 'sensitive',
    aliases: ['da nhạy cảm', 'nhạy cảm', 'sensitive skin', 'sensitive'],
    terms: ['nhạy cảm', 'sensitive'],
    relatedTypes: ['sữa rửa mặt dịu nhẹ', 'serum', 'kem dưỡng'],
  },
  {
    id: 'exfoliation',
    aliases: ['tẩy da chết', 'tẩy tế bào chết', 'exfoliation', 'exfoliating', 'exfoliator'],
    terms: ['tẩy da chết', 'tẩy tế bào chết', 'exfoliation', 'exfoliating', 'exfoliator'],
    relatedTypes: ['toner', 'bha', 'aha'],
  },
] as const;
