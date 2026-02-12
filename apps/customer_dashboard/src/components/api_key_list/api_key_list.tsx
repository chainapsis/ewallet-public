"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { PlusIcon } from "@oko-wallet/oko-common-ui/icons/plus";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { type FC, useState } from "react";
import { flexRender } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@oko-wallet/oko-common-ui/table";
import { Typography } from "@oko-wallet/oko-common-ui/typography";

import { APIKeyItemRow } from "./api_key_item_row";
import styles from "./api_key_list.module.scss";
import { useAPIKeysTable } from "./use_api_keys_table";
import {
  useAPIKeys,
  useCreateAPIKey,
  useDeleteAPIKey,
} from "@oko-wallet-ct-dashboard/hooks/use_api_keys";
import { displayToast } from "@oko-wallet-ct-dashboard/components/toast";
import { DeleteAPIKeyModal } from "./delete_api_key_modal";

export const APIKeyList: FC = () => {
  const { data: apiKeys } = useAPIKeys();
  const { table } = useAPIKeysTable(apiKeys ?? []);
  const createAPIKey = useCreateAPIKey();
  const deleteAPIKey = useDeleteAPIKey();
  const [deleteTargetKeyId, setDeleteTargetKeyId] = useState<string | null>(
    null,
  );

  const deleteTargetKey = apiKeys?.find(
    (key) => key.key_id === deleteTargetKeyId,
  );

  const handleDelete = () => {
    if (!deleteTargetKeyId) {
      return;
    }
    deleteAPIKey.mutate(deleteTargetKeyId, {
      onSuccess: () => {
        setDeleteTargetKeyId(null);
        displayToast({
          variant: "confirm",
          title: "API key deleted!",
        });
      },
      onError: () => {
        displayToast({
          variant: "error",
          title: "Failed to delete API key",
        });
      },
    });
  };

  const handleCreate = () => {
    createAPIKey.mutate(undefined, {
      onSuccess: () => {
        displayToast({
          variant: "success",
          title: "API key created!",
        });
      },
      onError: () => {
        displayToast({
          variant: "error",
          title: "Failed to create API key",
        });
      },
    });
  };

  return (
    <div className={styles.wrapper}>
      <div>
        <Typography
          tagType="h1"
          size="display-xs"
          weight="semibold"
          color="primary"
        >
          API Keys
        </Typography>

        <Spacing height={8} />

        <Typography size="md" weight="medium" color="tertiary">
          View and manage your API keys
        </Typography>

        <Spacing height={20} />

        <Button
          variant="primary"
          size="md"
          onClick={handleCreate}
          disabled={createAPIKey.isPending}
          isLoading={createAPIKey.isPending}
        >
          <PlusIcon size={20} color="currentColor" />
          Create API Key
        </Button>
      </div>

      <Table variant="bordered">
        <TableHead>
          <TableRow>
            {table.getFlatHeaders().map((header) => (
              <TableHeaderCell key={header.id}>
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                )}
              </TableHeaderCell>
            ))}
            <TableHeaderCell className={styles.actionCell} />
          </TableRow>
        </TableHead>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <APIKeyItemRow
              key={row.id}
              apiKey={row.getValue("hashed_key")}
              keyId={row.original.key_id}
              status={row.original.is_active ? "active" : "inactive"}
              createdDate={row.getValue("created_at") || ""}
              onDelete={setDeleteTargetKeyId}
            />
          ))}
        </TableBody>
      </Table>

      {deleteTargetKey && (
        <DeleteAPIKeyModal
          apiKey={deleteTargetKey.hashed_key}
          onDelete={handleDelete}
          onClose={() => setDeleteTargetKeyId(null)}
          isDeleting={deleteAPIKey.isPending}
        />
      )}
    </div>
  );
};
