import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { MailService } from '../auth/mail.service';
import { UpdateCustomerProfileDto } from './dto/update-profile.dto';
import { ChangeCustomerPasswordDto } from './dto/change-password.dto';
import { CreateCustomerAddressDto } from './dto/create-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-address.dto';
import { CustomerOrdersQueryDto } from './dto/customer-orders-query.dto';
import * as fs from 'fs';
import * as path from 'path';
import { SetPasswordWithOtpDto, VerifyPasswordOtpDto } from './dto/set-password-otp.dto';
import { VerifyCustomerIdentityDto } from './dto/verify-identity.dto';

@Injectable()
export class CustomerService {
  private readonly securityOtpCache = new Map<string, { code: string; expiresAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * 1. Lấy thông tin hồ sơ khách hàng kèm chỉ số tổng hợp
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng');
    }

    // Điều kiện khớp đơn hàng của user
    const orderFilterOr: any[] = [{ customerId: userId }];
    if (user.email) orderFilterOr.push({ customerEmail: user.email.toLowerCase() });
    if (user.phoneNumber) orderFilterOr.push({ customerPhone: user.phoneNumber.trim() });

    const [totalOrders, pendingOrders, completedOrders] = await Promise.all([
      this.prisma.order.count({ where: { OR: orderFilterOr } }),
      this.prisma.order.count({
        where: {
          OR: orderFilterOr,
          status: OrderStatus.PENDING,
        },
      }),
      this.prisma.order.findMany({
        where: {
          OR: orderFilterOr,
          status: { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] },
        },
        select: { finalAmount: true },
      }),
    ]);

    const totalSpending = completedOrders.reduce(
      (sum, o) => sum + Number(o.finalAmount || 0),
      0,
    );

    const wishlistCount = await this.prisma.customerWishlist.count({
      where: { userId },
    });

    return {
      user,
      stats: {
        totalOrders,
        pendingOrders,
        totalSpending,
        wishlistCount,
      },
    };
  }

  /**
   * 2. Cập nhật thông tin họ tên, số điện thoại
   */
  async updateProfile(userId: string, dto: UpdateCustomerProfileDto) {
    const dataToUpdate: any = {};
    if (dto.fullName !== undefined) dataToUpdate.fullName = dto.fullName.trim();
    if (dto.phoneNumber !== undefined) dataToUpdate.phoneNumber = dto.phoneNumber.trim();
    if (dto.avatarUrl !== undefined) dataToUpdate.avatarUrl = dto.avatarUrl.trim();

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        avatarUrl: true,
        role: true,
        updatedAt: true,
      },
    });

    return {
      message: 'Cập nhật thông tin tài khoản thành công',
      user: updated,
    };
  }

  /**
   * 3. Đổi mật khẩu an toàn
   */
  async changePassword(userId: string, dto: ChangeCustomerPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return {
      message: 'Đổi mật khẩu tài khoản thành công',
    };
  }

  /**
   * 3.1. Gửi mã OTP xác minh qua Email (Chuẩn Shopee)
   */
  async sendPasswordSecurityOtp(
    userId: string,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Tài khoản đã bị tạm khóa');
    }

    // Sinh mã ngẫu nhiên 6 chữ số
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 phút

    this.securityOtpCache.set(userId, { code: otpCode, expiresAt });

    const loginTime = new Date().toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
    });

    await this.mailService.sendPasswordSecurityOtp(
      user.email,
      user.fullName,
      otpCode,
      {
        ipAddress: meta.ipAddress || '127.0.0.1',
        userAgent: meta.userAgent || 'Trình duyệt Web',
        time: loginTime,
        location: 'Việt Nam',
      },
    );

    const parts = user.email.split('@');
    const masked =
      parts.length === 2
        ? `${parts[0].slice(0, 2)}***********@${parts[1]}`
        : user.email;

    return {
      success: true,
      maskedEmail: masked,
      message: `Mã OTP xác thực đã được gửi đến địa chỉ Email ${masked}`,
    };
  }

  /**
   * 3.2. Xác thực mã OTP gửi qua Email
   */
  async verifyPasswordSecurityOtp(userId: string, otp: string) {
    const cached = this.securityOtpCache.get(userId);

    if (!cached) {
      throw new BadRequestException('Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng gửi lại mã mới.');
    }
    if (Date.now() > cached.expiresAt) {
      this.securityOtpCache.delete(userId);
      throw new BadRequestException('Mã OTP đã hết hạn (quá 5 phút). Vui lòng gửi lại mã mới.');
    }
    if (cached.code !== otp.trim()) {
      throw new BadRequestException('Mã OTP không chính xác. Vui lòng kiểm tra lại trong Gmail.');
    }

    return {
      success: true,
      message: 'Xác thực OTP qua Email thành công! Bạn có thể thiết lập mật khẩu mới.',
    };
  }

  /**
   * 3.3. Thiết lập mật khẩu mới bằng OTP xác thực (Không cần mật khẩu cũ)
   */
  async setPasswordWithOtp(userId: string, dto: SetPasswordWithOtpDto) {
    const cached = this.securityOtpCache.get(userId);

    if (!cached) {
      throw new BadRequestException('Mã OTP không tồn tại hoặc đã hết hạn.');
    }
    if (Date.now() > cached.expiresAt) {
      this.securityOtpCache.delete(userId);
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.');
    }
    if (cached.code !== dto.otp.trim()) {
      throw new BadRequestException('Mã OTP không chính xác.');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Xóa OTP sau khi sử dụng thành công
    this.securityOtpCache.delete(userId);

    return {
      success: true,
      message: 'Thiết lập mật khẩu mới thành công! Bạn có thể sử dụng mật khẩu này để đăng nhập.',
    };
  }

  /**
   * 4. Lấy danh sách đơn mua của khách hàng (lọc theo trạng thái & tìm kiếm)
   */
  async getOrders(userId: string, query: CustomerOrdersQueryDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phoneNumber: true },
    });

    const orderFilterOr: any[] = [{ customerId: userId }];
    if (user?.email) orderFilterOr.push({ customerEmail: user.email.toLowerCase() });
    if (user?.phoneNumber) orderFilterOr.push({ customerPhone: user.phoneNumber.trim() });

    const where: any = {
      OR: orderFilterOr,
    };

    if (query.status) {
      if (query.status === 'DELIVERED' || query.status === 'COMPLETED') {
        where.status = { in: ['DELIVERED', 'COMPLETED'] };
      } else {
        where.status = query.status;
      }
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.AND = [
        {
          OR: [
            { externalOrderSn: { contains: q, mode: 'insensitive' } },
            { store: { name: { contains: q, mode: 'insensitive' } } },
            { orderItems: { some: { product: { title: { contains: q, mode: 'insensitive' } } } } },
          ],
        },
      ];
    }

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        store: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        orderItems: {
          include: {
            product: {
              select: { id: true, title: true, imageUrl: true, sku: true },
            },
            variant: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
        coupon: {
          select: { displayCode: true, codeNormalized: true, discountValue: true, discountType: true },
        },
      },
    });

    return {
      total: orders.length,
      orders,
    };
  }

  /**
   * 5. Chi tiết 1 đơn hàng của khách
   */
  async getOrderDetails(userId: string, orderId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phoneNumber: true },
    });

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: true,
        orderItems: {
          include: {
            product: true,
            variant: true,
          },
        },
        coupon: true,
        paymentTransactions: true,
        productReviews: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    const belongsToUser =
      order.customerId === userId ||
      (order.customerEmail && user?.email && order.customerEmail.toLowerCase() === user.email.toLowerCase()) ||
      (order.customerPhone && user?.phoneNumber && order.customerPhone.trim() === user.phoneNumber.trim());

    if (!belongsToUser) {
      throw new ForbiddenException('Bạn không có quyền truy cập đơn hàng này');
    }

    return order;
  }

  /**
   * 6. Khách hàng tự hủy đơn hàng (khi đơn đang PENDING)
   */
  async cancelOrder(userId: string, orderId: string, reason?: string) {
    const order = await this.getOrderDetails(userId, orderId);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Không thể hủy đơn hàng ở trạng thái "${order.status}". Chỉ có thể hủy đơn khi đang Chờ xác nhận.`,
      );
    }

    const cancelledOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        overrideReason: reason || 'Khách hàng yêu cầu hủy đơn trên hệ thống',
      },
    });

    try {
      await this.prisma.notification.create({
        data: {
          userId,
          title: `Đơn hàng #${order.externalOrderSn || order.id.slice(0, 8)} đã hủy thành công`,
          message: `Bạn đã yêu cầu hủy đơn hàng thành công. Lý do: "${reason || 'Khách hàng yêu cầu hủy'}".`,
          type: 'ORDER_CANCELLED',
          data: { orderId: order.id, externalOrderSn: order.externalOrderSn },
        },
      });
    } catch {
      // ignore notification error
    }

    return {
      message: 'Hủy đơn hàng thành công',
      order: cancelledOrder,
    };
  }

  /**
   * 6.1. Khách hàng gửi yêu cầu Trả hàng / Hoàn tiền (Chuẩn Shopee)
   */
  async requestReturnOrder(
    userId: string,
    orderId: string,
    dto: { reason: string; notes?: string; proofImages?: string[]; proofVideos?: string[] },
  ) {
    const order = await this.getOrderDetails(userId, orderId);

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Đơn hàng đã bị hủy, không thể yêu cầu trả hàng.');
    }
    if (order.status === OrderStatus.RETURNED) {
      throw new BadRequestException('Đơn hàng này đã ở trạng thái Trả hàng / Hoàn tiền.');
    }

    const currentRaw = (order.rawPayload as Record<string, any>) || {};
    const disputeData = {
      status: 'OPENED',
      openedAt: new Date().toISOString(),
      customerId: userId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      reason: dto.reason,
      customerNotes: dto.notes || null,
      customerProofImages: dto.proofImages || [],
      customerProofVideos: dto.proofVideos || [],
    };

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.RETURNED,
        overrideReason: `Khách yêu cầu Trả hàng/Hoàn tiền: ${dto.reason}`,
        rawPayload: {
          ...currentRaw,
          dispute: disputeData,
        },
      },
    });

    // Tạo thông báo cho khách hàng
    try {
      await this.prisma.notification.create({
        data: {
          userId,
          title: `Yêu cầu Trả hàng / Hoàn tiền đơn #${order.externalOrderSn || order.id.slice(0, 8)}`,
          message: `Hệ thống đã tiếp nhận yêu cầu Trả hàng / Hoàn tiền. Lý do: "${dto.reason}". Đang chuyển cho Gian hàng & Trọng tài SCANMS xử lý.`,
          type: 'DISPUTE_OPENED',
          data: { orderId: order.id, externalOrderSn: order.externalOrderSn },
        },
      });
    } catch {}

    // Tạo thông báo cho Chủ shop (nếu có)
    if (order.store?.ownerId) {
      try {
        await this.prisma.notification.create({
          data: {
            userId: order.store.ownerId,
            title: `Khiếu nại Trả hàng / Hoàn tiền đơn #${order.externalOrderSn}`,
            message: `Khách hàng đã yêu cầu Trả hàng / Hoàn tiền cho đơn #${order.externalOrderSn}. Lý do: "${dto.reason}".`,
            type: 'DISPUTE_OPENED',
            data: { orderId: order.id, externalOrderSn: order.externalOrderSn },
          },
        });
      } catch {}
    }

    return {
      success: true,
      message: 'Gửi yêu cầu Trả hàng / Hoàn tiền thành công!',
      order: updatedOrder,
    };
  }

  /**
   * 7. Quản lý sổ địa chỉ (Address Book)
   */
  async getAddresses(userId: string) {
    return this.prisma.customerAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(userId: string, dto: CreateCustomerAddressDto) {
    const existingCount = await this.prisma.customerAddress.count({
      where: { userId },
    });

    const shouldBeDefault = dto.isDefault || existingCount === 0;

    if (shouldBeDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const newAddress = await this.prisma.customerAddress.create({
      data: {
        userId,
        fullName: dto.fullName.trim(),
        phoneNumber: dto.phoneNumber.trim(),
        provinceCode: dto.provinceCode,
        provinceName: dto.provinceName.trim(),
        districtCode: dto.districtCode,
        districtName: dto.districtName.trim(),
        wardCode: dto.wardCode,
        wardName: dto.wardName.trim(),
        detailAddress: dto.detailAddress.trim(),
        isDefault: shouldBeDefault,
      },
    });

    return {
      message: 'Thêm địa chỉ nhận hàng thành công',
      address: newAddress,
    };
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateCustomerAddressDto) {
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundException('Không tìm thấy địa chỉ nhận hàng');
    }

    if (dto.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.customerAddress.update({
      where: { id: addressId },
      data: {
        fullName: dto.fullName !== undefined ? dto.fullName.trim() : undefined,
        phoneNumber: dto.phoneNumber !== undefined ? dto.phoneNumber.trim() : undefined,
        provinceCode: dto.provinceCode !== undefined ? dto.provinceCode : undefined,
        provinceName: dto.provinceName !== undefined ? dto.provinceName.trim() : undefined,
        districtCode: dto.districtCode !== undefined ? dto.districtCode : undefined,
        districtName: dto.districtName !== undefined ? dto.districtName.trim() : undefined,
        wardCode: dto.wardCode !== undefined ? dto.wardCode : undefined,
        wardName: dto.wardName !== undefined ? dto.wardName.trim() : undefined,
        detailAddress: dto.detailAddress !== undefined ? dto.detailAddress.trim() : undefined,
        isDefault: dto.isDefault !== undefined ? dto.isDefault : undefined,
      },
    });

    return {
      message: 'Cập nhật địa chỉ nhận hàng thành công',
      address: updated,
    };
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundException('Không tìm thấy địa chỉ');
    }

    await this.prisma.customerAddress.delete({
      where: { id: addressId },
    });

    // Nếu xóa địa chỉ mặc định, tự động gán địa chỉ còn lại làm mặc định
    if (address.isDefault) {
      const remaining = await this.prisma.customerAddress.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      if (remaining) {
        await this.prisma.customerAddress.update({
          where: { id: remaining.id },
          data: { isDefault: true },
        });
      }
    }

    return { message: 'Đã xóa địa chỉ thành công' };
  }

  async setDefaultAddress(userId: string, addressId: string) {
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundException('Không tìm thấy địa chỉ');
    }

    await this.prisma.customerAddress.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    const updated = await this.prisma.customerAddress.update({
      where: { id: addressId },
      data: { isDefault: true },
    });

    return {
      message: 'Đã đặt làm địa chỉ mặc định',
      address: updated,
    };
  }

  /**
   * 8. Quản lý danh sách sản phẩm yêu thích (Wishlist)
   */
  async getWishlist(userId: string) {
    const items = await this.prisma.customerWishlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            store: { select: { id: true, name: true, slug: true, logoUrl: true } },
            variants: true,
          },
        },
      },
    });

    return items.map((w) => ({
      wishlistId: w.id,
      createdAt: w.createdAt,
      product: w.product,
    }));
  }

  async toggleWishlist(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    const existing = await this.prisma.customerWishlist.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    if (existing) {
      await this.prisma.customerWishlist.delete({
        where: { id: existing.id },
      });
      return { wishlisted: false, message: 'Đã xóa khỏi danh sách yêu thích' };
    }

    await this.prisma.customerWishlist.create({
      data: { userId, productId },
    });

    return { wishlisted: true, message: 'Đã thêm vào danh sách yêu thích' };
  }

  async removeFromWishlist(userId: string, productId: string) {
    await this.prisma.customerWishlist.deleteMany({
      where: { userId, productId },
    });
    return { wishlisted: false, message: 'Đã xóa khỏi danh sách yêu thích' };
  }

  // ==========================================
  // 5. XÁC MINH CCCD THÔNG TIN CÁ NHÂN (CHUẨN SHOPEE)
  // ==========================================
  private getIdentityFilePath(): string {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
    return path.join(dir, 'customer-identities.json');
  }

  private loadAllCustomerIdentities(): Record<string, any> {
    try {
      const filePath = this.getIdentityFilePath();
      if (!fs.existsSync(filePath)) return {};
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  private saveCustomerIdentityRecord(userId: string, record: any) {
    try {
      const filePath = this.getIdentityFilePath();
      const all = this.loadAllCustomerIdentities();
      all[userId] = record;
      fs.writeFileSync(filePath, JSON.stringify(all, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save customer identity:', err);
    }
  }

  /**
   * 5.1. Lấy thông tin CCCD của khách hàng (Chuẩn Shopee)
   */
  async getCustomerIdentity(userId: string) {
    const all = this.loadAllCustomerIdentities();
    const record = all[userId];

    if (!record) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true },
      });
      return {
        isVerified: false,
        fullName: user?.fullName || '',
        idCardNumber: '',
        address: '',
      };
    }

    return {
      isVerified: true,
      ...record,
    };
  }

  /**
   * 5.2. Xác thực và lưu thông tin CCCD của khách hàng (Chuẩn Shopee)
   */
  async verifyCustomerIdentity(userId: string, dto: VerifyCustomerIdentityDto) {
    const fullName = dto.fullName.trim();
    const cleanId = dto.idCardNumber.trim().replace(/\s+/g, '');
    const address = dto.address.trim();

    if (!fullName || fullName.length < 2) {
      throw new BadRequestException('Họ và tên phải có ít nhất 2 ký tự');
    }
    if (!/^\d{9,12}$/.test(cleanId)) {
      throw new BadRequestException('Số CCCD phải gồm 9 hoặc 12 chữ số hợp lệ');
    }
    if (!address || address.length < 5) {
      throw new BadRequestException('Vui lòng nhập đầy đủ địa chỉ nơi thường trú trên CCCD');
    }

    // Cập nhật họ tên của tài khoản đồng bộ với CCCD
    await this.prisma.user.update({
      where: { id: userId },
      data: { fullName },
    }).catch(() => {});

    // Đồng bộ vào CollaboratorProfile nếu có
    await this.prisma.collaboratorProfile.update({
      where: { userId },
      data: { idCardNumber: cleanId },
    }).catch(() => {});

    const record = {
      fullName,
      idCardNumber: cleanId,
      address,
      verifiedAt: new Date().toISOString(),
    };

    this.saveCustomerIdentityRecord(userId, record);

    return {
      success: true,
      message: 'Xác minh thông tin CCCD thành công!',
      data: {
        isVerified: true,
        ...record,
      },
    };
  }
}

