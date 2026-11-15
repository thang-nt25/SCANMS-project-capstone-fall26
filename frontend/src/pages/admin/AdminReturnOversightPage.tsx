import { useEffect, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, Info, Search, X } from 'lucide-react';
import api from '@/services/api';
import { authService } from '@/services/auth.service';
import { returnService, type ReturnDetail, type ReturnDisputeRecord } from '@/services/return.service';
import { returnStatusLabel } from '@/utils/return-status.utils';
import { caseProducts, CaseProductImage, claimLabels, returnDate, returnMoney } from '@/components/returns/ReturnCaseProducts';
import './return-oversight.css';

const groups = [
  { id:'rejected', label:'Shop từ chối', key:'rejected-return-reviews', help:'Xem hồ sơ và bằng chứng trước khi mở phân xử. Mở phân xử chưa phải kết luận Shop hay GHN có lỗi.' },
  { id:'active', label:'Đang xử lý', key:'active-return-oversight', help:'Kiểm tra bằng chứng, xác định trách nhiệm và theo dõi đổi hàng hoặc hoàn tiền.' },
  { id:'ghn', label:'Bồi hoàn GHN', key:'ghn-claims', help:'Theo dõi phản hồi GHN và chứng từ thanh toán cho Shop. Kết quả xử lý cho khách được theo dõi riêng.' },
  { id:'stalled', label:'Quá 48 giờ', key:'stalled-return-inspections', help:'Hồ sơ đã nhận hàng nhưng Shop chưa hoàn tất kiểm tra trong 48 giờ. Kiểm tra diễn biến và bằng chứng trước khi can thiệp.' },
  { id:'disputes', label:'Cần phân xử', key:'return-disputes', help:'Đọc bằng chứng của khách và Shop, chọn bên chịu trách nhiệm rồi ghi rõ căn cứ. Không hoàn tiền hoặc kết luận lỗi khi chưa đủ chứng cứ.' },
  { id:'history', label:'Đã kết thúc', key:'return-history', help:'Hồ sơ hoàn tất được giữ lại để đối chiếu kết quả đổi hàng, hoàn tiền và phân xử.' },
] as const;
type Group = typeof groups[number]['id'];
type CaseRow = { request: ReturnDetail; dispute?: ReturnDisputeRecord };
type QueueData = { items: CaseRow[]; total: number; page: number; pageSize: number };
const initialPages: Record<Group,number> = { rejected:1,active:1,ghn:1,stalled:1,disputes:1,history:1 };
function waitingSince(value?: string | null) {
  if (!value) return '';
  const hours = Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/3600000));
  return hours >= 24 ? `${Math.floor(hours/24)} ngày` : `${hours} giờ`;
}

