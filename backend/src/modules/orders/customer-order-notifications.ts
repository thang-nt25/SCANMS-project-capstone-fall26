import { Prisma } from '@prisma/client';

export type CustomerOrderNotificationType =
  | 'ORDER_CREATED'
  | 'ORDER_PAYMENT_CONFIRMED'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'ORDER_COMPLETED'
  | 'ORDER_CANCELLED';

type CustomerOrderNotificationDetails = {
  storeName?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  carrierName?: string;
  trackingNumber?: string;
  reason?: string;
};

const notificationContent: Record<
  CustomerOrderNotificationType,
  (orderCode: string, details: CustomerOrderNotificationDetails) => {
    title: string;
    message: string;
  }
> = {
  ORDER_CREATED: (orderCode, details) => ({
    title: details.paymentMethod === 'PAYOS' && details.paymentStatus !== 'PAID'
      ? 'Đơn hàng chờ thanh toán'
      : 'Đơn hàng đã được tạo',
    message: details.paymentMethod === 'PAYOS' && details.paymentStatus !== 'PAID'
      ? `Đơn ${orderCode} tại ${details.storeName || 'gian hàng'} đã được tạo và chưa thanh toán. Vui lòng quét mã QR PayOS để hoàn tất.`
      : `Đơn ${orderCode} đã được gửi đến ${details.storeName || 'gian hàng'} và đang chờ xác nhận.`,
  }),
  ORDER_PAYMENT_CONFIRMED: (orderCode) => ({
    title: 'Thanh toán đơn hàng thành công',
    message: `Thanh toán cho đơn ${orderCode} đã được ghi nhận.`,
  }),
  ORDER_SHIPPED: (orderCode, details) => ({
    title: 'Shop đã xác nhận và bàn giao đơn',
    message: `Đơn ${orderCode} đang được ${details.carrierName || 'đơn vị vận chuyển'} giao đến bạn${details.trackingNumber ? ` (mã vận đơn: ${details.trackingNumber})` : ''}.`,
  }),
  ORDER_DELIVERED: (orderCode) => ({
    title: 'Đơn hàng đã giao thành công',
    message: `Đơn ${orderCode} đã được giao. Vui lòng kiểm tra hàng và xác nhận đã nhận trong mục Đơn mua.`,
  }),
  ORDER_COMPLETED: (orderCode) => ({
    title: 'Đơn hàng đã hoàn tất',
    message: `Đơn ${orderCode} đã được xác nhận nhận hàng và hoàn tất.`,
  }),
  ORDER_CANCELLED: (orderCode, details) => ({
    title: 'Đơn hàng đã hủy',
    message: `Đơn ${orderCode} đã bị hủy${details.reason ? `: ${details.reason}` : '.'}`,
  }),
};

export async function notifyCustomerOrderEvent(
  tx: Prisma.TransactionClient,
  order: { id: string; externalOrderSn: string; customerId: string | null },
  type: CustomerOrderNotificationType,
  details: CustomerOrderNotificationDetails = {},
): Promise<void> {
  if (!order.customerId) return;

  const { title, message } = notificationContent[type](order.externalOrderSn, details);
  await tx.notification.create({
    data: {
      userId: order.customerId,
      title,
      message,
      type,
      data: {
        orderId: order.id,
        externalOrderSn: order.externalOrderSn,
        actionUrl: '/customer/orders',
        ...details,
      },
    },
  });
}
