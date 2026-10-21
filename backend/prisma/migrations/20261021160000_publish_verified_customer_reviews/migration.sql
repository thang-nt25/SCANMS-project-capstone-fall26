-- Publish legacy, unmoderated reviews from completed customer purchases.
-- Preserve platform decisions (including PENDING reviews explicitly reviewed by staff).
-- One atomic statement: publication and its audit record succeed together.
WITH candidates AS (
  SELECT r.id, r.status, r.is_approved, r.rejection_reason
  FROM product_reviews r
  WHERE r.status = 'PENDING'
    AND r.is_approved = false
    AND r.reviewed_by IS NULL AND r.reviewed_at IS NULL
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = r.order_id AND o.status = 'COMPLETED' AND o.customer_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM order_items i WHERE i.order_id = o.id AND i.product_id = r.product_id)
        AND NOT EXISTS (SELECT 1 FROM return_requests t WHERE t.order_id = o.id)
    )
  FOR UPDATE OF r
), published AS (
  UPDATE product_reviews r
  SET status = 'APPROVED', is_approved = true, rejection_reason = NULL
  FROM candidates c WHERE r.id = c.id
  RETURNING r.id, r.product_id, c.status AS previous_status,
    c.is_approved AS previous_is_approved, c.rejection_reason AS previous_reason
), logged AS (
  INSERT INTO audit_logs (action, details)
  SELECT 'PRODUCT_REVIEW_AUTO_PUBLISHED', jsonb_build_object(
    'reviewId', id, 'productId', product_id,
    'previousStatus', previous_status, 'previousIsApproved', previous_is_approved,
    'previousReason', previous_reason, 'policy', 'publish_then_platform_report_moderation'
  ) FROM published
  RETURNING id
)
SELECT (SELECT count(*) FROM published) AS published_count,
  (SELECT count(*) FROM logged) AS audit_count;
