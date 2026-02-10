"use client";

import React, { useState, useCallback, type ReactNode, type FC } from "react";
import {
  useFloating,
  useDismiss,
  useRole,
  useClick,
  useInteractions,
  useId,
  FloatingPortal,
  offset,
  type Placement,
  autoUpdate,
} from "@floating-ui/react";
import cn from "classnames";
import { Typography } from "@oko-wallet/oko-common-ui/typography";

import styles from "./anchored_menu.module.scss";

const MenuItemRow: FC<{
  item: AnchoredMenuItem;
  onClick: (item: AnchoredMenuItem) => void;
}> = ({ item, onClick }) => (
  <li
    className={cn(styles.menuItem, item.className)}
    role="menuitem"
    onClick={() => onClick(item)}
  >
    <div className={styles.menuItemContent}>
      {item.icon && <span className={styles.menuItemIcon}>{item.icon}</span>}
      <Typography
        size="sm"
        weight="semibold"
        color={item.labelColor ?? "secondary"}
        className={styles.menuItemLabel}
      >
        {item.label}
      </Typography>
      {item.trailingIcon && (
        <span className={styles.menuItemTrailingIcon}>{item.trailingIcon}</span>
      )}
    </div>
  </li>
);

export const AnchoredMenu: FC<AnchoredMenuProps> = ({
  TriggerComponent,
  HeaderComponent = null,
  menuItems,
  menuSections,
  footerSection,
  placement = "right-start",
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    middleware: [offset(8)],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "menu" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  const headingId = useId();

  const handleMenuItemClick = useCallback((item: AnchoredMenuItem) => {
    item.onClick();
    setIsOpen(false);
  }, []);

  return (
    <>
      <div
        ref={refs.setReference}
        className={styles.wrapper}
        {...getReferenceProps()}
      >
        {TriggerComponent}
      </div>

      <FloatingPortal>
        {isOpen && (
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            aria-labelledby={headingId}
            className={cn(styles.menu, className)}
            {...getFloatingProps()}
          >
            {menuSections ? (
              <div className={styles.menuInner}>
                {HeaderComponent}
                {menuSections.map((section) => (
                  <ul
                    key={section.id}
                    className={styles.menuSection}
                    role="menu"
                  >
                    {section.label && (
                      <li className={styles.menuSectionLabel}>
                        <Typography
                          size="xs"
                          weight="semibold"
                          color="tertiary"
                        >
                          {section.label}
                        </Typography>
                      </li>
                    )}
                    {section.items.map((item) => (
                      <MenuItemRow
                        key={item.id}
                        item={item}
                        onClick={handleMenuItemClick}
                      />
                    ))}
                  </ul>
                ))}
              </div>
            ) : (
              <>
                {HeaderComponent}
                <ul className={styles.menuList} role="menu">
                  {menuItems?.map((item) => (
                    <MenuItemRow
                      key={item.id}
                      item={item}
                      onClick={handleMenuItemClick}
                    />
                  ))}
                </ul>
              </>
            )}
            {footerSection && (
              <ul className={styles.menuFooter} role="menu">
                {footerSection.items.map((item) => (
                  <MenuItemRow
                    key={item.id}
                    item={item}
                    onClick={handleMenuItemClick}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </FloatingPortal>
    </>
  );
};

export type AnchoredMenuItem = {
  id: string;
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  className?: string;
  labelColor?: Parameters<typeof Typography>[0]["color"];
};

export type AnchoredMenuSection = {
  id: string;
  label?: string;
  items: AnchoredMenuItem[];
};

export type AnchoredMenuProps = {
  TriggerComponent: ReactNode;
  menuItems?: AnchoredMenuItem[];
  menuSections?: AnchoredMenuSection[];
  footerSection?: AnchoredMenuSection;
  placement?: Placement;
  disabled?: boolean;
  HeaderComponent?: ReactNode;
  className?: string;
};
