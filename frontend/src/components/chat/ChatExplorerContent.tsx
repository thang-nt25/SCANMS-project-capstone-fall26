import { Fragment } from 'react';
import { chatContentText, chatContentUrl, parseChatContent } from '@/utils/chat-explorer';
import { ProductInquiryCardBubble, type ProductInquiryCardData } from './ProductInquiryCardBubble';
import { CouponVoucherCardBubble, type CouponVoucherCardData } from './CouponVoucherCardBubble';

export function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = [];
  let offset = 0;
  const lower = text.toLocaleLowerCase();
  let at = lower.indexOf(query.toLocaleLowerCase());
  while (at >= 0) {
    parts.push(<Fragment key={at}>{text.slice(offset, at)}<mark className="rounded bg-[#EEDFC6] text-[#1A1612]">{text.slice(at, at + query.length)}</mark></Fragment>);
    offset = at + query.length;
    at = lower.indexOf(query.toLocaleLowerCase(), offset);
  }
  return <>{parts}{text.slice(offset)}</>;
}

export function ChatExplorerContent({ text, query }: { text: string; query: string }) {
  const card = parseChatContent(text);
  if (card?.type === 'PRODUCT_INQUIRY' && typeof card.productId === 'string' && card.productId && typeof card.productTitle === 'string') {
    return <ProductInquiryCardBubble card={card as unknown as ProductInquiryCardData} isMine={false} />;
  }
  if (card?.type === 'COUPON_VOUCHER' && typeof card.couponId === 'string' && typeof card.couponCode === 'string' && typeof card.discountValue === 'number') {
    return <CouponVoucherCardBubble card={card as unknown as CouponVoucherCardData} />;
  }
  const content = chatContentText(text);
  return <p className="whitespace-pre-wrap break-words text-sm text-[#1A1612]">
    {content.split(/(https?:\/\/[^\s<>]+)/gi).map((part, index) => {
      const url = chatContentUrl(part);
      return url ? <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="text-[#795A2D] underline underline-offset-2"><Highlight text={part} query={query} /></a>
        : <Fragment key={index}><Highlight text={part} query={query} /></Fragment>;
    })}
  </p>;
}
