/** Tailwind presentation for the Leaflet features used by AddressLocationPicker.
 * Leaflet still owns pixel coordinates/transforms at runtime. Keep those dynamic
 * styles separate from the static appearance; never override marker transforms.
 * Scope every generated Leaflet selector to this map rather than the global app.
 */
export const addressMapClassName = [
  'relative isolate z-0 h-full min-h-56 w-full overflow-hidden bg-[#F3EFE6] font-sans text-xs leading-normal outline-offset-1 cursor-grab active:cursor-grabbing',
  '[&.leaflet-touch-drag]:touch-none [&.leaflet-touch-zoom]:touch-none',

  // Layers must share a pixel origin or tiles and selected coordinates drift.
  '[&_:is(.leaflet-pane,.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-tile-container,.leaflet-image-layer,.leaflet-layer,.leaflet-zoom-box)]:absolute',
  '[&_:is(.leaflet-pane,.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-tile-container,.leaflet-image-layer,.leaflet-layer,.leaflet-zoom-box)]:top-0',
  '[&_:is(.leaflet-pane,.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-tile-container,.leaflet-image-layer,.leaflet-layer,.leaflet-zoom-box)]:left-0',
  '[&_.leaflet-pane]:z-[400] [&_.leaflet-pane.leaflet-tile-pane]:z-[200]',
  '[&_.leaflet-pane.leaflet-shadow-pane]:z-[500] [&_.leaflet-pane.leaflet-marker-pane]:z-[600]',
  '[&_:is(.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow)]:select-none',
  '[&_:is(.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow)]:[-webkit-user-drag:none]',
  '[&_:is(.leaflet-marker-icon,.leaflet-marker-shadow)]:block',
  '[&_.leaflet-marker-shadow]:pointer-events-none [&_.leaflet-tile-container]:pointer-events-none',
  '[&_.leaflet-marker-draggable]:cursor-grab [&_.leaflet-marker-draggable:active]:cursor-grabbing',
  // The shared unlayered img reset must not shrink Leaflet's absolute tile grid.
  '[&_img.leaflet-tile]:max-w-none! [&_img.leaflet-tile]:max-h-none! [&_img.leaflet-tile]:p-0',
  '[&_.leaflet-tile:not(.leaflet-tile-loaded)]:invisible',

  // Retain Leaflet zoom/pan transitions without importing a global stylesheet.
  '[&_.leaflet-zoom-animated]:origin-top-left',
  '[&.leaflet-zoom-anim_.leaflet-zoom-animated]:transition-transform',
  '[&.leaflet-zoom-anim_.leaflet-zoom-animated]:duration-250',
  '[&.leaflet-zoom-anim_.leaflet-zoom-animated]:ease-[cubic-bezier(0,0,0.25,1)]',
  '[&.leaflet-zoom-anim_.leaflet-tile]:transition-none',
  '[&.leaflet-pan-anim_.leaflet-tile]:transition-none',
  '[&.leaflet-zoom-anim_.leaflet-zoom-hide]:invisible',
  '[&_.leaflet-zoom-box]:z-[800] [&_.leaflet-zoom-box]:border-2',
  '[&_.leaflet-zoom-box]:border-dotted [&_.leaflet-zoom-box]:border-[#C59B58]',
  '[&_.leaflet-zoom-box]:bg-white/50',

  // Controls remain above tiles, while their empty corners let map clicks through.
  '[&_:is(.leaflet-top,.leaflet-bottom)]:absolute',
  '[&_:is(.leaflet-top,.leaflet-bottom)]:z-[1000]',
  '[&_:is(.leaflet-top,.leaflet-bottom)]:pointer-events-none',
  '[&_.leaflet-top]:top-0 [&_.leaflet-bottom]:bottom-0',
  '[&_.leaflet-left]:left-0 [&_.leaflet-right]:right-0',
  '[&_.leaflet-control]:relative [&_.leaflet-control]:z-[800]',
  '[&_.leaflet-control]:pointer-events-auto [&_.leaflet-control]:cursor-auto',
  '[&_.leaflet-control]:float-left [&_.leaflet-control]:clear-both',
  '[&_.leaflet-right_.leaflet-control]:float-right',
  '[&_.leaflet-top_.leaflet-control]:mt-2.5 [&_.leaflet-bottom_.leaflet-control]:mb-2.5',
  '[&_.leaflet-left_.leaflet-control]:ml-2.5 [&_.leaflet-right_.leaflet-control]:mr-2.5',
  '[&_.leaflet-bar]:overflow-hidden [&_.leaflet-bar]:rounded-lg',
  '[&_.leaflet-bar]:border [&_.leaflet-bar]:border-[#EAE4D7] [&_.leaflet-bar]:shadow-sm',
  '[&_.leaflet-bar_a]:block [&_.leaflet-bar_a]:size-[30px]',
  '[&_.leaflet-bar_a]:bg-white [&_.leaflet-bar_a]:text-center',
  '[&_.leaflet-bar_a]:font-mono [&_.leaflet-bar_a]:text-[20px] [&_.leaflet-bar_a]:font-bold',
  '[&_.leaflet-bar_a]:leading-[30px] [&_.leaflet-bar_a]:text-[#1A1612] [&_.leaflet-bar_a]:no-underline',
  '[&_.leaflet-bar_a+a]:border-t [&_.leaflet-bar_a+a]:border-[#EAE4D7]',
  '[&_.leaflet-bar_a:hover]:bg-[#FBF5EB]',
  '[&_.leaflet-bar_a:focus-visible]:outline-2 [&_.leaflet-bar_a:focus-visible]:outline-[#C59B58]',
  '[&_.leaflet-bar_a.leaflet-disabled]:cursor-not-allowed',
  '[&_.leaflet-bar_a.leaflet-disabled]:bg-[#FAF8F5] [&_.leaflet-bar_a.leaflet-disabled]:text-[#7D715E]',

  // Preserve visible provider credits and their links at mobile widths.
  '[&_.leaflet-control-attribution]:m-0! [&_.leaflet-control-attribution]:bg-white/90',
  '[&_.leaflet-control-attribution]:px-1.5 [&_.leaflet-control-attribution]:py-0.5',
  '[&_.leaflet-control-attribution]:text-[10px] [&_.leaflet-control-attribution]:leading-4',
  '[&_.leaflet-control-attribution]:text-[#7D715E]',
  '[&_.leaflet-control-attribution_a]:text-[#79592C] [&_.leaflet-control-attribution_a:hover]:underline',
  '[&_.leaflet-attribution-flag]:inline-block [&_.leaflet-attribution-flag]:h-2 [&_.leaflet-attribution-flag]:w-3',
].join(' ');

export const addressMarkerHtml = '<span aria-hidden="true" class="block size-[34px] -rotate-45 rounded-[50%_50%_50%_0] border-[3px] border-white bg-[#C59B58] shadow-[0_4px_14px_rgba(35,29,21,0.32)]"><span class="m-[9px] block size-[9px] rounded-full bg-white"></span></span>';
