export const kycReviewItems = [
  { label: 'Số CCCD', fieldId: 'kol-id', step: 2, section: 'identity', profileFieldId: 'kyc-id-number' },
  { label: 'Ảnh CCCD mặt trước', fieldId: 'kol-front-card', step: 2, section: 'identity', profileFieldId: 'kyc-front-card' },
  { label: 'Ảnh CCCD mặt sau', fieldId: 'kol-back-card', step: 2, section: 'identity', profileFieldId: 'kyc-back-card' },
  { label: 'Tên kênh chính', fieldId: 'primary-channel-name', step: 1, section: 'channel', profileFieldId: 'kyc-channel-name' },
  { label: 'Liên kết kênh chính', fieldId: 'primary-channel-url', step: 1, section: 'channel', profileFieldId: 'kyc-channel-url' },
  { label: 'Số người theo dõi', fieldId: 'primary-channel-followers', step: 1, section: 'channel', profileFieldId: 'kyc-followers' },
  { label: 'Ảnh quản trị kênh', fieldId: 'primary-channel-proof', step: 1, section: 'channel', profileFieldId: 'kyc-channel-proof' },
  { label: 'Ngân hàng thụ hưởng', fieldId: 'kol-bank-name', step: 2, section: 'bank', profileFieldId: 'kyc-bank-name' },
  { label: 'Số tài khoản', fieldId: 'kol-bank-number', step: 2, section: 'bank', profileFieldId: 'kyc-bank-number' },
  { label: 'Tên chủ tài khoản', fieldId: 'kol-bank-acc', step: 2, section: 'bank', profileFieldId: 'kyc-bank-owner' },
] as const;
