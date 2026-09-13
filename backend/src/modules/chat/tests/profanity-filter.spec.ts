import { checkProfanity } from '../profanity-filter';

describe('ProfanityFilter (FR-25)', () => {
  describe('Vulgar and offensive phrases (True Positives)', () => {
    it('should detect direct Vietnamese swear words', () => {
      expect(checkProfanity('Địt mẹ mày').isProfane).toBe(true);
      expect(checkProfanity('Đụ má cái thằng này').isProfane).toBe(true);
      expect(checkProfanity('Thằng dume này').isProfane).toBe(true);
      expect(checkProfanity('Mày biến mẹ đi').isProfane).toBe(true);
      expect(checkProfanity('Thằng chó đẻ khốn nạn').isProfane).toBe(true);
      expect(checkProfanity('Cái đồ vô học mất dạy').isProfane).toBe(true);
    });

    it('should detect acronyms and teencode swear words', () => {
      expect(checkProfanity('dm mày').isProfane).toBe(true);
      expect(checkProfanity('thằng vcl này').isProfane).toBe(true);
      expect(checkProfanity('đm m').isProfane).toBe(true);
      expect(checkProfanity('dmm nha').isProfane).toBe(true);
    });

    it('should detect English curse words', () => {
      expect(checkProfanity('what the fuck').isProfane).toBe(true);
      expect(checkProfanity('you are an asshole').isProfane).toBe(true);
      expect(checkProfanity('shut up bitch').isProfane).toBe(true);
    });
  });

  describe('Legitimate business and normal conversation (False Positive Prevention)', () => {
    it('should NOT block everyday words with "đủ" (du)', () => {
      expect(checkProfanity('Shop có đủ hàng giao không?').isProfane).toBe(false);
      expect(checkProfanity('Ví dụ như sản phẩm này').isProfane).toBe(false);
      expect(checkProfanity('Dù sao thì tôi vẫn muốn đặt hàng').isProfane).toBe(false);
    });

    it('should NOT block words with "me" (contact me, cho me)', () => {
      expect(checkProfanity('Gửi cho me sản phẩm mẫu nhé').isProfane).toBe(false);
      expect(checkProfanity('Please contact me soon').isProfane).toBe(false);
    });

    it('should NOT block words with "lớn", "lon" (lon sữa, kích thước lớn)', () => {
      expect(checkProfanity('Sản phẩm này có kích thước lớn không?').isProfane).toBe(false);
      expect(checkProfanity('Tôi muốn mua 2 lon sữa').isProfane).toBe(false);
    });

    it('should NOT block words with "cũ" (cu)', () => {
      expect(checkProfanity('Mẫu mới hay mẫu cũ vậy shop?').isProfane).toBe(false);
      expect(checkProfanity('Tôi là khách hàng cũ của shop').isProfane).toBe(false);
    });

    it('should NOT block "cc" (capacity / cc)', () => {
      expect(checkProfanity('Sản phẩm dung tích 50 cc').isProfane).toBe(false);
      expect(checkProfanity('Gửi kèm 100 cc dung dịch').isProfane).toBe(false);
    });
  });
});
