import React, {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
  useId,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (event: { target: { value: string; name?: string; id?: string } }) => void;
  options?: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
  children?: ReactNode;
  searchable?: boolean;
  placement?: 'bottom' | 'top' | 'auto';
  align?: 'left' | 'right';
  portal?: boolean;
}

function getLabelFromNode(node: ReactNode): string {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getLabelFromNode).join('');
  if (React.isValidElement(node) && (node.props as { children?: ReactNode })?.children) {
    return getLabelFromNode((node.props as { children?: ReactNode }).children);
  }
  return '';
}

function extractOptions(children: ReactNode): SelectOption[] {
  const result: SelectOption[] = [];

  const traverse = (nodes: ReactNode) => {
    React.Children.forEach(nodes, (child) => {
      if (!child) return;
      if (React.isValidElement(child)) {
        if (child.type === React.Fragment) {
          traverse((child.props as { children?: ReactNode }).children);
        } else if (child.type === 'option' || 'value' in (child.props as Record<string, unknown>)) {
          const props = child.props as { value?: unknown; label?: string; disabled?: boolean; children?: ReactNode };
          const val = props.value !== undefined ? String(props.value) : '';
          const label = getLabelFromNode(props.children) || props.label || val;
          result.push({
            value: val,
            label: label || val,
            disabled: Boolean(props.disabled),
          });
        } else if ((child.props as { children?: ReactNode })?.children) {
          traverse((child.props as { children?: ReactNode }).children);
        }
      }
    });
  };

  traverse(children);
  return result;
}

