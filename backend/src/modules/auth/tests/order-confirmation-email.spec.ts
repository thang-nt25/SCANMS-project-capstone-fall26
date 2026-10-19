import { renderOrderConfirmationEmail, type OrderConfirmationEmailInput } from '../order-confirmation-email';
import { MailService } from '../mail.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

const input: OrderConfirmationEmailInput = {
  email: 'customer@example.test', customerName: 'Tuấn Đình', customerPhone: '0901234567', shippingAddress: 'Khu Công Nghệ Cao\nThủ Đức, Hồ Chí Minh',
  publicOrderCode: 'DH-2026-TEST', createdAt: '2026-10-18T00:00:00Z', subtotalAmount: 400000, shippingFee: 29001, discountAmount: 15000,
  finalAmount: 414001, paymentMethod: 'WALLET', paymentStatus: 'PAID', storeName: 'Cocoon',
  items: [{ title: 'Serum rau má B5 Cocoon', variantName: '30 ml / Tiêu chuẩn', sku: 'B5-30', quantity: 2, unitPrice: 200000 }],
};

describe('Order confirmation email', () => {
  const env = { ...process.env };
  const sendMail = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GMAIL_USER = 'sender@gmail.com'; process.env.GMAIL_PASS = 'fixture-password';
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
  });
  afterEach(() => { process.env = { ...env }; });

  it('includes all ordered products, variants, quantities, actual totals, recipient and Vietnam time in HTML and plain text', () => {
    const rendered = renderOrderConfirmationEmail(input, 'https://scanms.example');
    expect(rendered.subject).toBe('[SCANMS] Xác nhận đơn hàng DH-2026-TEST');
    for (const content of [rendered.html, rendered.text]) {
      for (const expected of ['Tuấn Đình', '0901234567', 'Khu Công Nghệ Cao', 'Cocoon', 'Serum rau má B5 Cocoon', '30 ml / Tiêu chuẩn', 'B5-30', '× 2', '400.000', '29.001', '15.000', '414.001', 'Ví SCANMS', 'Đã thanh toán', '18/10/2026', '07:00', 'https://scanms.example/tracking?sn=DH-2026-TEST']) expect(content).toContain(expected);
    }
    expect(rendered.html).not.toContain('localhost');
  });

  it('escapes user/store/product content and link parameters instead of injecting markup', () => {
    const result = renderOrderConfirmationEmail({ ...input, customerName: '<img src=x onerror=alert(1)>', storeName: '<script>store</script>', shippingAddress: 'A & B', publicOrderCode: 'DH-&"', items: [{ ...input.items[0], title: '<script>item</script>' }] }, 'https://scanms.example');
    expect(result.html).not.toContain('<script>');
    expect(result.html).not.toContain('<img src=x');
    expect(result.html).toContain('&lt;script&gt;item&lt;/script&gt;');
    expect(result.html).toContain('sn=DH-%26%22');
    expect(result.html).toContain('A &amp; B');
  });

  it('does not claim an unpaid PayOS order is paid', () => {
    const result = renderOrderConfirmationEmail({ ...input, paymentMethod: 'PAYOS', paymentStatus: 'WAITING_PAYMENT' }, 'https://scanms.example');
    expect(result.html).toContain('Chờ thanh toán');
    expect(result.text).toContain('Đơn chưa thanh toán');
    expect(result.html).not.toContain('Đã thanh toán');
  });

  it('only returns success after SMTP accepts the correct recipient', async () => {
    sendMail.mockResolvedValue({ accepted: [input.email], rejected: [], messageId: '<fixture-id>' });
    expect(await new MailService().sendOrderConfirmation(input)).toBe(true);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: input.email, from: { name: 'SCANMS', address: 'sender@gmail.com' }, text: expect.stringContaining('414.001'), html: expect.stringContaining('Sản phẩm đã đặt'),
    }));
  });

  it('reports SMTP rejection and network failure instead of pretending console output is delivery', async () => {
    sendMail.mockResolvedValueOnce({ accepted: [], rejected: [input.email] });
    await expect(new MailService().sendOrderConfirmation(input)).rejects.toThrow('Không gửi được email');
    sendMail.mockRejectedValueOnce(Object.assign(new Error('Network error'), { code: 'ETIMEDOUT' }));
    await expect(new MailService().sendOrderConfirmation(input)).rejects.toThrow('Không gửi được email');
  });

  it('does not report console mode as an order confirmation email', async () => {
    delete process.env.GMAIL_USER; delete process.env.GMAIL_PASS; delete process.env.SMTP_USER; delete process.env.SMTP_PASS;
    await expect(new MailService().sendOrderConfirmation(input)).rejects.toThrow('chưa được cấu hình');
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('uses the authenticated SMTP sender when only SMTP_USER is configured', async () => {
    delete process.env.GMAIL_USER; delete process.env.GMAIL_PASS;
    process.env.SMTP_USER = 'smtp@gmail.com'; process.env.SMTP_PASS = 'fixture-password';
    sendMail.mockResolvedValue({ accepted: [input.email], messageId: '<fixture-id>' });
    await new MailService().sendOrderConfirmation(input);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: { name: 'SCANMS', address: 'smtp@gmail.com' }, replyTo: 'smtp@gmail.com' }));
  });
});
