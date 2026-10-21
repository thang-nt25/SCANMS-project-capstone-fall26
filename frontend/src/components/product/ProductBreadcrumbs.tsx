import { ChevronRight, House } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ProductBreadcrumbs({ title, category }: { title: string; category?: string | null }) {
  return (
    <nav className="product-breadcrumbs min-w-0 mt-0 mx-0 mb-3 rounded-[10px] border border-[#EAE4D7] bg-white px-3.5 py-2 text-xs leading-[1.5] [&_li]:flex [&_li]:min-w-0 [&_li]:items-center [&_li]:gap-3 [&_a]:text-[#7D715E]! [&_a]:transition-colors [&_a]:duration-150 [&_a]:ease-[ease] [&_a:hover]:text-[#B88E4F]! [&_a:hover]:underline [&_a:hover]:underline-offset-4 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-[#B88E4F] [&_a:focus-visible]:rounded-[3px] motion-reduce:[&_a]:transition-none [@media(max-width:639px)]:mb-2.5 [@media(max-width:639px)]:px-3 [@media(max-width:639px)]:py-[9px] [@media(max-width:639px)]:text-[11px] [@media(max-width:639px)]:[&_li]:gap-2.5" aria-label="Đường dẫn sản phẩm">
      <ol className="product-breadcrumbs__list m-0 flex min-w-0 list-none items-center gap-3 p-0 [@media(max-width:639px)]:flex-wrap [@media(max-width:639px)]:gap-x-2.5 [@media(max-width:639px)]:gap-y-2">
        <li className="product-breadcrumbs__ancestor flex-none">
          <Link to="/marketplace" className="product-breadcrumbs__home inline-flex items-center gap-2 whitespace-nowrap font-semibold [&[href]]:text-[#1A1612]! [&[href]:hover]:text-[#B88E4F]!">
            <span className="product-breadcrumbs__home-icon grid size-7 place-items-center rounded-[7px] bg-[#FBF5EB] text-[#B88E4F]"><House size={14} aria-hidden="true" /></span>
            <span>Sàn SCANMS</span>
          </Link>
        </li>
        {category && <li className="product-breadcrumbs__ancestor flex-none product-breadcrumbs__category max-w-[min(30vw,240px)] [&_a]:truncate [@media(max-width:639px)]:max-w-[calc(100%_-_125px)]">
          <ChevronRight size={13} aria-hidden="true" className="product-breadcrumbs__separator shrink-0 text-[#B88E4F] opacity-[.65]" />
          <Link to={`/search?category=${encodeURIComponent(category)}`} title={category}>{category}</Link>
        </li>}
        <li className="product-breadcrumbs__current flex-1 [&_span]:truncate [&_span]:font-medium [&_span]:text-[#1A1612] [@media(max-width:639px)]:basis-full [@media(max-width:639px)]:border-t [@media(max-width:639px)]:border-[#EAE4D7] [@media(max-width:639px)]:pt-2 [@media(max-width:639px)]:[&>svg]:hidden [@media(max-width:639px)]:[&_span]:whitespace-normal [@media(max-width:639px)]:[&_span]:[overflow-wrap:anywhere]">
          <ChevronRight size={13} aria-hidden="true" className="product-breadcrumbs__separator shrink-0 text-[#B88E4F] opacity-[.65]" />
          <span aria-current="page" title={title}>{title}</span>
        </li>
      </ol>
    </nav>
  );
}
