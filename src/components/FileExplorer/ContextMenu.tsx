import { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: JSX.Element;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  category?: string;
  onClick: () => void;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  x: number;
  y: number;
  onClose: () => void;
}

export function ContextMenu({ items, x, y, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const vpW = window.innerWidth;
      const vpH = window.innerHeight;
      let adjX = x;
      let adjY = y;
      if (x + rect.width > vpW) adjX = vpW - rect.width - 8;
      if (y + rect.height > vpH) adjY = vpH - rect.height - 8;
      if (adjX < 0) adjX = 8;
      if (adjY < 0) adjY = 8;
      menuRef.current.style.left = `${adjX}px`;
      menuRef.current.style.top = `${adjY}px`;
    }
  }, [x, y]);

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled) return;
    item.onClick();
    onClose();
  };

  let lastCategory = '';

  return (
    <div
      ref={menuRef}
      className="ctx-menu"
      style={{ left: x, top: y }}
      role="menu"
    >
      {items.map((item, i) => {
        if (item.separator) {
          lastCategory = '';
          return <div key={`sep-${i}`} className="ctx-menu-separator" />;
        }
        const showCategory = item.category && item.category !== lastCategory;
        if (showCategory) lastCategory = item.category!;
        return (
          <div key={item.id}>
            {showCategory && (
              <div className="ctx-menu-category">{item.category}</div>
            )}
            <button
              className={`ctx-menu-item ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''}`}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
              role="menuitem"
            >
              {item.icon && <span className="ctx-menu-icon">{item.icon}</span>}
              <span className="ctx-menu-label">{item.label}</span>
              {item.shortcut && <span className="ctx-menu-shortcut">{item.shortcut}</span>}
            </button>
          </div>
        );
      })}
    </div>
  );
}