export default function AdminReturnOversightPage() {
  const actor=authService.getCurrentUser();
  const location=useLocation();
  const [params,setParams]=useSearchParams();
  const [group,setGroup]=useState<Group>(()=>groups.some(item=>item.id===params.get('group')) ? params.get('group') as Group : 'disputes');
  const [search,setSearch]=useState(()=>params.get('query')?.slice(0,80)||'');
  const [query,setQuery]=useState(search);
  const [storeId,setStoreId]=useState(()=>params.get('store')||'');
  const [pages,setPages]=useState(()=>({...initialPages,[group]:Math.max(1,Math.min(10000,Number(params.get('page'))||1))}));
  useEffect(()=>{const timer=window.setTimeout(()=>{if(search.trim()!==query){setQuery(search.trim());setPages(initialPages);}},300);return()=>window.clearTimeout(timer);},[search,query]);
  useEffect(()=>{
    if(params.get('tab') && params.get('tab')!=='returns')return;
    const next=new URLSearchParams(params);next.set('tab','returns');next.set('group',group);next.set('page',String(pages[group]));if(query)next.set('query',query);else next.delete('query');if(storeId)next.set('store',storeId);else next.delete('store');
    if(next.toString()!==params.toString())setParams(next,{replace:true});
  },[group,pages,query,storeId,params,setParams]);
  const stores=useQuery({queryKey:['return-oversight-stores',actor?.id],queryFn:async()=>{const response=await api.get('/stores/all-admin');const body=response.data??response;return (body.data??body) as {id:string;name:string}[];},staleTime:60000});
  const queues=useQueries({queries:groups.map(item=>({
    queryKey:[item.key,actor?.id,pages[item.id],query,storeId],
    queryFn:async():Promise<QueueData>=>{
      const result=item.id==='history'
        ? await returnService.getAdminHistory(pages.history,query,storeId||undefined)
        : await returnService.getOversightQueue<ReturnDetail|ReturnDisputeRecord>(item.id,pages[item.id],{query,storeId:storeId||undefined});
      return {...result,items:result.items.map(row=>'returnRequest' in row ? {request:row.returnRequest,dispute:row} : {request:row})};
    },
    refetchInterval:item.id==='history' ? false as const : 30000,
    staleTime:10000,
  }))});
  const index=groups.findIndex(item=>item.id===group), selectedGroup=groups[index], active=queues[index];
  const total=active.data?.total??0,page=pages[group],pageSize=active.data?.pageSize??20;
  function clearFilters(){setSearch('');setQuery('');setStoreId('');setPages(initialPages);}
  return <div id="return-oversight-page">
    <section className="return-search-toolbar" aria-label="Tìm và lọc hồ sơ đổi trả">
      <label className="return-search-field"><Search size={17}/><span className="sr-only">Tìm hồ sơ đổi trả</span><input id="return-case-search" maxLength={80} value={search} onChange={event=>setSearch(event.target.value)} placeholder="Mã đơn, khách, cửa hàng, vận đơn…"/>{search&&<button type="button" aria-label="Xóa tìm kiếm" onClick={()=>setSearch('')}><X size={15}/></button>}</label>
      <label className="return-store-filter"><span className="sr-only">Cửa hàng</span><select aria-label="Lọc cửa hàng đổi trả" value={storeId} disabled={stores.isPending} onChange={event=>{setStoreId(event.target.value);setPages(initialPages);}}><option value="">{stores.isPending?'Đang tải cửa hàng…':'Tất cả cửa hàng'}</option>{stores.data?.map(store=><option key={store.id} value={store.id}>{store.name}</option>)}</select></label>
      {stores.isError && <p className="return-filter-error" role="alert">Không tải được bộ lọc cửa hàng. <button type="button" onClick={()=>void stores.refetch()}>Thử lại</button></p>}
    </section>
    <nav className="return-group-tabs" aria-label="Nhóm hồ sơ đổi trả">{groups.map((item,i)=><button type="button" key={item.id} aria-pressed={group===item.id} onClick={()=>setGroup(item.id)}><span>{item.label}</span><strong>{queues[i].isPending?'…':queues[i].isError?'—':queues[i].data?.total??0}</strong></button>)}</nav>
    <section className="return-unified-list" aria-label="Danh sách hồ sơ đổi trả">
      <header className="return-list-header"><div><h2>{selectedGroup.label}</h2><span>{active.isPending?'Đang tải hồ sơ…':active.isError?'Chưa tải được dữ liệu':`${total} hồ sơ`}</span></div><details className="return-process-help"><summary><Info size={15}/>Quy trình</summary><p>{selectedGroup.help}</p><p>Một hồ sơ có thể thuộc nhiều nhóm; số lượng giữa các nhóm không cộng dồn.</p></details></header>
      {(query||storeId)&&<div className="return-filter-summary"><span>Đang lọc {query&&`“${query}”`}{storeId&&` · ${stores.data?.find(store=>store.id===storeId)?.name||'Cửa hàng đã chọn'}`}</span><button type="button" onClick={clearFilters}>Xóa bộ lọc</button></div>}
      {active.isPending ? <div className="return-empty" role="status">Đang tải hồ sơ…</div> : active.isError ? <div className="return-empty" role="alert"><p>Không tải được hồ sơ trong nhóm này.</p><button type="button" onClick={()=>void active.refetch()}>Thử lại</button></div> : !active.data?.items.length ? <div className="return-empty"><span>Chưa có hồ sơ {query||storeId?'phù hợp bộ lọc':'trong nhóm này'}.</span>{(query||storeId)&&<button type="button" onClick={clearFilters}>Xóa bộ lọc</button>}</div> : <>
        <div className="return-list-table-wrapper"><table className="return-list-table"><colgroup><col style={{width:'32%'}}/><col style={{width:'19%'}}/><col style={{width:'18%'}}/><col style={{width:'12%'}}/><col style={{width:'10%'}}/><col style={{width:'9%'}}/></colgroup><thead><tr><th>Đơn & sản phẩm</th><th>Khách / Cửa hàng</th><th>Trạng thái</th><th>Ngày gửi</th><th>Tiền hoàn</th><th>Thao tác</th></tr></thead><tbody>{active.data.items.map(({request,dispute})=>{
          const products=caseProducts(request),first=products[0];
          return <tr key={request.id} data-return-case={request.id}>
            <td data-label="Đơn & sản phẩm"><div className="return-product-cell"><CaseProductImage product={first}/><div><strong>{request.order.externalOrderSn}</strong><p title={first?.title}>{first?.title||'Chưa có sản phẩm liên kết'}</p><span>{products.length>1?`+${products.length-1} sản phẩm`:first?.variantName||''}{!request.items?.length&&products.length>0?' · Sản phẩm đơn gốc':''}</span></div></div></td>
            <td data-label="Khách / Cửa hàng"><strong>{request.order.customerName||'Chưa có tên khách'}</strong><p>{request.order.storeName}</p></td>
            <td data-label="Trạng thái"><span className={`return-status-badge ${group==='stalled'?'is-overdue':''}`}>{returnStatusLabel(request.status)}</span>{group==='ghn'&&<small className="return-ghn-status">GHN: {claimLabels[request.ghnClaim?.status||'']||'Chờ đối soát'}</small>}</td>
            <td data-label="Ngày gửi"><time>{returnDate(request.submittedAt)}</time>{group!=='history'&&<small>{group==='stalled'?'Đã nhận':'Đã gửi'} {waitingSince(group==='stalled'?request.receivedAt:request.submittedAt)}</small>}</td>
            <td data-label="Tiền hoàn"><strong className="return-money">{request.refund?returnMoney(request.refund.amount):'Chưa xác định'}</strong></td>
            <td data-label="Thao tác"><Link className="return-row-action" to={`/admin/returns/${request.id}${dispute?'?panel=handling':''}`} state={{returnTo:location.pathname+location.search}}>{dispute?'Phân xử':'Xem hồ sơ'}<ArrowRight size={13}/></Link></td>
          </tr>;
        })}</tbody></table></div>
        <footer className="return-list-pagination"><span>{active.data.items.length} / {total} hồ sơ · Trang {page}/{Math.max(1,Math.ceil(total/pageSize))}</span><div><button type="button" disabled={page<=1||active.isFetching} onClick={()=>setPages(current=>({...current,[group]:page-1}))}>Trước</button><button type="button" disabled={page*pageSize>=total||active.isFetching} onClick={()=>setPages(current=>({...current,[group]:page+1}))}>Sau</button></div></footer>
      </>}
    </section>
  </div>;
}
