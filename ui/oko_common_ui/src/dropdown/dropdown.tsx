import cn from "classnames";
import {
  cloneElement,
  createContext,
  type FC,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import styles from "./dropdown.module.scss";

const DEFAULT_BOUNDARY_MARGIN = 16;

interface DropdownContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
}
const DropdownContext = createContext<DropdownContextType | null>(null);

const useDropdownContext = (): DropdownContextType => {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("Dropdown components must be used within a Dropdown");
  }
  return context;
};

export interface DropdownProps {
  children: React.ReactNode;
  className?: string;
}

export interface DropdownTriggerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  asChild?: boolean;
}

export interface DropdownContentProps {
  children: React.ReactNode;
  className?: string;
  defaultOffsetFromTrigger?: number;
  align?: "start" | "end";
  style?: React.CSSProperties;
}

export interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

export interface DropdownDividerProps {
  className?: string;
}

const DropdownRoot: FC<DropdownProps> = ({ children, className }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        triggerRef.current &&
        contentRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        !contentRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.pointerEvents = "none";
    } else {
      document.body.style.pointerEvents = "auto";
    }
  }, [isOpen]);

  const contextValue: DropdownContextType = {
    isOpen,
    setIsOpen,
    triggerRef,
    contentRef,
  };

  return (
    <DropdownContext.Provider value={contextValue}>
      <div className={cn(styles.dropdown, className)}>{children}</div>
    </DropdownContext.Provider>
  );
};

/**
 * @description dropdown trigger component
 * @param children Trigger Component
 * @param className Trigger component class
 * @param asChild Whether to use the trigger component as a child
 * @description If asChild=true, the component wrapping children disappears and the chiren component becomes the top-level component.
 * @example
 * <Dropdown.Trigger asChild>
 * <button>Open Menu</button>
 * </Dropdown.Trigger>
 * ->
 * <button>
 * Open menu
 * </button>
 */
const DropdownTrigger: FC<DropdownTriggerProps> = ({
  children,
  className,
  asChild = false,
  style,
}) => {
  const { isOpen, setIsOpen, triggerRef } = useDropdownContext();

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  if (asChild && isValidElement(children)) {
    const childProps = (children as React.ReactElement<any>).props;
    return cloneElement(children as React.ReactElement<any>, {
      ref: triggerRef,
      onClick: handleClick,
      onKeyDown: handleKeyDown,
      tabIndex: 0,
      "aria-expanded": isOpen,
      "aria-haspopup": "dropdown menu",
      className: cn(className, childProps.className),
      style: { ...childProps.style, ...style },
    });
  }

  return (
    <div
      ref={triggerRef as React.RefObject<HTMLDivElement>}
      className={cn(styles.trigger, className)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-expanded={isOpen}
      aria-haspopup={true}
      style={style}
    >
      {children}
    </div>
  );
};

const EXIT_DURATION = 150;
function useTransition(isOpen: boolean, exitDuration: number) {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      // Double rAF: 첫 프레임에서 초기 상태(opacity:0, scale:0.95)를 렌더한 뒤,
      // 다음 프레임에서 .open을 적용해야 브라우저가 변화를 감지하고 transition이 발동된다.
      // 단일 rAF로는 같은 paint 사이클에 마운트+.open이 적용되어 transition이 무시될 수 있다.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsVisible(true));
      });
    } else if (isMounted) {
      setIsVisible(false);
      const timer = setTimeout(() => setIsMounted(false), exitDuration);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return { isMounted, isVisible };
}

function useDropdownPosition(
  isOpen: boolean,
  isMounted: boolean,
  triggerRef: React.RefObject<HTMLElement | null>,
  contentRef: React.RefObject<HTMLDivElement | null>,
  align: "start" | "end",
  offsetFromTrigger: number,
) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [transformOrigin, setTransformOrigin] = useState("top left");

  useEffect(() => {
    if (isOpen && isMounted && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const contentWidth = contentRef.current?.offsetWidth || 300;
      const contentHeight = contentRef.current?.offsetHeight || 500;

      let top = triggerRect.bottom + window.scrollY + offsetFromTrigger;
      let left =
        align === "end"
          ? triggerRect.right + window.scrollX - contentWidth
          : triggerRect.left + window.scrollX;

      const isBottomOverflow =
        top + contentHeight > window.scrollY + viewportHeight;
      const isTopOverflow = top < window.scrollY + DEFAULT_BOUNDARY_MARGIN;
      const isLeftOverflow = left < DEFAULT_BOUNDARY_MARGIN;
      const isRightOverflow = left + contentWidth > viewportWidth;

      if (isBottomOverflow) {
        top =
          triggerRect.top +
          window.scrollY -
          (contentHeight + offsetFromTrigger);
      }
      if (isTopOverflow) {
        top = window.scrollY + DEFAULT_BOUNDARY_MARGIN;
      }
      if (isRightOverflow) {
        left = viewportWidth - contentWidth - DEFAULT_BOUNDARY_MARGIN;
      }
      if (isLeftOverflow) {
        left = DEFAULT_BOUNDARY_MARGIN;
      }

      const vertical = isBottomOverflow ? "bottom" : "top";
      const horizontal = align === "end" ? "right" : "left";
      setTransformOrigin(`${vertical} ${horizontal}`);

      setPosition({ top, left });
    }
  }, [isOpen, isMounted, align]);

  return { position, transformOrigin };
}

const DropdownContent: FC<DropdownContentProps> = ({
  children,
  className,
  defaultOffsetFromTrigger = 4,
  align = "start",
  style,
}) => {
  const { isOpen, contentRef, triggerRef } = useDropdownContext();
  const { isMounted, isVisible } = useTransition(isOpen, EXIT_DURATION);
  const { position, transformOrigin } = useDropdownPosition(
    isOpen,
    isMounted,
    triggerRef,
    contentRef,
    align,
    defaultOffsetFromTrigger,
  );

  if (!isMounted) {
    return null;
  }

  const content = (
    <div
      ref={contentRef}
      className={cn(
        styles.content,
        isVisible && styles.open,
        className,
      )}
      style={{
        position: "absolute",
        top: position.top,
        left: position.left,
        transformOrigin,
        ...style,
      }}
    >
      {children}
    </div>
  );

  return createPortal(content, document.body);
};

const DropdownItem: FC<DropdownItemProps> = ({
  children,
  onClick,
  disabled = false,
  className,
  icon,
  style,
}) => {
  const { setIsOpen } = useDropdownContext();

  const handleClick = () => {
    if (!disabled) {
      onClick?.();
      setIsOpen(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.key === "Enter" || event.key === " ") && !disabled) {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      type="button"
      className={cn(styles.item, className)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      style={style}
    >
      {icon && (
        <>
          {icon}
          <div style={{ width: "8px" }} />
        </>
      )}
      {children}
    </button>
  );
};

const DropdownDivider: FC<DropdownDividerProps> = ({ className }) => {
  return <div className={cn(styles.divider, className)} />;
};

export const Dropdown = Object.assign(DropdownRoot, {
  Trigger: DropdownTrigger,
  Content: DropdownContent,
  Item: DropdownItem,
  Divider: DropdownDivider,
});
