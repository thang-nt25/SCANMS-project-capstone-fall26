import React, { useState, useEffect, useMemo, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Check, Landmark, Settings, ShieldCheck, RefreshCw, ChevronDown } from 'lucide-react';
import { type VietQrBank, findBankByQuery } from '@/config/banks.config';
import { VietQrBankService } from '@/services/vietqr-bank.service';
import './BankSelectorModal.css';

export interface BankSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBank: (bank: VietQrBank) => void;
  selectedBankBin?: string;
  selectedBankName?: string;
}

type TabType = 'ALL' | 'POPULAR' | 'BIG4';
const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();

export const BankSelectorModal: React.FC<BankSelectorModalProps> = ({
  isOpen, onClose, onSelectBank, selectedBankBin, selectedBankName,
}) => {
  const [banks, setBanks] = useState<VietQrBank[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualBin, setManualBin] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const manualNameRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const manualFormId = useId();

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoading(true);
    VietQrBankService.getBanks()
      .then((data) => { if (isMounted) setBanks(data); })
      .catch(() => {})
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && showManualInput) manualNameRef.current?.focus();
  }, [isOpen, showManualInput]);

  const currentBank = useMemo(() => {
    if (selectedBankBin) return banks.find((bank) => bank.bin === selectedBankBin);
    if (selectedBankName) return findBankByQuery(selectedBankName);
    return undefined;
  }, [banks, selectedBankBin, selectedBankName]);

  const filteredBanks = useMemo(() => {
    const list = activeTab === 'POPULAR' ? banks.filter((bank) => bank.isPopular)
      : activeTab === 'BIG4' ? banks.filter((bank) => bank.isBig4) : banks;
    const query = normalizeSearch(searchQuery.trim());
    return query ? list.filter((bank) => normalizeSearch(`${bank.shortName} ${bank.name} ${bank.bin} ${bank.code}`).includes(query)) : list;
  }, [banks, activeTab, searchQuery]);

  const handleSelect = (bank: VietQrBank) => {
    onSelectBank(bank);
    onClose();
  };

  const handleManualSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!manualName.trim()) return;
    handleSelect({
      id: Date.now(), name: manualName.trim(), code: manualName.trim().toUpperCase().slice(0, 8),
      bin: manualBin.trim() || '970400', shortName: manualName.trim(), logo: 'https://cdn.vietqr.io/img/ICB.png',
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="scanms-bank-selector"
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => { if (event.key === 'Escape') event.stopPropagation(); }}
      onClick={(event) => {
        event.stopPropagation();
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}
    >
      <div className="scanms-bank-selector-header">
        <span className="scanms-bank-selector-icon"><Landmark size={18} /></span>
        <div><h2 id={titleId}>Chọn ngân hàng</h2><p>Ngân hàng nhận tiền · VietQR / Napas247</p></div>
        <button type="button" onClick={onClose} className="scanms-bank-selector-close" aria-label="Đóng danh sách ngân hàng"><X size={17} /></button>
      </div>

      {currentBank && (
        <details className="scanms-bank-selector-current">
          <summary><Check size={13} /><span>Đang chọn <strong>{currentBank.shortName}</strong></span><ChevronDown size={13} /></summary>
          <p>{currentBank.name}<span>BIN {currentBank.bin}</span></p>
        </details>
      )}

      <div className="scanms-bank-selector-controls">
        <div className="scanms-bank-selector-search">
          <Search size={16} />
          <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tìm tên ngân hàng hoặc mã BIN…" aria-label="Tìm ngân hàng theo tên hoặc mã BIN" autoFocus />
          {searchQuery && <button type="button" onClick={() => setSearchQuery('')} aria-label="Xóa tìm kiếm"><X size={15} /></button>}
        </div>
        <div className="scanms-bank-selector-filters" role="group" aria-label="Nhóm ngân hàng">
          {([{ value: 'ALL', label: `Tất cả${banks.length ? ` (${banks.length})` : ''}` }, { value: 'POPULAR', label: 'Phổ biến' }, { value: 'BIG4', label: 'Big 4' }] as const).map((tab) => (
            <button key={tab.value} type="button" aria-pressed={activeTab === tab.value} onClick={() => setActiveTab(tab.value)}>{tab.label}</button>
          ))}
          <span>{loading ? 'Đang tải…' : `${filteredBanks.length} ngân hàng`}</span>
        </div>
      </div>

      <div className="scanms-bank-selector-body" aria-busy={loading}>
        {showManualInput && (
          <form id={manualFormId} className="scanms-bank-selector-manual" onSubmit={handleManualSubmit}>
            <div><strong>Nhập ngân hàng khác</strong><button type="button" onClick={() => setShowManualInput(false)}>Hủy</button></div>
            <label>Tên ngân hàng<input ref={manualNameRef} value={manualName} onChange={(event) => setManualName(event.target.value)} placeholder="Ví dụ: Woori Bank" required /></label>
            <label>Mã BIN<input value={manualBin} onChange={(event) => setManualBin(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Mã BIN 6 số" inputMode="numeric" maxLength={6} /></label>
            <button type="submit">Áp dụng ngân hàng</button>
          </form>
        )}

        {loading && banks.length === 0 ? (
          <div className="scanms-bank-selector-empty"><RefreshCw size={18} className="animate-spin" /><p>Đang tải danh sách ngân hàng…</p></div>
        ) : filteredBanks.length === 0 ? (
          <div className="scanms-bank-selector-empty"><Search size={20} /><strong>Không tìm thấy ngân hàng</strong><p>Thử tên viết tắt, tên đầy đủ hoặc mã BIN.</p><button type="button" onClick={() => setShowManualInput(true)}>Nhập ngân hàng thủ công</button></div>
        ) : (
          <ul className="scanms-bank-selector-list" aria-label="Danh sách ngân hàng">
            {filteredBanks.map((bank) => {
              const isSelected = Boolean(currentBank?.bin === bank.bin || selectedBankBin === bank.bin || (selectedBankName && (selectedBankName.toLowerCase().includes(bank.shortName.toLowerCase()) || selectedBankName.includes(bank.bin))));
              return (
                <li key={`${bank.code}-${bank.bin}`}>
                  <button type="button" onClick={() => handleSelect(bank)} aria-pressed={isSelected} aria-label={`${bank.shortName}, ${bank.name}, BIN ${bank.bin}`} title={`${bank.name} · BIN ${bank.bin}`}>
                    <span className="scanms-bank-selector-logo"><Landmark size={17} /><img src={bank.logo} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} /></span>
                    <span className="scanms-bank-selector-bank-copy"><strong>{bank.shortName}</strong><span>BIN {bank.bin}</span></span>
                    {isSelected && <span className="scanms-bank-selector-check"><Check size={13} /></span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="scanms-bank-selector-footer">
        <button type="button" onClick={() => setShowManualInput((current) => !current)} aria-expanded={showManualInput} aria-controls={manualFormId}><Settings size={14} /> Nhập BIN thủ công</button>
        <span><ShieldCheck size={13} /> Danh sách VietQR</span>
      </div>
    </dialog>, document.body,
  );
};
