-- Preserve the existing single-image column and backfill the new gallery.
ALTER TABLE product_reviews
  ADD COLUMN images TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN video_url TEXT;
UPDATE product_reviews SET images = ARRAY[review_image_url]
  WHERE review_image_url IS NOT NULL AND review_image_url <> '';
