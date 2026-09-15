import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const user = process.env.GMAIL_USER || process.env.SMTP_USER;
    const pass = process.env.GMAIL_PASS || process.env.SMTP_PASS;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
      this.logger.log(
        `Nodemailer Gmail Transporter initialized with account: ${user}`,
      );
    } else {
      this.logger.log(
        'Nodemailer using console mode (GMAIL_USER/GMAIL_PASS not provided). Emails will be logged to console.',
      );
    }
  }

  async sendOrderConfirmation(input: {
    email: string;
    customerName: string;
    publicOrderCode: string;
    finalAmount: number;
    paymentMethod: string;
    storeName: string;
  }) {
    const webUrl = (
      process.env.PUBLIC_WEB_URL ||
      process.env.FRONTEND_URL ||
      'http://localhost:5173'
    ).replace(/\/$/, '');
    const trackingUrl = `${webUrl}/tracking?sn=${encodeURIComponent(input.publicOrderCode)}`;
    const name = this.escapeHtml(input.customerName);
    const orderCode = this.escapeHtml(input.publicOrderCode);
    const storeName = this.escapeHtml(input.storeName);
    const paymentMethod = input.paymentMethod === 'VIETQR' ? 'VietQR' : 'COD';
    const amount = new Intl.NumberFormat('vi-VN').format(input.finalAmount);
    const subject = `[SCANMS] Xác nhận đơn hàng ${input.publicOrderCode}`;
    const html = `
      <div style="font-family:Arial,sans-serif;background:#FAF8F5;padding:30px;color:#1A1612">
        <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #EAE4D7;border-radius:16px;padding:28px">
          <div style="font-size:24px;font-weight:800;color:#B88E4F;text-align:center">SCANMS</div>
          <h1 style="font-size:20px;text-align:center;margin:18px 0 8px">Đặt hàng thành công</h1>
          <p style="color:#7D715E;line-height:1.6">Xin chào <strong>${name}</strong>, đơn hàng của bạn tại <strong>${storeName}</strong> đã được ghi nhận.</p>
          <div style="background:#FBF5EB;border:1px solid #EEDFC6;border-radius:12px;padding:16px;line-height:1.8">
            <div>Mã đơn: <strong>${orderCode}</strong></div>
            <div>Tổng thanh toán: <strong>${amount} ₫</strong></div>
            <div>Phương thức: <strong>${paymentMethod}</strong></div>
          </div>
          <div style="text-align:center;margin-top:22px">
            <a href="${trackingUrl}" style="display:inline-block;background:#C59B58;color:#FFFFFF;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px">Theo dõi đơn hàng</a>
          </div>
          <p style="font-size:12px;color:#7D715E;line-height:1.5;margin-top:22px">Khi tra cứu trên thiết bị khác, hãy nhập số điện thoại đã dùng để đặt hàng. Không chia sẻ thông tin xác minh với người khác.</p>
        </div>
      </div>`;

    await this.sendMail(
      input.email,
      subject,
      html,
      `Đơn hàng ${input.publicOrderCode} đã được ghi nhận. Tổng thanh toán: ${amount} ₫. Theo dõi tại: ${trackingUrl}`,
    );
  }

  /**
   * Gửi mã OTP xác thực đăng ký tài khoản
   */
  async sendRegistrationOtp(email: string, otp: string) {
    const subject = '🔐 [SCANMS] Mã xác thực đăng ký tài khoản';
    const html = `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; background: #FAF6F0; padding: 30px; color: #2C2114;">
        <div style="max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E8DCCB; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 24px; font-weight: 800; color: #9E7933; letter-spacing: -0.5px;">SCANMS</span>
            <p style="font-size: 11px; color: #7A6F64; margin: 4px 0 0; text-transform: uppercase; font-weight: 700;">Hệ thống quản lý mạng lưới CTV & Tiếp thị liên kết</p>
          </div>

          <h2 style="font-size: 20px; font-weight: 800; margin: 0 0 12px; text-align: center;">Mã xác thực đăng ký tài khoản</h2>
          <p style="font-size: 13.5px; line-height: 1.6; color: #52525B; margin: 0 0 24px; text-align: center;">
            Cảm ơn bạn đã đăng ký tham gia mạng lưới tiếp thị SCANMS. Sử dụng mã OTP dưới đây để hoàn tất việc xác thực tài khoản của bạn:
          </p>

          <div style="background: #F5E7CC; border: 1.5px dashed #9E7933; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #9E7933;">${otp}</span>
            <p style="margin: 6px 0 0; font-size: 12px; color: #7A6F64;">Mã có hiệu lực trong vòng 5 phút</p>
          </div>

          <p style="font-size: 12px; color: #7A6F64; line-height: 1.5; margin: 0;">
            * Lưu ý bảo mật: Tuyệt đối không chia sẻ mã này cho bất kỳ ai, kể cả nhân viên hỗ trợ của hệ thống SCANMS.
          </p>
        </div>
      </div>
    `;

    await this.sendMail(
      email,
      subject,
      html,
      `Mã OTP xác thực của bạn là: ${otp}`,
    );
  }

  /**
   * Gửi thông báo bảo mật khi có người đăng nhập vào tài khoản
   */
  async sendLoginSecurityAlert(
    email: string,
    fullName: string,
    meta: { ipAddress?: string; userAgent?: string; time: string },
  ) {
    const subject = '🛡️ [SCANMS Cảnh Báo Bảo Mật] Phát hiện lượt đăng nhập mới';
    const html = `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; background: #FAF6F0; padding: 30px; color: #2C2114;">
        <div style="max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E8DCCB; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 24px; font-weight: 800; color: #9E7933; letter-spacing: -0.5px;">SCANMS</span>
            <p style="font-size: 11px; color: #7A6F64; margin: 4px 0 0; text-transform: uppercase; font-weight: 700;">Hệ thống an ninh & đối soát tự động</p>
          </div>

          <h2 style="font-size: 20px; font-weight: 800; margin: 0 0 8px; text-align: center;">Thông báo đăng nhập tài khoản</h2>
          <p style="font-size: 13.5px; line-height: 1.6; color: #52525B; margin: 0 0 20px; text-align: center;">
            Xin chào <strong>${fullName}</strong>, tài khoản của bạn vừa được đăng nhập thành công vào hệ thống SCANMS.
          </p>

          <div style="background: #FAF6F0; border-radius: 10px; border: 1px solid #E8DCCB; padding: 16px; margin-bottom: 20px; font-size: 13px;">
            <p style="margin: 0 0 8px;"><strong>⏱ Thời gian:</strong> ${meta.time}</p>
            <p style="margin: 0 0 8px;"><strong>🌐 Địa chỉ IP:</strong> ${meta.ipAddress || '127.0.0.1'}</p>
            <p style="margin: 0;"><strong>💻 Thiết bị:</strong> ${meta.userAgent || 'Trình duyệt Web'}</p>
          </div>

          <p style="font-size: 12.5px; color: #B91C1C; line-height: 1.5; margin: 0;">
            Nếu bạn không thực hiện hành động này, vui lòng truy cập ngay vào hệ thống để đổi mật khẩu và liên hệ đội ngũ bảo mật SCANMS để khóa phiên làm việc.
          </p>
        </div>
      </div>
    `;

    await this.sendMail(
      email,
      subject,
      html,
      `Tài khoản SCANMS của bạn vừa được đăng nhập vào lúc ${meta.time} từ IP ${meta.ipAddress || '127.0.0.1'}.`,
    );
  }

  /**
   * Gửi mã OTP xác thực hủy đơn hàng cho khách mua hàng
   */
  async sendOrderCancellationOtp(
    email: string,
    otp: string,
    orderCode: string,
  ) {
    const subject = `🔐 [SCANMS] Mã OTP xác thực hủy đơn hàng ${orderCode}`;
    const html = `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; background: #FAF8F5; padding: 30px; color: #1A1612;">
        <div style="max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #EAE4D7; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 24px; font-weight: 800; color: #C59B58; letter-spacing: -0.5px;">SCANMS</span>
            <p style="font-size: 11px; color: #7D715E; margin: 4px 0 0; text-transform: uppercase; font-weight: 700;">Hệ thống đặt hàng nhanh & Tiếp thị liên kết</p>
          </div>

          <h2 style="font-size: 20px; font-weight: 800; margin: 0 0 12px; text-align: center; color: #1A1612;">Mã xác thực hủy đơn hàng</h2>
          <p style="font-size: 13.5px; line-height: 1.6; color: #7D715E; margin: 0 0 24px; text-align: center;">
            Hệ thống nhận được yêu cầu hủy đơn hàng <strong>${orderCode}</strong>. Sử dụng mã OTP dưới đây để hoàn tất việc xác thực hủy đơn:
          </p>

          <div style="background: #FBF5EB; border: 1.5px dashed #C59B58; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #B88E4F;">${otp}</span>
            <p style="margin: 6px 0 0; font-size: 12px; color: #7D715E;">Mã có hiệu lực trong vòng 5 phút (300 giây)</p>
          </div>

          <p style="font-size: 12px; color: #7D715E; line-height: 1.5; margin: 0;">
            * Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email. Đơn hàng của bạn vẫn sẽ được giữ nguyên trạng thái xử lý bình thường.
          </p>
        </div>
      </div>
    `;

    await this.sendMail(
      email,
      subject,
      html,
      `Mã OTP xác thực hủy đơn hàng ${orderCode} của bạn là: ${otp} (Hiệu lực 5 phút).`,
    );
  }

  /**
   * Dispatch tin nhắn SMS/ZNS chứa OTP xác thực hủy đơn tới SĐT
   */
  async sendOrderCancellationSms(
    phoneNumber: string,
    otp: string,
    orderCode: string,
  ) {
    const smsContent = `[SCANMS] Ma OTP xac thuc huy don hang ${orderCode} la: ${otp}. Hieu luc trong 5 phut. Khong chia se ma cho bat ky ai.`;
    console.log('\n======================================================');
    console.log(`📱 [SCANMS SMS/ZNS DISPATCHER] Gửi tin nhắn tới SĐT: ${phoneNumber}`);
    console.log(`Nội dung: ${smsContent}`);
    console.log('======================================================\n');
  }

  /**
   * Phương thức chung gửi email hoặc fallback ra console đẹp mắt
   */
  private async sendMail(
    to: string,
    subject: string,
    html: string,
    textFallback: string,
  ) {
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"SCANMS Network" <${process.env.GMAIL_USER || 'no-reply@scanms.vn'}>`,
          to,
          subject,
          text: textFallback,
          html,
        });
        this.logger.log(
          `Real Gmail successfully sent to: ${to} | Subject: ${subject}`,
        );
        return;
      } catch (err: any) {
        this.logger.error(
          `Failed to send real Gmail to ${to}: ${err.message}. Falling back to console output.`,
        );
      }
    }

    // Console Logging Mode (Dev / Demo)
    console.log('\n======================================================');
    console.log(`📧 [SCANMS EMAIL DISPATCHER] ${subject}`);
    console.log(`Gửi tới: ${to}`);
    console.log(`Nội dung: ${textFallback}`);
    console.log('======================================================\n');
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      };
      return entities[character];
    });
  }
}
