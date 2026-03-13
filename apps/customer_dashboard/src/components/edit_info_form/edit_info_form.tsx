"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { PlusIcon } from "@oko-wallet/oko-common-ui/icons/plus";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Input } from "@oko-wallet/oko-common-ui/input";
import type { FC } from "react";

import styles from "./edit_info_form.module.scss";
import { useEditInfoForm } from "./use_edit_info_form";

export const EditInfoForm: FC = () => {
  const {
    onSubmit,
    register,
    errors,
    isLoading,
    hasChanges,
    fileInputRef,
    previewUrl,
    isDragging,
    handleFileSelect,
    handleUploadClick,
    handleLogoRemove,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    resetErrors,
  } = useEditInfoForm();

  return (
    <form onSubmit={onSubmit} className={styles.form}>
      {/* Team Name Input */}
      <Input
        label="Team Name"
        {...register("label")}
        disabled={isLoading}
        placeholder="Team Name"
        className={styles.input}
        error={errors.label?.message}
        onFocus={() => resetErrors("label")}
      />

      {/* App URL Input */}
      <Input
        label="App URL"
        {...register("url")}
        disabled={isLoading}
        placeholder="https://example.com"
        className={styles.input}
        error={errors.url?.message}
        onFocus={() => resetErrors("url")}
      />

      {/* Logo Upload with drag & drop */}
      <div className={styles.appLogoUploadWrapper}>
        <label className={styles.appLogoUploadLabel}>
          <span className={styles.appLogoUploadLabelText}>App Logo</span>
        </label>
        <p className={styles.appLogoUploadDescription}>
          App logo file in 128×128 px size, under 1 MB, and not in SVG format.
          Drag and drop or click to upload.
        </p>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleFileSelect}
          style={{ display: "none" }}
          disabled={isLoading}
        />

        {/* Clickable upload area with drag & drop */}
        <div
          role="button"
          tabIndex={0}
          className={`${styles.appLogoUploadInput} ${isDragging ? styles.dragging : ""}`}
          onClick={handleUploadClick}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {previewUrl ? (
            <div className={styles.logoPreview}>
              <img
                src={previewUrl}
                alt="Logo preview"
                className={styles.logoPreviewImage}
              />
              <button
                type="button"
                className={styles.removeButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogoRemove();
                }}
                disabled={isLoading}
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

      {/* Error message */}
      {errors.root && <div className={styles.error}>{errors.root.message}</div>}

      {/* Submit button */}
      <Button
        type="submit"
        disabled={isLoading || !hasChanges}
        className={styles.submitButton}
      >
        {isLoading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
};