export const Select = forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      id,
      name,
      value,
      defaultValue,
      onChange,
      options: optionsProp,
      placeholder,
      disabled = false,
      required = false,
      className,
      style,
      'aria-label': ariaLabel,
      searchable,
      placement = 'auto',
      align = 'left',
      portal = false,
      children,
    },
    ref
  ) => {
    const options = useMemo(
      () => optionsProp || (children ? extractOptions(children) : []),
      [optionsProp, children],
    );

    const [isOpen, setIsOpen] = useState(false);
    const [openDirection, setOpenDirection] = useState<'down' | 'up'>(
      placement === 'top' ? 'up' : 'down'
    );
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    const [internalValue, setInternalValue] = useState<string>(() => {
      if (value !== undefined) return String(value);
      if (defaultValue !== undefined) return String(defaultValue);
      return options.length > 0 ? options[0].value : '';
    });

    const currentValue = value !== undefined ? String(value) : internalValue;

    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const generatedId = useId();
    const triggerId = id || generatedId;
    const listId = `${triggerId}-options`;
    const keyboardOpening = useRef<'first' | 'last' | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
    const renderMenu = (menu: ReactNode) => portal
      ? createPortal(menu, containerRef.current?.closest('dialog[open], [role="dialog"]') || document.body)
      : menu;

    // Detect open direction (upwards or downwards)
    useLayoutEffect(() => {
      if (!isOpen || !containerRef.current) return;
      if (portal) {
        const position = () => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          const margin = 8;
          const gap = 6;
          const below = window.innerHeight - rect.bottom - gap - margin;
          const above = rect.top - gap - margin;
          const up = placement === 'top' || (placement === 'auto' && below < 240 && above > below);
          setOpenDirection(up ? 'up' : 'down');
          const width = Math.min(Math.max(rect.width, 200), window.innerWidth - margin * 2);
          const left = Math.max(margin, Math.min(align === 'right' ? rect.right - width : rect.left, window.innerWidth - width - margin));
          setMenuStyle({
            position: 'fixed', width, left,
            top: up ? undefined : rect.bottom + gap,
            bottom: up ? window.innerHeight - rect.top + gap : undefined,
            maxHeight: Math.max(0, Math.min(240, up ? above : below)),
            colorScheme: 'light',
          });
        };
        const handleScroll = (event: Event) => {
          if (event.target instanceof Node && listRef.current?.contains(event.target)) return;
          position();
        };
        position();
        window.addEventListener('resize', position);
        document.addEventListener('scroll', handleScroll, true);
        return () => {
          window.removeEventListener('resize', position);
          document.removeEventListener('scroll', handleScroll, true);
        };
      }
      if (placement === 'top') {
        setOpenDirection('up');
        return;
      }
      if (placement === 'bottom') {
        setOpenDirection('down');
        return;
      }
      try {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < 260 && spaceAbove > spaceBelow) {
          setOpenDirection('up');
        } else {
          setOpenDirection('down');
        }
      } catch {
        setOpenDirection('down');
      }
    }, [isOpen, placement, align, portal]);

    // Filter options based on search query
    const filteredOptions = useMemo(() => {
      if (!searchQuery.trim()) return options;
      const q = searchQuery.toLowerCase().trim();
      return options.filter((opt) => opt.label.toLowerCase().includes(q));
    }, [options, searchQuery]);

    const focusOption = useCallback((edge: 'first' | 'last') => {
      const choices = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not([disabled])') ?? []);
      (choices.find(option => option.getAttribute('aria-selected') === 'true') ||
        (edge === 'last' ? choices.at(-1) : choices[0]))?.focus();
    }, []);

    useEffect(() => {
      if (isOpen) {
        setSearchQuery('');
        if (keyboardOpening.current) {
          const edge = keyboardOpening.current;
          keyboardOpening.current = null;
          focusOption(edge);
          return;
        }
        if (searchable ?? options.length > 7) {
          const timer = window.setTimeout(() => searchInputRef.current?.focus(), 50);
          return () => window.clearTimeout(timer);
        }
      }
    }, [isOpen, searchable, options.length, focusOption]);

    // Sync external value when controlled
    useEffect(() => {
      if (value !== undefined) {
        setInternalValue(String(value));
      }
    }, [value]);

    // Handle outside clicks
    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (e: MouseEvent | TouchEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node) && !listRef.current?.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }, [isOpen]);

    const selectedOption = options.find((opt) => opt.value === currentValue);
    const displayLabel = selectedOption
      ? selectedOption.label
      : placeholder || (options.length > 0 ? options[0].label : 'Chọn...');

    const handleSelect = (opt: SelectOption) => {
      if (opt.disabled || disabled) return;
      if (value === undefined) {
        setInternalValue(opt.value);
      }
      setIsOpen(false);
      triggerRef.current?.focus();
      if (onChange) {
        onChange({
          target: {
            value: opt.value,
            name,
            id,
          },
        });
      }
    };

    const isFullWidth = !className || className.includes('w-full') || className.includes('flex-1');
    const menuKeyDown = (event: React.KeyboardEvent) => {
      const choices = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not([disabled])') ?? []);
      const index = choices.indexOf(document.activeElement as HTMLButtonElement);
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); setIsOpen(false); triggerRef.current?.focus();
      } else if (event.key === 'Tab') { triggerRef.current?.focus(); setIsOpen(false); }
      else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); event.stopPropagation();
         if (!choices.length) return;
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1
          : event.key === 'ArrowDown' ? (index + 1) % choices.length : index < 0 ? choices.length - 1 : (index - 1 + choices.length) % choices.length;
        choices[next]?.focus();
      }
    };

    return (
      <div
        ref={(node) => {
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }
        }}
        className={cn('relative min-w-0 max-w-full', isFullWidth ? 'w-full' : 'inline-block')}
        style={style}
      >
        {/* Hidden input for standard forms */}
        <input
          type="hidden"
          name={name}
          value={currentValue}
          required={required}
          disabled={disabled}
        />

        {/* Trigger Button - Tone Sáng Vàng Be Chuẩn SCANMS */}
        <button
          type="button"
          ref={triggerRef}
          id={triggerId}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listId : undefined}
          aria-label={ariaLabel}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={event => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              const edge = event.key === 'ArrowUp' ? 'last' : 'first';
              if (isOpen) focusOption(edge);
              else { keyboardOpening.current = edge; setIsOpen(true); }
            } else if (event.key === 'Escape' && isOpen) {
              event.preventDefault(); event.stopPropagation(); setIsOpen(false);
            }
          }}
          className={cn(
            'w-full min-h-11 min-w-0 flex items-center justify-between gap-2 rounded-xl border border-[#EAE4D7] bg-white px-3.5 py-2.5 text-base sm:text-sm text-[#1A1612] font-medium transition cursor-pointer text-left outline-none shadow-2xs',
            'hover:border-[#C59B58] focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20',
            isOpen && 'border-[#C59B58] ring-2 ring-[#C59B58]/20',
            disabled && 'opacity-50 cursor-not-allowed bg-[#FAF8F5]',
            className
          )}
        >
          <span className="truncate block font-medium">
            {displayLabel}
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-[#7D715E] shrink-0 transition-transform duration-200',
              isOpen && (openDirection === 'up' ? '-rotate-180 text-[#B88E4F]' : 'rotate-180 text-[#B88E4F]')
            )}
          />
        </button>

        {/* Custom Dropdown List - Hoàn Toàn Không Dùng OS Popup, Tone Sáng 100% */}
        {isOpen && renderMenu(
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={triggerId}
            onKeyDown={menuKeyDown}
            tabIndex={-1}
            className={cn(
              'bg-white border border-[#EEDFC6] rounded-2xl shadow-xl py-1.5 max-h-60 flex flex-col overflow-hidden',
              portal ? 'fixed z-[120]' : cn('absolute z-50 min-w-0 w-full animate-in fade-in zoom-in-95 duration-150', align === 'right' ? 'right-0' : 'left-0', openDirection === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5')
            )}
            style={portal ? menuStyle : { colorScheme: 'light' }}
          >
            {(searchable ?? options.length > 7) && (
              <div className="p-2 border-b border-[#EAE4D7] bg-[#FAF8F5]/90 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#B88E4F] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm nhanh..."
                    className="w-full min-h-11 pl-8 pr-9 py-1.5 text-base sm:text-sm bg-white border border-[#EAE4D7] rounded-xl text-[#1A1612] placeholder:text-[#A99D8A] focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20 outline-none transition"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      menuKeyDown(e);
                      e.stopPropagation();
                      if (e.key === 'Escape') { e.preventDefault(); setIsOpen(false); }
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSearchQuery(''); }}
                      aria-label="Xóa tìm kiếm"
                      className="absolute right-0 top-1/2 -translate-y-1/2 flex size-11 items-center justify-center rounded-lg text-sm text-[#7D715E] hover:text-[#1A1612] cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="min-h-0 overflow-y-auto overscroll-contain flex-1 max-h-52 [scrollbar-width:thin] [scrollbar-color:#EEDFC6_transparent]">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-xs text-[#7D715E] text-center">
                  Không tìm thấy kết quả phù hợp
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === currentValue;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={opt.disabled}
                      onClick={() => handleSelect(opt)}
                      className={cn(
                        'w-full min-h-11 text-left px-3.5 py-2.5 text-sm transition flex items-center justify-between cursor-pointer select-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#B88E4F]',
                        isSelected
                          ? 'bg-[#FBF5EB] text-[#B88E4F] font-bold hover:bg-[#F3EFE6]'
                          : 'text-[#1A1612] hover:bg-[#F3EFE6] hover:text-[#B88E4F] font-normal',
                        opt.disabled && 'opacity-40 cursor-not-allowed bg-transparent text-[#7D715E]'
                      )}
                    >
                      <span className="truncate pr-2">{opt.label}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#C59B58] shrink-0 ml-auto" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
