# Public catalog media

These files are exact copies of the existing web assets in `frontend/public/assets/products/real/` and the Shop PNG assets in `frontend/public/assets/` and `frontend/public/assets/shops/`.

`src/services/bundled-catalog-images.ts` maps the public URL paths stored by the backend to the matching bundled image. The Android client can display these paths without a separate Vite server. Remote uploads continue to use their original URLs; missing media receives a neutral placeholder rather than a different product.

Keep public paths and file contents synchronized with the web assets. Product media provenance remains documented in `frontend/public/assets/products/real/README.md`. No user uploads or private identity documents belong in this folder.
