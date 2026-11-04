const fs = require('fs');
const path = require('path');

const publicHeaderCss = `@reference "../../index.css";

/* Base Search Box adjustments */
.public-commerce-header .product-search-form {
  @apply [min-height:44px];
  @apply [border-radius:10px];
  @apply [border-color:#DFD6C5];
  @apply [background:#FFFFFF];
  @apply shadow-xs;
}
.public-commerce-header .product-search-form:focus-within {
  @apply [border-color:#B88E4F];
  @apply [box-shadow:0_0_0_3px_rgba(184,142,79,0.12)];
}
.public-commerce-header .product-search-submit {
  @apply [border-radius:7px];
}

/* ============================================================
   WORKSPACE HEADER (Single Tier for Admin/Backoffice)
   ============================================================ */
html:has(.public-commerce-header--workspace) {
  @apply [background:linear-gradient(to_bottom,_#fff_0_var(--workspace-header-height,_80px),_#faf8f5_var(--workspace-header-height,_80px))];
  @apply [background-attachment:fixed];
}
.public-commerce-header--workspace {
  @apply [width:100%];
  @apply [border-radius:0];
}
.public-commerce-header--workspace .public-commerce-header__inner {
  @apply grid;
  @apply [grid-template-columns:250px_minmax(0,_1fr)_auto];
  @apply items-center;
  @apply [column-gap:20px];
  @apply [height:80px];
  @apply [max-width:1520px];
}
.public-commerce-header--workspace .public-commerce-header__brand {
  @apply [grid-column:1];
  @apply [grid-row:1];
  @apply flex;
  @apply items-center;
  @apply [min-height:44px];
}
.public-commerce-header--workspace .scanms-header-logo {
  @apply [min-width:0];
  @apply [gap:10px];
  @apply items-center;
}
.public-commerce-header--workspace .public-commerce-header__actions {
  @apply relative;
  @apply [grid-column:3];
  @apply [grid-row:1];
  @apply [height:44px];
  @apply flex;
  @apply items-center;
  @apply [gap:12px];
}
.public-commerce-header--workspace .header-account-trigger {
  @apply [height:44px];
  @apply items-center;
  @apply [padding-block:0];
}

/* ============================================================
   TWO-TIER PUBLIC COMMERCE & MARKETPLACE HEADER
   ============================================================ */

/* Tier 1: Top Utility Bar */
.public-commerce-header__top-bar {
  @apply [font-size:12px];
  @apply [line-height:16px];
}
.public-commerce-header__top-bar a,
.public-commerce-header__top-bar button {
  @apply transition-colors;
}
.public-commerce-header__top-bar .header-account-trigger {
  @apply [height:30px];
  @apply [max-width:220px];
  @apply [padding:2px_6px];
  @apply [border-radius:6px];
  @apply [background:transparent];
  box-shadow: none;
}
.public-commerce-header__top-bar .header-account-trigger:hover {
  @apply [background:rgba(0,0,0,0.04)];
}
.public-commerce-header__top-bar button[aria-controls="scanms-notification-panel"] {
  @apply [width:30px];
  @apply [height:30px];
  @apply [border-radius:6px];
  @apply [background:transparent];
  @apply [border:0];
}
.public-commerce-header__top-bar button[aria-controls="scanms-notification-panel"]:hover {
  @apply [background:rgba(0,0,0,0.04)];
}

/* Tier 2: Main Commerce Bar */
.public-commerce-header__main-bar {
  @apply relative;
  @apply [z-index:30];
}

/* Luxury Cart Island Button */
.public-commerce-header__cart {
  @apply inline-flex;
  @apply items-center;
  @apply justify-center;
  @apply [gap:8px];
  @apply [height:42px];
  @apply [min-width:42px];
  @apply [padding:0_14px];
  @apply [border-radius:12px];
  @apply [background:#F3EFE6];
  @apply [border:1px_solid_#EAE4D7];
  @apply [color:#1A1612];
  @apply cursor-pointer;
  @apply transition-all;
  @apply [box-shadow:0_1px_3px_rgba(35,29,21,0.04)];
}
.public-commerce-header__cart:hover {
  @apply [background:#EEDFC6];
  @apply [border-color:#C59B58];
  @apply [box-shadow:0_2px_8px_rgba(197,155,88,0.18)];
}
.public-commerce-header__cart:focus-visible {
  @apply [outline:2px_solid_#B88E4F];
  @apply [outline-offset:2px];
}
.public-commerce-header__cart svg {
  @apply [color:#1A1612];
  @apply [stroke-width:1.8];
}

/* Navigation Row (Shortcuts below search) */
.public-commerce-header__navigation-row {
  @apply flex;
  @apply items-center;
  @apply justify-center;
}

/* Common Focus-Visible outline */
.public-commerce-header :is(a, button):focus-visible {
  @apply [outline:2px_solid_#B88E4F];
  @apply [outline-offset:2px];
}
`;

fs.writeFileSync(path.join(__dirname, '../frontend/src/components/layout/PublicHeader.css'), publicHeaderCss, 'utf8');
console.log('Successfully written PublicHeader.css');
