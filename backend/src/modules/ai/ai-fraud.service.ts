import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { createHash } from 'node:crypto';
import {
  FraudScanQueryDto,
  FraudIncidentDto,
  FraudScanSummaryDto,
  FraudRiskLevel,
  FraudAnomalyType,
  FraudActionDto,
  FraudEvidenceItem,
} from './dto/ai-fraud.dto';

// In-memory persistent action store for incidents
interface IncidentActionRecord {
  status: 'ACTIVE' | 'FROZEN' | 'RESOLVED' | 'DISMISSED';
  history: Array<{
    action: string;
    performedBy: string;
    performedAt: Date;
    note?: string;
  }>;
}

@Injectable()
export class AiFraudService {
  private readonly logger = new Logger(AiFraudService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Quét toàn diện traffic phát hiện bất thường & gian lận (AI Anti-Fraud Traffic Scan)
   */
  async scanTraffic(
    query: FraudScanQueryDto,
    requesterUser: { id: string; role: string; email: string },
  ): Promise<FraudScanSummaryDto> {
    const isShop = requesterUser.role === 'SHOP_MANAGER';
    let targetStoreId = query.storeId;

    if (isShop) {
      const shop = await this.prisma.store.findFirst({
        where: { ownerId: requesterUser.id, isDeleted: false, ...(targetStoreId ? { id: targetStoreId } : {}) },
        select: { id: true },
      });
      if (!shop) throw new ForbiddenException('Không có quyền quét gian hàng này.');
      targetStoreId = shop.id;
    }
    const isCreator = requesterUser.role === 'COLLABORATOR';
    if (!isShop && !isCreator && !['SYSTEM_ADMIN', 'SYSTEM_MANAGER'].includes(requesterUser.role)) throw new ForbiddenException();
    if (isCreator && query.collaboratorId && query.collaboratorId !== requesterUser.id) throw new ForbiddenException('Chỉ được xem dữ liệu của chính mình.');
    const timeframe = query.timeframe || '30d';
    const windowDays = { '24h': 1, '7d': 7, '30d': 30, all: null }[timeframe];
    if (windowDays === undefined) throw new BadRequestException('Khoảng thời gian không hợp lệ.');
    const now = new Date();
    const period = { ...(windowDays === null ? {} : { gte: new Date(now.getTime() - windowDays * 86400000) }), lte: now };
    const orderFilter = { status: { notIn: ['CANCELLED', 'RETURNED'] as any }, createdAt: period };

    // Lấy danh sách link tiếp thị và các phiên truy cập
    const whereClause: any = { deletedAt: null };
    if (targetStoreId) whereClause.storeId = targetStoreId;
    if (query.collaboratorId) whereClause.collaboratorId = query.collaboratorId;
    if (isCreator) whereClause.collaboratorId = requesterUser.id;

    const referralLinks = await this.prisma.referralLink.findMany({
      where: whereClause,
      include: {
        _count: { select: { orders: { where: orderFilter }, clickTrafficLogs: { where: { createdAt: period } } } },
        collaborator: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            role: true,
            collaboratorProfile: {
              select: {
                avatarUrl: true,
                tier: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        product: {
          select: {
            id: true,
            title: true,
            price: true,
          },
        },
        orders: {
          where: orderFilter,
          select: {
            id: true,
            customerId: true,
            customerName: true,
            customerPhone: true,
            customerEmail: true,
            finalAmount: true,
          },
          take: 50,
        },
        clickTrafficLogs: {
          where: { createdAt: period },
          take: 100,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true,
            riskReason: true,
          },
        },
      },
    });

    const actionRecords = referralLinks.length ? await this.prisma.auditLog.findMany({
      where: { action: { startsWith: 'FRAUD_MITIGATION_' }, OR: referralLinks.map(link => ({ details: { path: ['linkId'], equals: link.id } })) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { action: true, details: true, createdAt: true, userId: true },
    }) : [];
    const savedActions = new Map<string, IncidentActionRecord>();
    for (const record of actionRecords) {
      const details = record.details as Record<string, unknown> | null;
      if (typeof details?.linkId !== 'string') continue;
      const action = record.action.replace('FRAUD_MITIGATION_', '');
      const status = action === 'DISMISS' ? 'DISMISSED' : action === 'RESOLVE' ? 'RESOLVED' : 'FROZEN';
      const state = savedActions.get(details.linkId) || { status, history: [] };
      if (state.history.length < 20) state.history.push({ action, performedBy: String(details.actorName || record.userId || 'Hệ thống'), performedAt: record.createdAt, note: typeof details.note === 'string' ? details.note : undefined });
      savedActions.set(details.linkId, state);
    }
    const collaboratorIds = [
      ...new Set(referralLinks.map((link) => link.collaboratorId)),
    ];
    const pendingCommissions = collaboratorIds.length
      ? await this.prisma.commission.groupBy({
          by: ['collaboratorId'],
          where: {
            collaboratorId: { in: collaboratorIds },
            status: 'PENDING',
            ...(targetStoreId ? { order: { storeId: targetStoreId } } : {}),
          },
          _sum: { commissionAmount: true },
        })
      : [];
    const pendingAmountByCollaborator = new Map(
      pendingCommissions.map((commission) => [
        commission.collaboratorId,
        Number(commission._sum.commissionAmount || 0),
      ]),
    );

    const incidents: FraudIncidentDto[] = [];
    let totalScannedClicks = 0;
    let potentialSavedAmount = 0;
    const countedCollaborators = new Set<string>();

    for (const link of referralLinks) {
      const pendingAmount =
        pendingAmountByCollaborator.get(link.collaboratorId) ?? 0;
      const relatedOrders = link.orders;

      const totalOrdersCount = link._count.orders;
      const totalClicks = link._count.clickTrafficLogs;
      totalScannedClicks += totalClicks;

      const incidentId = `incident-${link.id}`;
      const actionRecord = savedActions.get(link.id);

      // Phân tích dữ liệu bằng thuật toán AI Anomaly Heuristics (kèm Self-Referral Detection)
      const analysis = this.evaluateFraudAnomalies({
        linkCode: link.shortCode,
        totalClicks,
        totalOrders: totalOrdersCount,
        logs: link.clickTrafficLogs,
        productPrice: Number(link.product?.price || 0),
        pendingAmount,
        orders: relatedOrders,
        collaborator: link.collaborator,
      });

      // Nếu có query minRiskScore thì filter
      if (
        query.minRiskScore !== undefined &&
        analysis.riskScore < query.minRiskScore
      ) {
        continue;
      }

      const currentStatus =
        actionRecord?.status ||
        (link.status === 'PAUSED' ? 'FROZEN' : 'ACTIVE');

      if (query.status && currentStatus !== query.status) {
        continue;
      }

      if (analysis.riskScore >= 70) {
        const hash = createHash('sha256').update(`AI_FRAUD_FLAG:v1:${link.id}:${timeframe}:${now.toISOString().slice(0, 10)}`).digest('hex').slice(0, 32);
        const eventId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20)}`;
        await this.prisma.auditLog.upsert({ where: { eventId }, update: {}, create: {
          eventId, userId: requesterUser.id, action: 'AI_FRAUD_FLAG',
          details: { incidentId, linkId: link.id, storeId: link.storeId, timeframe, totalClicks, totalOrders: totalOrdersCount, riskScore: analysis.riskScore, anomalies: analysis.anomalies, ruleVersion: 1 },
        } });
      }
      if (analysis.riskScore >= 70 && !countedCollaborators.has(link.collaboratorId)) {
        potentialSavedAmount += pendingAmount;
        countedCollaborators.add(link.collaboratorId);
      }

      const incident: FraudIncidentDto = {
        id: incidentId,
        incidentCode: `FRD-2026-${link.shortCode.toUpperCase().slice(-6)}`,
        collaboratorId: link.collaboratorId,
        collaboratorName: link.collaborator.fullName,
        collaboratorEmail: link.collaborator.email,
        collaboratorAvatar:
          link.collaborator.collaboratorProfile?.avatarUrl || undefined,
        collaboratorTier:
          link.collaborator.collaboratorProfile?.tier?.name || 'Đồng',
        storeId: link.storeId,
        storeName: link.store.name,
        referralLinkId: link.id,
        referralLinkCode: link.shortCode,
        productName: link.product?.title || 'Toàn gian hàng',
        riskScore: analysis.riskScore,
        riskLevel: analysis.riskLevel,
        anomalyTypes: analysis.anomalies,
        totalClicks,
        totalOrders: totalOrdersCount,
        conversionRate: Number(
          (totalClicks ? (totalOrdersCount / totalClicks) * 100 : 0).toFixed(2),
        ),
        pendingCommissionAmount: pendingAmount,
        aiReasoning: analysis.aiReasoning,
        evidences: analysis.evidences,
        suggestedAction: analysis.suggestedAction,
        status: currentStatus,
        detectedAt: link.updatedAt || link.createdAt,
        actionHistory: actionRecord?.history || [],
      };

      incidents.push(incident);
    }

    // Sắp xếp các sự vụ theo điểm nguy cơ giảm dần
    incidents.sort((a, b) => b.riskScore - a.riskScore);

    const criticalCount = incidents.filter(
      (i) => i.riskLevel === 'FRAUD_CRITICAL',
    ).length;
    const suspiciousCount = incidents.filter(
      (i) => i.riskLevel === 'SUSPICIOUS',
    ).length;
    const lowRiskCount = incidents.filter(
      (i) => i.riskLevel === 'LOW_RISK',
    ).length;
    const cleanCount = incidents.filter((i) => i.riskLevel === 'CLEAN').length;

    return {
      totalScannedLinks: referralLinks.length,
      totalScannedClicks,
      totalIncidents: incidents.filter((i) => i.riskScore >= 40).length,
      criticalCount,
      suspiciousCount,
      lowRiskCount,
      cleanCount,
      potentialSavedAmount,
      scanTimestamp: new Date(),
      incidents,
    };
  }

  /**
   * Lấy danh sách sự vụ nghi vấn gian lận
   */
  async getIncidents(
    query: FraudScanQueryDto,
    requesterUser: any,
  ): Promise<FraudIncidentDto[]> {
    const summary = await this.scanTraffic(query, requesterUser);
    return summary.incidents;
  }

  /**
   * Lấy chi tiết sự vụ theo ID
   */
  async getIncidentById(
    incidentId: string,
    requesterUser: any,
  ): Promise<FraudIncidentDto> {
    const summary = await this.scanTraffic({}, requesterUser);
    const incident = summary.incidents.find((i) => i.id === incidentId);
    if (!incident) {
      throw new NotFoundException(
        `Không tìm thấy sự vụ gian lận với mã ${incidentId}`,
      );
    }
    return incident;
  }

  /**
   * Phân tích chuyên sâu 1 KOL cụ thể
   */
  async analyzeCollaboratorFraud(
    collaboratorId: string,
    requesterUser: any,
  ): Promise<FraudIncidentDto> {
    const summary = await this.scanTraffic({ collaboratorId }, requesterUser);
    if (summary.incidents.length === 0) {
      if (requesterUser.role === 'SHOP_MANAGER') throw new NotFoundException('Chưa có dữ liệu đối tác trong gian hàng này.');
      const user = await this.prisma.user.findUnique({
        where: { id: collaboratorId },
        include: { collaboratorProfile: { include: { tier: true } } },
      });
      if (!user) {
        throw new NotFoundException('Không tìm thấy thông tin đối tác KOL');
      }

      return {
        id: `kol-${collaboratorId}`,
        incidentCode: `FRD-KOL-${collaboratorId.slice(0, 6).toUpperCase()}`,
        collaboratorId: user.id,
        collaboratorName: user.fullName,
        collaboratorEmail: user.email,
        collaboratorTier: user.collaboratorProfile?.tier?.name || 'Đồng',
        riskScore: 0,
        riskLevel: 'CLEAN',
        anomalyTypes: [],
        totalClicks: 0,
        totalOrders: 0,
        conversionRate: 0,
        pendingCommissionAmount: 0,
        aiReasoning:
          'Chưa có đủ dữ liệu traffic trong phạm vi được phép xem. Không thể kết luận tài khoản an toàn hay gian lận.',
        evidences: [
          {
            metric: 'Lưu lượng sạch',
            value: 'Chưa đủ dữ liệu',
            severity: 'LOW',
            description:
              'Không dùng thiếu dữ liệu làm bằng chứng xác nhận lưu lượng sạch.',
          },
        ],
        suggestedAction: 'NONE',
        status: 'ACTIVE',
        detectedAt: new Date(),
        actionHistory: [],
      };
    }

    return summary.incidents[0];
  }

  /**
   * Xử lý phán quyết sự vụ (Đóng băng hoa hồng, tạm ngưng link, hoặc bỏ qua)
   */
  async takeActionOnIncident(
    incidentId: string,
    actionDto: FraudActionDto,
    actorUser: { id: string; role: string; fullName?: string; email: string },
  ): Promise<{
    success: boolean;
    message: string;
    incident: FraudIncidentDto;
  }> {
    const linkId = incidentId.replace('incident-', '');

    const referralLink = await this.prisma.referralLink.findUnique({
      where: { id: linkId },
      include: { collaborator: true },
    });

    if (!referralLink) {
      throw new NotFoundException(
        `Không tìm thấy link tiếp thị liên quan tới sự vụ ${incidentId}`,
      );
    }

    const messages = {
      FREEZE_COMMISSION: 'Đã tạm ngưng link và giữ hoa hồng chờ của đối tác tại gian hàng này để đối soát.',
      PAUSE_LINK: 'Đã tạm ngưng link tiếp thị nghi vấn.',
      DISMISS: 'Đã bác bỏ cảnh báo và mở lại link. Các khoản giữ hoa hồng phải được đối soát riêng.',
      RESOLVE: 'Đã đánh dấu hoàn tất xử lý sự vụ.',
    };
    const message = messages[actionDto.action];
    if (!message) throw new BadRequestException('Hành động không được hỗ trợ.');
    if (!actionDto.note?.trim() || actionDto.note.trim().length < 10) throw new BadRequestException('Nhập lý do xử lý tối thiểu 10 ký tự.');
    if (!['SYSTEM_ADMIN', 'SYSTEM_MANAGER', 'SHOP_MANAGER'].includes(actorUser.role)) throw new ForbiddenException();
    if (actorUser.role === 'SHOP_MANAGER') {
      const store = await this.prisma.store.findFirst({ where: { id: referralLink.storeId, ownerId: actorUser.id, isDeleted: false }, select: { id: true } });
      if (!store) throw new ForbiddenException('Không có quyền xử lý link của gian hàng khác.');
    }
    // Enforcement and its audit trail either both commit or both roll back.
    await this.prisma.$transaction(async tx => {
      if (actionDto.action !== 'RESOLVE') await tx.referralLink.update({
        where: { id: linkId }, data: { status: actionDto.action === 'DISMISS' ? 'ACTIVE' : 'PAUSED' },
      });
      if (actionDto.action === 'FREEZE_COMMISSION') await tx.commission.updateMany({
        where: { collaboratorId: referralLink.collaboratorId, status: 'PENDING', order: { storeId: referralLink.storeId } },
        data: { availableAt: new Date(Date.now() + 90 * 86400000) },
      });
      await tx.auditLog.create({ data: {
        userId: actorUser.id, action: `FRAUD_MITIGATION_${actionDto.action}`,
        details: { incidentId, linkId, storeId: referralLink.storeId, collaboratorId: referralLink.collaboratorId, note: actionDto.note!.trim(), actorName: actorUser.fullName || actorUser.email },
      } });
    });

    const updatedIncident = await this.getIncidentById(incidentId, {
      id: actorUser.id,
      role: actorUser.role,
      email: actorUser.email,
    });

    return {
      success: true,
      message,
      incident: updatedIncident,
    };
  }

  /**
   * Động cơ chấm điểm bất thường đa chiều (Heuristic AI Anomaly Evaluation Engine)
   */
  private evaluateFraudAnomalies(data: {
    linkCode: string;
    totalClicks: number;
    totalOrders: number;
    logs: Array<{
      ipAddress: string;
      userAgent: string | null;
      createdAt: Date;
      riskReason: string | null;
    }>;
    productPrice: number;
    pendingAmount: number;
    orders?: Array<{
      id: string;
      customerId?: string | null;
      customerName?: string | null;
      customerPhone?: string | null;
      customerEmail?: string | null;
    }>;
    collaborator?: {
      id: string;
      fullName: string;
      email: string;
      phoneNumber?: string | null;
    } | null;
  }): {
    riskScore: number;
    riskLevel: FraudRiskLevel;
    anomalies: FraudAnomalyType[];
    evidences: FraudEvidenceItem[];
    aiReasoning: string;
    suggestedAction: 'FREEZE_COMMISSION' | 'PAUSE_LINK' | 'MONITOR' | 'NONE';
  } {
    let score = 15; // Base normal variance
    const anomalies: FraudAnomalyType[] = [];
    const evidences: FraudEvidenceItem[] = [];

    const { totalClicks, totalOrders, logs, orders, collaborator } = data;
    const conversionRate =
      totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;

    // 1. Kiểm tra Zombie Traffic: Quá nhiều click nhưng không chuyển đổi (Clicks > 300, CR < 0.2%)
    if (totalClicks > 5000 && totalOrders === 0) {
      score += 70;
      anomalies.push('ZOMBIE_TRAFFIC');
      evidences.push({ metric: 'AI_FRAUD_FLAG: click cao không có đơn', value: `${totalClicks} clicks / 0 đơn`, severity: 'HIGH', description: 'Vượt ngưỡng 5.000 clicks trong kỳ nhưng không có đơn hợp lệ. Cần đối soát, không phải kết luận gian lận.' });
    } else if (totalClicks >= 300 && totalOrders === 0) {
      score += 45;
      anomalies.push('ZOMBIE_TRAFFIC');
      evidences.push({
        metric: 'Zombie Traffic (Lưu lượng ảo)',
        value: `${totalClicks} Clicks / 0 Đơn`,
        severity: 'HIGH',
        description:
          'Phát hiện lượng click lớn bất thường nhưng không phát sinh bất kỳ đơn hàng nào.',
      });
    } else if (totalClicks >= 150 && conversionRate < 0.3) {
      score += 25;
      anomalies.push('ZOMBIE_TRAFFIC');
      evidences.push({
        metric: 'Tỷ lệ chuyển đổi thấp bất thường',
        value: `CR = ${conversionRate.toFixed(2)}%`,
        severity: 'MEDIUM',
        description:
          'CR dưới ngưỡng quy tắc 0,3% với ít nhất 150 clicks; không phải so sánh trung bình toàn sàn.',
      });
    }

    // 2. Kiểm tra Click Burst / Bot IP Clustering (Phân cụm IP và tần suất dồn dập)
    if (logs.length >= 5) {
      const ipCounts = new Map<string, number>();
      logs.forEach((s) => {
        const ip = s.ipAddress;
        if (!ip) return;
        ipCounts.set(ip, (ipCounts.get(ip) || 0) + 1);
      });

      const maxIpCount = Math.max(0, ...Array.from(ipCounts.values()));
      if (maxIpCount >= 8) {
        score += 35;
        anomalies.push('IP_CLUSTER');
        anomalies.push('CLICK_BURST_BOT');
        evidences.push({
          metric: 'Tập trung địa chỉ IP',
          value: `${maxIpCount} clicks từ cùng 1 IP`,
          severity: 'HIGH',
          description:
            'Hàng loạt lượt truy cập xuất phát từ cùng một địa chỉ IP hoặc dải mạng bot proxy.',
        });
      }
    }

    // 3. Kiểm tra Tỷ lệ chuyển đổi siêu thực (Spike Anomaly)
    if (totalOrders >= 5 && conversionRate > 70) {
      score += 30;
      anomalies.push('CONVERSION_SPIKE');
      evidences.push({
        metric: 'Tỷ lệ chốt đơn siêu thực',
        value: `CR = ${conversionRate.toFixed(1)}%`,
        severity: 'HIGH',
        description:
          'Tỷ lệ tạo đơn cao bất thường so với hành vi mua sắm thương mại điện tử tự nhiên.',
      });
    }

    // 4. Kiểm tra các click có riskReason từ Redis rate limiter / ClickTrafficLog
    const flaggedClicks = logs.filter((s) => s.riskReason).length;
    if (flaggedClicks >= 3) {
      score += 25;
      anomalies.push('CLICK_BURST_BOT');
      evidences.push({
        metric: 'Rate Limit Triggers',
        value: `${flaggedClicks} lượt vi phạm bảo mật`,
        severity: 'HIGH',
        description:
          'Lượt click kích hoạt cơ chế chặn spam Redis Rate Limiter.',
      });
    }

    // 5. Kiểm tra Chuyên sâu: Tự mua qua link tiếp thị của chính mình (Self-Referral Fraud Detection)
    if (orders && orders.length > 0 && collaborator) {
      const selfOrders = orders.filter((o) => {
        const isMatchId = o.customerId && o.customerId === collaborator.id;
        const isMatchEmail =
          o.customerEmail &&
          collaborator.email &&
          o.customerEmail.toLowerCase().trim() ===
            collaborator.email.toLowerCase().trim();
        const isMatchPhone =
          collaborator.phoneNumber &&
          o.customerPhone &&
          o.customerPhone.trim() === collaborator.phoneNumber.trim();
        return isMatchId || isMatchEmail || isMatchPhone;
      });

      if (selfOrders.length > 0) {
        score += 65; // Đẩy thẳng vào mức FRAUD_CRITICAL
        anomalies.push('SELF_REFERRAL');
        evidences.push({
          metric: 'Tự Mua Hàng Trục Lợi (Self-Referral Exact Match)',
          value: `${selfOrders.length}/${orders.length} đơn hàng vi phạm`,
          severity: 'HIGH',
          description: `Phát hiện đối tác KOL (${collaborator.fullName}) tự đặt hàng qua link tiếp thị của chính mình bằng tài khoản/Email (${collaborator.email}) hoặc SĐT (${collaborator.phoneNumber || 'trùng khớp'}).`,
        });
      }
    } else if (data.pendingAmount > 5000000 && totalOrders <= 2) {
      score += 25;
      anomalies.push('SELF_REFERRAL');
      evidences.push({
        metric: 'Hoa hồng đột biến trên ít đơn',
        value: `${(data.pendingAmount / 1000).toLocaleString('vi-VN')}k ₫`,
        severity: 'MEDIUM',
        description:
          'Giá trị hoa hồng lớn tập trung vào số ít đơn hàng giá trị cao nghi vấn tự mua.',
      });
    }

    // Chuẩn hóa điểm nguy cơ 0 - 100
    const finalScore = Math.min(Math.max(score, 5), 98);

    let riskLevel: FraudRiskLevel = 'CLEAN';
    let suggestedAction:
      'FREEZE_COMMISSION' | 'PAUSE_LINK' | 'MONITOR' | 'NONE' = 'NONE';
    let aiReasoning = '';

    if (finalScore >= 85) {
      riskLevel = 'FRAUD_CRITICAL';
      suggestedAction = 'FREEZE_COMMISSION';
      aiReasoning = `CẢNH BÁO NGUY CƠ CAO (Điểm rủi ro: ${finalScore}/100): Phát hiện dấu hiệu gian lận nghiêm trọng với ${evidences.map((e) => e.metric).join(', ')}. Khuyến nghị đóng băng hoa hồng ví chờ và tạm ngưng link tiếp thị để đối soát.`;
    } else if (finalScore >= 70) {
      riskLevel = 'SUSPICIOUS';
      suggestedAction = 'PAUSE_LINK';
      aiReasoning = `NGHI VẤN BẤT THƯỜNG (Điểm rủi ro: ${finalScore}/100): Xuất hiện các mẫu lưu lượng traffic không tự nhiên (${evidences.map((e) => e.metric).join(', ')}). Cần kiểm tra nguồn traffic từ kênh mạng xã hội.`;
    } else if (finalScore >= 40) {
      riskLevel = 'LOW_RISK';
      suggestedAction = 'MONITOR';
      aiReasoning = `MỨC ĐỘ RỦI RO THẤP (Điểm rủi ro: ${finalScore}/100): Có một số biến động nhẹ trong tỷ lệ tương tác nhưng chưa đủ bằng chứng kết luận vi phạm. Tiếp tục theo dõi.`;
    } else {
      riskLevel = 'CLEAN';
      suggestedAction = 'NONE';
      aiReasoning = `CHƯA PHÁT HIỆN BẤT THƯỜNG (Điểm quy tắc: ${finalScore}/100): Chưa khớp các quy tắc đang kiểm tra trong kỳ. Đây không phải xác nhận toàn bộ traffic là tự nhiên.`;
      if (evidences.length === 0) {
        evidences.push({
          metric: 'Traffic Organic',
          value: 'Bình thường',
          severity: 'LOW',
          description:
            'Chưa khớp quy tắc bất thường trong dữ liệu được kiểm tra; IP/bot chỉ phân tích tối đa 100 click gần nhất.',
        });
      }
    }

    return {
      riskScore: finalScore,
      riskLevel,
      anomalies,
      evidences,
      aiReasoning,
      suggestedAction,
    };
  }
}
