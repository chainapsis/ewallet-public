"use client";

import {
  autoUpdate,
  FloatingPortal,
  offset,
  type Placement,
  useClick,
  useDismiss,
  useFloating,
  useId,
  useInteractions,
  useRole,
  useTransitionStyles,
} from "@floating-ui/react";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import cn from "classnames";
import { type FC, type ReactNode, useCallback, useState } from "react";

import styles from "./anchored_menu.module.scss";

const TRANSFORM_ORIGINS: Record<string, string> = {
  top: "bottom center",
  "top-start": "bottom left",
  "top-end": "bottom right",
  bottom: "top center",
  "bottom-start": "top left",
  "bottom-end": "top right",
  left: "center right",
  "left-start": "top right",
  "left-end": "bottom right",
  right: "center left",
  "right-start": "top left",
  "right-end": "bottom left",
};

function getTransformOrigin(placement: Placement): string {
  return TRANSFORM_ORIGINS[placement] ?? "top left";
}

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

  const { isMounted, styles: transitionStyles } = useTransitionStyles(
    context,
    {
      duration: 150,
      initial: {
        opacity: 0,
        transform: "scale(0.97)",
      },
      common: ({ placement: currentPlacement }) => ({
        transformOrigin: getTransformOrigin(currentPlacement),
        // custom ease-out value
        transitionTimingFunction: "cubic-bezier(0.86, 0, 0.07, 1)",
      }),
    },
  );

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
        {isMounted && (
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <div
              style={transitionStyles}
              aria-labelledby={headingId}
              className={cn(styles.menu, className)}
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
