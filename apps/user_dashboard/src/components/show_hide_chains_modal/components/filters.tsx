import { Dropdown } from "@oko-wallet/oko-common-ui/dropdown";
import { ChevronDownIcon } from "@oko-wallet/oko-common-ui/icons/chevron_down";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type FC, type ReactNode, useState } from "react";

import styles from "./filters.module.scss";

const visibilityOptions = ["Show All", "Show Hidden"] as const;
const ecosystemFilterOptions = [
  "All Chains",
  "Cosmos",
  "EVM",
  "Solana",
] as const;

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
          options={visibilityOptions}
          value={visibility}
          onChange={setVisibility}
        />
        <FilterDropdown
          options={ecosystemFilterOptions}
          value={ecosystem}
          onChange={setEcosystem}
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
};

const FilterDropdown = <
  T extends typeof visibilityOptions | typeof ecosystemFilterOptions,
>({
  options,
  value,
  onChange,
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
      <Dropdown.Content className={styles.dropdownContent}>
        {options.map((option) => (
          <Dropdown.Item key={option} onClick={() => onChange(option)}>
            {option}
          </Dropdown.Item>
        ))}
      </Dropdown.Content>
    </Dropdown>
  );
};
