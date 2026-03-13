import cn from "classnames";
import type { FC } from "react";

import styles from "./table.module.scss";

export interface TableProps
  extends React.TableHTMLAttributes<HTMLTableElement> {
  variant?: "default" | "striped" | "bordered";
  size?: "sm" | "md";
  noWrap?: boolean;
}

export interface TableHeadProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {}

export interface TableBodyProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {}

export interface TableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
}

export interface TableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "center" | "right";
}

export interface TableHeaderCellProps
  extends React.ThHTMLAttributes<HTMLTableHeaderCellElement> {
  align?: "left" | "center" | "right";
  sortable?: boolean;
}

export const Table: FC<React.PropsWithChildren<TableProps>> = ({
  variant = "default",
  size = "md",
  children,
  className,
  noWrap = false,
  ...rest
}) => {
  const tableClassName = cn(
    styles.table,
    styles[variant],
    styles[size],
    className,
  );

  if (noWrap) {
    return (
      <table className={tableClassName} {...rest}>
        {children}
      </table>
    );
  }

  return (
    <div className={styles.wrapper}>
      <table className={tableClassName} {...rest}>
        {children}
      </table>
    </div>
  );
};

export const TableHead: FC<React.PropsWithChildren<TableHeadProps>> = ({
  children,
  className,
  ...rest
}) => {
  return (
    <thead className={cn(styles.head, className)} {...rest}>
      {children}
    </thead>
  );
};

export const TableBody: FC<React.PropsWithChildren<TableBodyProps>> = ({
  children,
  className,
  ...rest
}) => {
  return (
    <tbody className={cn(styles.body, className)} {...rest}>
      {children}
    </tbody>
  );
};

export const TableRow: FC<React.PropsWithChildren<TableRowProps>> = ({
  selected = false,
  children,
  className,
  ...rest
}) => {
  const rowClassName = cn(
    styles.row,
    {
      [styles.selected]: selected,
    },
    className,
  );

  return (
    <tr className={rowClassName} {...rest}>
      {children}
    </tr>
  );
};

export const TableCell: FC<React.PropsWithChildren<TableCellProps>> = ({
  align = "left",
  children,
  className,
  ...rest
}) => {
  const cellClassName = cn(styles.cell, styles[`align-${align}`], className);

  return (
    <td className={cellClassName} {...rest}>
      {children}
    </td>
  );
};

export const TableHeaderCell: FC<
  React.PropsWithChildren<TableHeaderCellProps>
> = ({ align = "left", sortable = false, children, className, ...rest }) => {
  const headerClassName = cn(
    styles.headerCell,
    styles[`align-${align}`],
    {
      [styles.sortable]: sortable,
    },
    className,
  );

  return (
    <th className={headerClassName} {...rest}>
      {children}
    </th>
  );
};
