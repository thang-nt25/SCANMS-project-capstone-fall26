import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, MoreHorizontal, Pencil, Percent, Sparkles, Trash2 } from 'lucide-react';

export function ProductRowActions({name,approved,onEdit,onSuggest,onDiscount,onView,onDelete}:{name:string;approved:boolean;onEdit:()=>void;onSuggest:()=>void;onDiscount:()=>void;onView:()=>void;onDelete:()=>void}) {
  const [position,setPosition]=useState<{top:number;left:number}|null>(null);
  const trigger=useRef<HTMLButtonElement>(null);const menu=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!position)return;
    const outside=(event:PointerEvent)=>{if(!menu.current?.contains(event.target as Node)&&!trigger.current?.contains(event.target as Node))setPosition(null);};
    const keyboard=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();setPosition(null);trigger.current?.focus();}};
    const close=()=>setPosition(null);
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',keyboard);window.addEventListener('resize',close);window.addEventListener('scroll',close,true);
    menu.current?.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',keyboard);window.removeEventListener('resize',close);window.removeEventListener('scroll',close,true);};
  },[position]);
  const run=(action:()=>void)=>{setPosition(null);action();};
  return <div className="product-row-actions"><button type="button" title="Chỉnh sửa sản phẩm" aria-label={`Chỉnh sửa ${name}`} onClick={onEdit}><Pencil size={15}/></button><button type="button" ref={trigger} aria-label={`Thao tác khác cho ${name}`} aria-expanded={!!position} title="Thao tác khác" onClick={()=>{if(position){setPosition(null);return;}const rect=trigger.current!.getBoundingClientRect();setPosition({top:Math.max(8,Math.min(rect.bottom+6,innerHeight-(approved?190:110))),left:Math.max(8,Math.min(rect.right-216,innerWidth-224))});}}><MoreHorizontal size={17}/></button>
    {position&&createPortal(<div ref={menu} className="product-row-menu" style={position} aria-label={`Thao tác cho ${name}`}>{approved&&<><button type="button" onClick={()=>run(onSuggest)}><Sparkles size={15}/>Gợi ý KOC</button><button type="button" onClick={()=>run(onDiscount)}><Percent size={15}/>Đề xuất giảm giá</button></>}<button type="button" onClick={()=>run(onView)}><ExternalLink size={15}/>Xem sản phẩm</button><button type="button" className="product-row-danger" onClick={()=>run(onDelete)}><Trash2 size={15}/>Tạm dừng / Xóa</button></div>,document.body)}
  </div>;
}
