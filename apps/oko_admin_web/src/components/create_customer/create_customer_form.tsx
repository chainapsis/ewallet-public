"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { PlusIcon } from "@oko-wallet/oko-common-ui/icons/plus";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Input } from "@oko-wallet/oko-common-ui/input";
import type { CreateCustomerWithDashboardUserRequest } from "@oko-wallet/oko-types/admin";
import { useRouter } from "next/navigation";
import { type FC, useRef } from "react";
import type { SubmitHandler } from "react-hook-form";

import { useToast } from "../toast/use_toast";
import styles from "./create_customer_form.module.scss";
import { useCreateCustomerForm } from "./use_create_customer_form";

export const CreateCustomerForm: FC = () => {
  const router = useRouter();
  const { showSuccessToast, showErrorToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    mutation,
    errors,
    logoPreview,
    isDragging,
    handleSubmit,
    register,
    handleLogoUpload,
    handleLogoRemove,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  } = useCreateCustomerForm();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleLogoUpload(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const onSubmit: SubmitHandler<CreateCustomerWithDashboardUserRequest> = (
    data,
  ) => {
    mutation.mutate(data, {
      onSuccess: (data) => {
        if (data?.success) {
          showSuccessToast("Successfully created customer.");
          router.push(`/apps/${data?.data.customer_id}`);
        }
      },
      onError: (err) => {
        showErrorToast(err.message);
      },
    });
  };

  return (
    /* "handleSubmit" will validate your inputs before invoking "onSubmit" */
    <form className={styles.wrapper} onSubmit={handleSubmit(onSubmit)}>
      <Input
        {...register("label")}
        requiredSymbol
        label="Team Name"
        placeholder="Team Name"
        className={styles.inputCustomWidth}
        error={errors.label?.message}
      />

      <Input
        {...register("url")}
        requiredSymbol
        label="App URL"
        placeholder="https://example.com"
        className={styles.inputCustomWidth}
        error={errors.url?.message}
      />

      <Input
        {...register("email")}
        requiredSymbol
        label="Email"
        type="email"
        placeholder="name@example.com"
        className={styles.inputCustomWidth}
        error={errors.email?.message}
      />

      <div className={styles.appLogoUploadWrapper}>
        <label htmlFor="appLogoUpload" className={styles.appLogoUploadLabel}>
          <span className={styles.appLogoUploadLabelText}>App Logo</span>
        </label>
        <p className={styles.appLogoUploadDescription}>
          Image with 128×128 pixels and under 1 MB. PNG, JPG, JPEG, and WebP
          only. SVG and GIF are not allowed.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />

        <div
          className={`${styles.appLogoUploadInput} ${isDragging ? styles.dragging : ""}`}
          onClick={handleUploadClick}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {logoPreview ? (
            <div className={styles.logoPreview}>
              <img
                src={logoPreview}
                alt="Logo preview"
                className={styles.logoPreviewImage}
              />
              <button
                type="button"
                className={styles.removeButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogoRemove(fileInputRef);
                }}
              >
                <XCloseIcon
                  className={styles.xCloseIcon}
                  color="var(--text-white)"
                />
              </button>
            </div>
          ) : (
            <div className={styles.appLogoUploadIcon}>
              <PlusIcon
                className={styles.plusIcon}
                color="var(--text-primary)"
              />
            </div>
          )}
        </div>
      </div>
      <Button
        type="submit"
        disabled={
          // TODO: disable before required fields are filled
          mutation.isPending
        }
      >
        Add
      </Button>
    </form>
  );
};
