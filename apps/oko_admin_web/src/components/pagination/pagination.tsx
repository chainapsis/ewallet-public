import type { FC } from "react";

import styles from "./pagination.module.scss";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export const Pagination: FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  let pages: (number | string)[] = [];

  if (totalPages <= 7) {
    pages = range(1, totalPages);
  } else {
    const delta = 2;

    if (currentPage <= 4) {
      pages = [...range(1, 5), "...", totalPages];
    } else if (currentPage >= totalPages - 3) {
      pages = [1, "...", ...range(totalPages - 4, totalPages)];
    } else {
      pages = [
        1,
        "...",
        ...range(currentPage - delta, currentPage + delta),
        "...",
        totalPages,
      ];
    }
  }

  return (
    <div className={styles.wrapper}>
      <nav className={styles.pagination}>
        {pages.map((page, idx) => {
          if (page === "...") {
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: display-only list
              <div key={`ellipsis-${idx}`} className={styles.ellipsisWrapper}>
                <span className={styles.ellipsis}>...</span>
              </div>
            );
          }
          return (
            <button
              type="button"
              key={page}
              className={`${styles.page} ${page === currentPage ? styles.active : ""}`}
              onClick={() =>
                typeof page === "number" ? onPageChange(page) : undefined
              }
              aria-current={page === currentPage}
            >
              {page}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
