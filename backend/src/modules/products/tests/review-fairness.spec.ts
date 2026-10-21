import { CustomerService } from '../../customer/customer.service';
import { ProductsService } from '../products.service';
import { UserRole } from '@prisma/client';

describe('fair verified reviews and platform moderation', () => {
  const cache = () => ({ delPrefix: jest.fn().mockResolvedValue(undefined) });
  function fixture() {
    const review = { id: 'review', productId: 'product', rating: 1, isApproved: true, status: 'APPROVED',
      product: { store: { ownerId: 'shop' } } };
    const prisma: any = { productReview: { create: jest.fn().mockImplementation(({ data }) => ({ id: 'review', ...data })),
      findUnique: jest.fn().mockResolvedValue(review), update: jest.fn().mockResolvedValue(review) },
      auditLog: { create: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]) } };
    prisma.$transaction = jest.fn(fn => fn(prisma));
    const service = new ProductsService(prisma, {} as any, cache() as any);
    const customer = Object.assign(Object.create(CustomerService.prototype), { prisma, cacheService: cache() }) as CustomerService;
    jest.spyOn(customer, 'getOrderDetails').mockResolvedValue({ customerId: 'buyer', status: 'COMPLETED', customerName: 'Buyer',
      returnRequest: null, productReviews: [], orderItems: [{ productId: 'product' }] } as any);
    return { service, customer, prisma };
  }
  it.each([1, 2, 3, 4, 5])('publishes a legitimate %s-star review equally and retains every uploaded photo', async rating => {
    const { customer, prisma } = fixture();
    const images = ['https://example.com/1.jpg', 'https://example.com/2.jpg'];
    const result = await customer.createVerifiedReview('buyer', 'order', { productId: 'product', rating,
      comment: 'Chai bị rò, shop xử lý chậm, tôi không hài lòng.', images });
    expect(result.review).toMatchObject({ rating, images, isApproved: true, status: 'APPROVED', rejectionReason: null });
    expect(prisma.productReview.create.mock.calls[0][0].data.reviewImageUrl).toBe(images[0]);
  });
  it.each([1, 5])('publishes even flagged text immediately at %s stars; only later platform moderation can hide it', async rating => {
    const { customer } = fixture();
    const result = await customer.createVerifiedReview('buyer', 'order', { productId: 'product', rating, comment: 'fuck you, lời đe dọa' });
    expect(result.review).toMatchObject({ rating, status: 'APPROVED', isApproved: true, rejectionReason: null });
    expect(result.message).toBe('Đánh giá đã được đăng');
  });
  it.each(['APPROVED', 'HIDDEN', 'REJECTED'])('blocks even the owning Shop from setting review status to %s', async status => {
    const { service, prisma } = fixture();
    await expect(service.moderateReview('shop', UserRole.SHOP_MANAGER, 'review', { status: status as any, reason: 'Muốn ẩn đánh giá thấp' })).rejects.toMatchObject({ status: 403 });
    expect(prisma.productReview.update).not.toHaveBeenCalled();
  });
  it('reports without hiding or modifying stars, and records the evidence for the platform', async () => {
    const { service, prisma } = fixture();
    await service.reportReview('shop', 'review', { reason: 'SPAM', details: 'Có thông tin quảng cáo không liên quan', evidence: ['https://example.com/proof.jpg'] });
    expect(prisma.productReview.update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'shop', action: 'PRODUCT_REVIEW_REPORTED',
      details: expect.objectContaining({ reviewId: 'review', evidence: ['https://example.com/proof.jpg'] }) }) });
  });
  it('prevents another Shop from replying or reporting', async () => {
    const { service, prisma } = fixture();
    await expect(service.replyToReview('other', 'review', { comment: 'Cảm ơn phản hồi' })).rejects.toMatchObject({ status: 403 });
    await expect(service.reportReview('other', 'review', { reason: 'OTHER', details: 'Báo cáo nội dung' })).rejects.toMatchObject({ status: 403 });
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
  it('only platform staff may resolve; requires a reason and never changes the rating', async () => {
    const { service, prisma } = fixture();
    await expect(service.resolveReviewReport('shop', UserRole.SHOP_MANAGER, 'review', { decision: 'HIDE', reason: 'Không thích đánh giá này' })).rejects.toMatchObject({ status: 403 });
    await expect(service.resolveReviewReport('admin', UserRole.SYSTEM_ADMIN, 'review', { decision: 'HIDE', reason: '' })).rejects.toMatchObject({ status: 400 });
    await service.resolveReviewReport('admin', UserRole.SYSTEM_ADMIN, 'review', { decision: 'KEEP', reason: 'Phản hồi về sản phẩm là hợp lệ' });
    expect(prisma.productReview.update.mock.calls[0][0].data).toMatchObject({ isApproved: true, status: 'APPROVED' });
    expect(prisma.productReview.update.mock.calls[0][0].data).not.toHaveProperty('rating');
    expect(prisma.auditLog.create.mock.calls[0][0].data.action).toBe('PRODUCT_REVIEW_REPORT_RESOLVED');
  });
  it('allows respectful public replies and blocks abuse or customer contact details', async () => {
    const { service, prisma } = fixture();
    await service.replyToReview('shop', 'review', { comment: 'Shop xin ghi nhận và hỗ trợ đổi sản phẩm.' });
    expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: 'PRODUCT_REVIEW_REPLY' });
    await expect(service.replyToReview('shop', 'review', { comment: 'Số điện thoại khách là 0901234567' })).rejects.toMatchObject({ status: 400 });
  });
  it('keeps an old reported review reachable, scopes the Shop list and shows platform decisions', async () => {
    const { service, prisma } = fixture();
    prisma.$queryRaw = jest.fn().mockResolvedValue([{ reviewId: 'old-review' }]);
    prisma.productReview.findMany = jest.fn().mockResolvedValueOnce([{ id: 'recent', isApproved: true }]).mockResolvedValueOnce([{ id: 'old-review', isApproved: true }]);
    prisma.auditLog.findMany.mockResolvedValue([{ id: 'report', action: 'PRODUCT_REVIEW_REPORTED', createdAt: new Date(), details: { reviewId: 'old-review', reason: 'SPAM', details: 'Báo cáo có bằng chứng' } }]);
    const rows = await service.listReviewsForModeration('shop', UserRole.SHOP_MANAGER);
    expect(rows[0]).toMatchObject({ id: 'old-review', reports: [expect.objectContaining({ resolved: false })] });
    expect(prisma.productReview.findMany.mock.calls[1][0].where).toMatchObject({ product: { store: { ownerId: 'shop' } }, id: { in: ['old-review'] } });
    await expect(service.listReviewsForModeration('buyer', UserRole.CUSTOMER)).rejects.toMatchObject({ status: 403 });
  });
  it('does not accept repeated reports while the first report is unresolved', async () => {
    const { service, prisma } = fixture();
    prisma.auditLog.findMany.mockResolvedValue([{ action: 'PRODUCT_REVIEW_REPORTED' }]);
    await expect(service.reportReview('shop', 'review', { reason: 'OTHER', details: 'Báo cáo lần hai' })).rejects.toMatchObject({ status: 400 });
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
});
