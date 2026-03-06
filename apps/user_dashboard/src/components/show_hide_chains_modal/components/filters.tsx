import { Dropdown } from "@oko-wallet/oko-common-ui/dropdown";
import { ChevronDownIcon } from "@oko-wallet/oko-common-ui/icons/chevron_down";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type FC, type ReactNode, useState } from "react";

import styles from "./filters.module.scss";

const visibilityOptions = ["Show All", "Show Hidden"] as const;
const ecosystemFilterOptions = ["All Chains", "Cosmos", "EVM", "SVM"] as const;

type SelectedFilters = {
  visibility: (typeof visibilityOptions)[number];
  ecosystem: (typeof ecosystemFilterOptions)[number];
};

export type ShowHideChainsFiltersProps = {
  children: (props: SelectedFilters) => ReactNode;
};

export const ShowHideChainsFilters: FC<ShowHideChainsFiltersProps> = ({
  children,
}) => {
  const [visibility, setVisibility] = useState<SelectedFilters["visibility"]>(
    visibilityOptions[0],
  );
  const [ecosystem, setEcosystem] = useState<SelectedFilters["ecosystem"]>(
    ecosystemFilterOptions[0],
  );

  return (
    <>
      <div className={styles.filterWrapper}>
        <FilterDropdown
          align="start"
          options={visibilityOptions}
          value={visibility}
          onChange={setVisibility}
          contentClassName={styles.dropdownContent}
        />
        <FilterDropdown
          align="end"
          options={ecosystemFilterOptions}
          value={ecosystem}
          onChange={setEcosystem}
          contentClassName={styles.dropdownContent}
        />
      </div>

      {children({
        visibility,
        ecosystem,
      })}
    </>
  );
};

type FilterDropdownProps<
  T extends typeof visibilityOptions | typeof ecosystemFilterOptions,
> = {
  options: T;
  value: T[number];
  onChange: (value: T[number]) => void;
  align?: "start" | "end";
  contentClassName?: string;
};

const FilterDropdown = <
  T extends typeof visibilityOptions | typeof ecosystemFilterOptions,
>({
  options,
  value,
  align,
  onChange,
  contentClassName,
}: FilterDropdownProps<T>) => {
  return (
    <Dropdown>
      <Dropdown.Trigger asChild>
        <div className={styles.dropdownTrigger}>
          <Typography size="sm" color="secondary" weight="semibold">
            {options.find((option) => option === value)}
          </Typography>
          <ChevronDownIcon
            color="var(--fg-quaternary)"
            size={20}
            className={styles.chevronIcon}
          />
        </div>
      </Dropdown.Trigger>
      <Dropdown.Content
        className={contentClassName}
        defaultOffsetFromTrigger={16}
        align={align}
      >
        {options.map((option) => (
          <Dropdown.Item key={option} onClick={() => onChange(option)}>
            {option}
          </Dropdown.Item>
        ))}
      </Dropdown.Content>
    </Dropdown>
  );
};
