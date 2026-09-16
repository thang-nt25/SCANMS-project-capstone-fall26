import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import {
  QueryAuditLogsDto,
  ExportAuditLogsDto,
  AuditStatsResponse,
  AuditActionDefinition,
  AuditCategory,
  AuditSeverity,
} from './dto/audit.dto';
import { Prisma } from '@prisma/client';

export const AUDIT_ACTIONS: AuditActionDefinition[] = [
  // AUTH
  {
    code: 'USER_REGISTER',
    nameVi: 'Đăng ký tài khoản',
    category: 'AUTH',
    severity: 'INFO',
    description: 'Người dùng mới đăng ký tham gia hệ thống',
  },
  {
    code: 'USER_LOGIN',
    nameVi: 'Đăng nhập hệ thống',
    category: 'AUTH',
    severity: 'INFO',
    description: 'Người dùng đăng nhập thành công vào hệ thống',
  },
  {
    code: 'USER_LOGOUT',
    nameVi: 'Đăng xuất',
    category: 'AUTH',
    severity: 'INFO',
    description: 'Người dùng kết thúc phiên đăng nhập',
  },
  {
    code: 'PASSWORD_CHANGED',
    nameVi: 'Đổi mật khẩu',
    category: 'AUTH',
    severity: 'WARN',
    description: 'Người dùng cập nhật mật khẩu đăng nhập',
  },
  {
    code: 'KYC_APPROVED',
    nameVi: 'Duyệt hồ sơ KYC',
    category: 'AUTH',
    severity: 'INFO',
    description: 'Admin hoặc Shop duyệt danh tính CTV',
  },
  {
    code: 'KYC_REJECTED',
    nameVi: 'Từ chối hồ sơ KYC',
    category: 'AUTH',
    severity: 'WARN',
    description: 'Từ chối hồ sơ danh tính do không hợp lệ',
  },
  {
    code: 'USER_STATUS_UPDATED',
    nameVi: 'Khóa / Mở tài khoản',
    category: 'AUTH',
    severity: 'CRITICAL',
    description: 'Thay đổi trạng thái hoạt động tài khoản',
  },

  // FINANCIAL
  {
    code: 'PAYOUT_REQUESTED',
    nameVi: 'Yêu cầu rút tiền',
    category: 'FINANCIAL',
    severity: 'INFO',
    description: 'KOL gửi yêu cầu rút hoa hồng',
  },
  {
    code: 'PAYOUT_APPROVED',
    nameVi: 'Duyệt lệnh rút tiền',
    category: 'FINANCIAL',
    severity: 'WARN',
    description: 'Chủ shop hoặc kế toán duyệt chuyển tiền hoa hồng',
  },
  {
    code: 'PAYOUT_REJECTED',
    nameVi: 'Từ chối rút tiền',
    category: 'FINANCIAL',
    severity: 'WARN',
    description: 'Từ chối lệnh rút tiền kèm lý do',
  },
  {
    code: 'COMMISSION_RULE_CREATED',
    nameVi: 'Tạo chính sách thưởng',
    category: 'FINANCIAL',
    severity: 'INFO',
    description: 'Thiết lập mốc hoa hồng và bậc thưởng doanh số mới',
  },
  {
    code: 'COMMISSION_RULE_UPDATED',
    nameVi: 'Sửa chính sách thưởng',
    category: 'FINANCIAL',
    severity: 'WARN',
    description: 'Thay đổi tỷ lệ hoặc mốc thưởng hoa hồng',
  },
  {
    code: 'COMMISSION_FROZEN',
    nameVi: 'Đóng băng hoa hồng',
    category: 'FINANCIAL',
    severity: 'CRITICAL',
    description: 'Đóng băng hoa hồng nghi vấn gian lận',
  },

  // PRODUCT & MEDIA
  {
    code: 'PRODUCT_CREATED',
    nameVi: 'Tạo sản phẩm',
    category: 'PRODUCT',
    severity: 'INFO',
    description: 'Thêm sản phẩm mới vào gian hàng',
  },
  {
    code: 'PRODUCT_UPDATED',
    nameVi: 'Cập nhật sản phẩm',
    category: 'PRODUCT',
    severity: 'INFO',
    description: 'Chỉnh sửa thông tin, giá bán hoặc hoa hồng sản phẩm',
  },
  {
    code: 'PRODUCT_DELETED',
    nameVi: 'Xóa sản phẩm (Soft Delete)',
    category: 'PRODUCT',
    severity: 'WARN',
    description: 'Xóa hoặc ngừng kinh doanh sản phẩm',
  },
  {
    code: 'MEDIA_REVIEWED',
    nameVi: 'Kiểm duyệt video review',
    category: 'PRODUCT',
    severity: 'INFO',
    description: 'Shop duyệt, từ chối hoặc ghim video của KOL',
  },

  // SAMPLE & CAMPAIGN
  {
    code: 'SAMPLE_REQUEST_CREATED',
    nameVi: 'Gửi yêu cầu mẫu thử',
    category: 'SAMPLE_CAMPAIGN',
    severity: 'INFO',
    description: 'KOL gửi yêu cầu xin sản phẩm mẫu trải nghiệm',
  },
  {
    code: 'SAMPLE_REQUEST_APPROVED',
    nameVi: 'Duyệt gửi hàng mẫu',
    category: 'SAMPLE_CAMPAIGN',
    severity: 'INFO',
    description: 'Shop duyệt gửi hàng mẫu kèm mã vận đơn',
  },
  {
    code: 'SAMPLE_REQUEST_REJECTED',
    nameVi: 'Từ chối gửi mẫu thử',
    category: 'SAMPLE_CAMPAIGN',
    severity: 'WARN',
    description: 'Shop từ chối yêu cầu xin mẫu của KOL',
  },
  {
    code: 'CAMPAIGN_CREATED',
    nameVi: 'Tạo chiến dịch mới',
    category: 'SAMPLE_CAMPAIGN',
    severity: 'INFO',
    description: 'Khởi tạo chiến dịch marketing độc quyền',
  },
  {
    code: 'CAMPAIGN_INVITE_SENT',
    nameVi: 'Gửi thiệp mời chiến dịch',
    category: 'SAMPLE_CAMPAIGN',
    severity: 'INFO',
    description: 'Gửi thẻ mời tham gia chiến dịch qua chat',
  },
  {
    code: 'CAMPAIGN_INVITE_ACCEPTED',
    nameVi: 'Chấp nhận lời mời chiến dịch',
    category: 'SAMPLE_CAMPAIGN',
    severity: 'INFO',
    description: 'KOL đồng ý tham gia chiến dịch',
  },
  {
    code: 'CAMPAIGN_INVITE_REJECTED',
    nameVi: 'Từ chối lời mời chiến dịch',
    category: 'SAMPLE_CAMPAIGN',
    severity: 'INFO',
    description: 'KOL từ chối tham gia chiến dịch',
  },

  // AI & SECURITY
  {
    code: 'AI_FRAUD_FLAGGED',
    nameVi: 'Cảnh báo gian lận AI',
    category: 'AI_SECURITY',
    severity: 'CRITICAL',
    description: 'Hệ thống AI phát hiện bất thường traffic hoặc conversion',
  },
  {
    code: 'AI_FRAUD_ACTION_APPLIED',
    nameVi: 'Xử lý vi phạm gian lận',
    category: 'AI_SECURITY',
    severity: 'CRITICAL',
    description: 'Thực thi phán quyết phòng vệ: Đóng băng ví, tạm dừng link',
  },
  {
    code: 'FRAUD_ALERT_DISMISSED',
    nameVi: 'Bác bỏ cảnh báo gian lận',
    category: 'AI_SECURITY',
    severity: 'INFO',
    description: 'Xác nhận lưu lượng an toàn và bỏ cờ cảnh báo',
  },
  {
    code: 'CREATE_REFERRAL_LINK',
    nameVi: 'Tạo link tiếp thị',
    category: 'SYSTEM',
    severity: 'INFO',
    description: 'Tạo link định danh tiếp thị liên kết',
  },
  {
    code: 'ADMIN_VIEW_TRACKING_EVENTS',
    nameVi: 'Xem log tracking kỹ thuật',
    category: 'SYSTEM',
    severity: 'WARN',
    description: 'Quản trị viên truy cập dữ liệu kỹ thuật chi tiết',
  },
];

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper an toàn ghi nhận nhật ký kiểm toán (Fail-safe)
   */
  async recordAuditLog(
    userId: string | null,
    action: string,
    details: any = {},
    ipAddress?: string,
    eventId?: string,
  ): Promise<any> {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: userId || null,
          action,
          details: details ? details : undefined,
          ipAddress: ipAddress || '127.0.0.1',
          eventId: eventId || undefined,
        },
      });
    } catch (err: any) {
      this.logger.warn(`[FAIL-SAFE] Ghi AuditLog [${action}] thất bại: ${err.message}`);
      return null;
    }
  }

  /**
   * Phân loại action code thành Category và Severity
   */
  resolveActionMeta(actionCode: string): {
    category: AuditCategory;
    severity: AuditSeverity;
    nameVi: string;
    description: string;
  } {
    const found = AUDIT_ACTIONS.find((a) => a.code === actionCode);
    if (found) {
      return {
        category: found.category,
        severity: found.severity,
        nameVi: found.nameVi,
        description: found.description,
      };
    }

    // Heuristics cho các action tùy biến
    const upper = actionCode.toUpperCase();
    if (upper.includes('FRAUD') || upper.includes('CRITICAL') || upper.includes('LOCK')) {
      return {
        category: 'AI_SECURITY',
        severity: 'CRITICAL',
        nameVi: actionCode,
        description: 'Sự kiện bảo mật & cảnh báo an ninh',
      };
    }
    if (upper.includes('PAYOUT') || upper.includes('COMMISSION') || upper.includes('WALLET')) {
      return {
        category: 'FINANCIAL',
        severity: 'WARN',
        nameVi: actionCode,
        description: 'Sự kiện biến động tài chính',
      };
    }
    if (upper.includes('AUTH') || upper.includes('LOGIN') || upper.includes('USER') || upper.includes('KYC')) {
      return {
        category: 'AUTH',
        severity: 'INFO',
        nameVi: actionCode,
        description: 'Sự kiện xác thực người dùng',
      };
    }
    if (upper.includes('PRODUCT') || upper.includes('MEDIA')) {
      return {
        category: 'PRODUCT',
        severity: 'INFO',
        nameVi: actionCode,
        description: 'Sự kiện quản lý sản phẩm / media',
      };
    }
    if (upper.includes('CAMPAIGN') || upper.includes('SAMPLE')) {
      return {
        category: 'SAMPLE_CAMPAIGN',
        severity: 'INFO',
        nameVi: actionCode,
        description: 'Sự kiện chiến dịch & hàng mẫu',
      };
    }

    return {
      category: 'OTHER',
      severity: 'INFO',
      nameVi: actionCode,
      description: 'Sự kiện hệ thống',
    };
  }

  /**
   * Truy vấn danh sách Audit Logs phân trang và có lọc đa tiêu chí
   */
  async getAuditLogs(query: QueryAuditLogsDto, currentUser?: any) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    // Filter theo user cụ thể
    if (query.userId) {
      where.userId = query.userId;
    }

    // Filter theo action cụ thể
    if (query.action) {
      where.action = query.action;
    }

    // Filter theo category
    if (query.category) {
      const actionsInCat = AUDIT_ACTIONS.filter((a) => a.category === query.category).map(
        (a) => a.code,
      );
      if (actionsInCat.length > 0) {
        where.action = { in: actionsInCat };
      }
    }

    // Filter theo timeframe
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    // Search keyword (IP, Action, User email/name)
    if (query.keyword && query.keyword.trim()) {
      const kw = query.keyword.trim();
      where.OR = [
        { action: { contains: kw, mode: 'insensitive' } },
        { ipAddress: { contains: kw, mode: 'insensitive' } },
        { user: { fullName: { contains: kw, mode: 'insensitive' } } },
        { user: { email: { contains: kw, mode: 'insensitive' } } },
      ];
    }

    // Lọc theo vai trò người thực hiện
    if (query.role) {
      where.user = {
        role: query.role as any,
      };
    }

    const [total, rawLogs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              collaboratorProfile: {
                select: {
                  avatarUrl: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const formattedLogs = rawLogs.map((log) => {
      const meta = this.resolveActionMeta(log.action);
      return {
        id: log.id,
        eventId: log.eventId,
        action: log.action,
        actionNameVi: meta.nameVi,
        category: meta.category,
        severity: meta.severity,
        description: meta.description,
        ipAddress: log.ipAddress || '127.0.0.1',
        details: log.details,
        createdAt: log.createdAt.toISOString(),
        actor: log.user
          ? {
              id: log.user.id,
              name: log.user.fullName || 'Người dùng',
              email: log.user.email,
              role: log.user.role,
              avatarUrl: log.user.collaboratorProfile?.avatarUrl || null,
            }
          : {
              id: 'SYSTEM',
              name: 'Hệ thống tự động',
              email: 'system@scanms.vn',
              role: 'SYSTEM',
              avatarUrl: null,
            },
      };
    });

    return {
      success: true,
      data: {
        items: formattedLogs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    };
  }

  /**
   * Lấy chi tiết 1 bản ghi Audit Log theo ID
   */
  async getAuditLogById(id: string) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            collaboratorProfile: {
              select: {
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundException(`Không tìm thấy nhật ký kiểm toán mã [${id}]`);
    }

    const meta = this.resolveActionMeta(log.action);

    return {
      success: true,
      data: {
        id: log.id,
        eventId: log.eventId,
        action: log.action,
        actionNameVi: meta.nameVi,
        category: meta.category,
        severity: meta.severity,
        description: meta.description,
        ipAddress: log.ipAddress || '127.0.0.1',
        details: log.details,
        createdAt: log.createdAt.toISOString(),
        actor: log.user
          ? {
              id: log.user.id,
              name: log.user.fullName || 'Người dùng',
              email: log.user.email,
              role: log.user.role,
              avatarUrl: log.user.collaboratorProfile?.avatarUrl || null,
            }
          : {
              id: 'SYSTEM',
              name: 'Hệ thống tự động',
              email: 'system@scanms.vn',
              role: 'SYSTEM',
              avatarUrl: null,
            },
      },
    };
  }

  /**
   * Thống kê tổng quan KPI và phân loại Audit Logs
   */
  async getAuditStats(timeframe: '24h' | '7d' | '30d' | 'all' = '30d'): Promise<{
    success: boolean;
    data: AuditStatsResponse;
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let dateGte: Date | undefined;
    if (timeframe === '24h') {
      dateGte = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (timeframe === '7d') {
      dateGte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === '30d') {
      dateGte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const whereTime: Prisma.AuditLogWhereInput = dateGte ? { createdAt: { gte: dateGte } } : {};

    const [totalEvents, eventsToday, allLogs] = await Promise.all([
      this.prisma.auditLog.count({ where: whereTime }),
      this.prisma.auditLog.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.auditLog.findMany({
        where: whereTime,
        select: {
          action: true,
          userId: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
        take: 1000,
      }),
    ]);

    // Phân loại đếm
    let financialEventsCount = 0;
    let securityEventsCount = 0;
    let authEventsCount = 0;
    const catCounts: Record<string, number> = {
      AUTH: 0,
      FINANCIAL: 0,
      PRODUCT: 0,
      STORE: 0,
      SAMPLE_CAMPAIGN: 0,
      AI_SECURITY: 0,
      SYSTEM: 0,
      OTHER: 0,
    };
    const severityCounts = {
      info: 0,
      warn: 0,
      critical: 0,
    };

    const actorMap = new Map<
      string,
      { userId: string; userName: string; userEmail: string; role: string; count: number }
    >();

    allLogs.forEach((log) => {
      const meta = this.resolveActionMeta(log.action);
      catCounts[meta.category] = (catCounts[meta.category] || 0) + 1;

      if (meta.category === 'FINANCIAL') financialEventsCount++;
      if (meta.category === 'AI_SECURITY') securityEventsCount++;
      if (meta.category === 'AUTH') authEventsCount++;

      if (meta.severity === 'INFO') severityCounts.info++;
      if (meta.severity === 'WARN') severityCounts.warn++;
      if (meta.severity === 'CRITICAL') severityCounts.critical++;

      if (log.user) {
        const uId = log.user.id;
        const cur = actorMap.get(uId) || {
          userId: uId,
          userName: log.user.fullName || 'Người dùng',
          userEmail: log.user.email,
          role: log.user.role,
          count: 0,
        };
        cur.count++;
        actorMap.set(uId, cur);
      }
    });

    const categoryNamesVi: Record<string, string> = {
      AUTH: 'Xác thực & Danh tính',
      FINANCIAL: 'Tài chính & Hoa hồng',
      PRODUCT: 'Sản phẩm & Media',
      STORE: 'Gian hàng D2C',
      SAMPLE_CAMPAIGN: 'Chiến dịch & Hàng mẫu',
      AI_SECURITY: 'An ninh & AI Gian lận',
      SYSTEM: 'Hệ thống chung',
      OTHER: 'Khác',
    };

    const categoryBreakdown = Object.entries(catCounts)
      .filter(([_, count]) => count > 0)
      .map(([cat, count]) => ({
        category: cat as AuditCategory,
        categoryNameVi: categoryNamesVi[cat] || cat,
        count,
        percentage: totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const topActors = Array.from(actorMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      success: true,
      data: {
        totalEvents,
        eventsToday,
        financialEventsCount,
        securityEventsCount,
        authEventsCount,
        topActors,
        categoryBreakdown,
        recentSeverityCounts: severityCounts,
      },
    };
  }

  /**
   * Danh sách action codes có sẵn trong hệ thống
   */
  getAvailableActions() {
    return {
      success: true,
      data: AUDIT_ACTIONS,
    };
  }

  /**
   * Xuất danh sách kiểm toán ra CSV
   */
  async exportAuditLogsCsv(query: ExportAuditLogsDto) {
    const where: Prisma.AuditLogWhereInput = {};

    if (query.action) {
      where.action = query.action;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    if (query.keyword && query.keyword.trim()) {
      const kw = query.keyword.trim();
      where.OR = [
        { action: { contains: kw, mode: 'insensitive' } },
        { ipAddress: { contains: kw, mode: 'insensitive' } },
        { user: { fullName: { contains: kw, mode: 'insensitive' } } },
        { user: { email: { contains: kw, mode: 'insensitive' } } },
      ];
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 2000,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    const headers = [
      'STT',
      'Mã Log (ID)',
      'Event ID',
      'Thời gian (UTC)',
      'Hành động (Action)',
      'Tên nghiệp vụ',
      'Phân loại (Category)',
      'Mức độ (Severity)',
      'Người thực hiện',
      'Email',
      'Vai trò',
      'Địa chỉ IP',
      'Chi tiết JSON (Details)',
    ];

    const rows = logs.map((log, idx) => {
      const meta = this.resolveActionMeta(log.action);
      const detailsStr = log.details ? JSON.stringify(log.details).replace(/"/g, '""') : '';
      return [
        idx + 1,
        `"${log.id}"`,
        `"${log.eventId || ''}"`,
        `"${log.createdAt.toISOString()}"`,
        `"${log.action}"`,
        `"${meta.nameVi}"`,
        `"${meta.category}"`,
        `"${meta.severity}"`,
        `"${log.user?.fullName || 'Hệ thống'}"`,
        `"${log.user?.email || 'system@scanms.vn'}"`,
        `"${log.user?.role || 'SYSTEM'}"`,
        `"${log.ipAddress || '127.0.0.1'}"`,
        `"${detailsStr}"`,
      ].join(',');
    });

    // Thêm UTF-8 BOM để Excel hiển thị tiếng Việt chính xác
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

    return {
      csvContent,
      filename: `scanms_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`,
      totalRecords: logs.length,
    };
  }
}
