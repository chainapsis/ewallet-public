import { Badge } from "@oko-wallet/oko-common-ui/badge";
import { PlusIcon } from "@oko-wallet/oko-common-ui/icons/plus";
import { Typography } from "@oko-wallet/oko-common-ui/typography";

import styles from "./table_filter.module.scss";

type TableFiltersProps = {
  filters: {
    name: string;
    selectedOptionId?: string;
    options?: FilterOption[];
    onClick: (key: string) => void;
  }[];
};

type FilterOption = {
  id: string;
  label: string;
};

export const TableFilters = ({ filters }: TableFiltersProps) => {
  return (
    <div className={styles.wrapper}>
      <Typography size="md" weight="medium" color="tertiary">
        Filter by
      </Typography>

      {filters.map((filter) => (
        <div key={filter.name} className={styles.filter}>
          <PlusIcon color="var(--fg-quaternary)" size={12} />
          <Typography size="xs" weight="medium" color="secondary">
            {filter.name}
          </Typography>

          <ul className={styles.options}>
            {filter.options?.map((option) => (
              <li
                key={option.id}
                onClick={() => filter.onClick(option.id)}
                className={styles.option}
              >
                <Badge
                  color={
                    filter.selectedOptionId === option.id ? "brand" : "gray"
                  }
                  size="md"
                  label={option.label}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};
