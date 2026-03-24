import type { Customer } from "@oko-wallet/oko-types/customers";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type DragEvent, useRef, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";

import { requestUpdateCustomerInfo } from "@oko-wallet-ct-dashboard/fetch/customers";
import { useCustomerInfo } from "@oko-wallet-ct-dashboard/hooks/use_customer_info";
import { useAppState } from "@oko-wallet-ct-dashboard/state";

const ONE_MB = 1 * 1024 * 1024;

export type EditInfoInputs = {
  label: string;
  url: string;
};

interface FormHasChangesArgs {
  label: string;
  url: string;
  logoFile: File | null;
  shouldDeleteLogo: boolean;
  customer: Customer | null | undefined;
}

function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "https:" || urlObj.protocol === "http:";
  } catch {
    return false;
  }
}

function editInfoResolver(values: EditInfoInputs) {
  const errors: Record<string, any> = {};

  if (!values.url || values.url.trim() === "") {
    errors.url = { type: "required", message: "App URL is required" };
  } else if (!validateUrl(values.url)) {
    errors.url = { type: "pattern", message: "App URL format is invalid" };
  }

  return {
    values: values,
    errors: errors,
  } as any;
}

function formHasChanges({
  label,
  url,
  logoFile,
  shouldDeleteLogo,
  customer,
}: FormHasChangesArgs) {
  return (
    label !== customer?.label ||
    url !== (customer?.url ?? "") ||
    logoFile !== null ||
    shouldDeleteLogo
  );
}

export function useEditInfoForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const customer = useCustomerInfo();
  const token = useAppState((state) => state.token);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    clearErrors,
    formState: { errors, isValid },
  } = useForm<EditInfoInputs>({
    resolver: editInfoResolver,
    mode: "onTouched",
    defaultValues: {
      label: customer.data?.label ?? "",
      url: customer.data?.url ?? "",
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    customer.data?.logo_url ?? null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [shouldDeleteLogo, setShouldDeleteLogo] = useState(false);

  const label = watch("label");
  const url = watch("url");

  const hasChanges = formHasChanges({
    label,
    url,
    logoFile,
    shouldDeleteLogo,
    customer: customer.data,
  });

  const validateImageDimensions = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve(img.width === 128 && img.height === 128);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        resolve(false);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleLogoUpload = async (file: File) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("root", {
        message:
          "Only PNG, JPG, and WebP image files are allowed. SVG and GIF are not supported.",
      });
      return;
    }

    if (file.size > ONE_MB) {
      setError("root", { message: "File size must be under 1 MB." });
      return;
    }

    const isValidDimensions = await validateImageDimensions(file);
    if (!isValidDimensions) {
      setError("root", { message: "Image must be exactly 128×128 pixels." });
      return;
    }

    clearErrors("root");
    setShouldDeleteLogo(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setLogoFile(file);
  };

  const handleLogoRemove = () => {
    setPreviewUrl(null);
    setLogoFile(null);
    setShouldDeleteLogo(true);
    clearErrors("root");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoUpload(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleLogoUpload(file);
    }
  };

  const onSubmit: SubmitHandler<EditInfoInputs> = async (data) => {
    if (!token) {
      setError("root", { message: "Please log in to continue." });
      return;
    }

    const hasLabelChange = data.label !== customer.data?.label;
    const hasUrlChange = data.url !== (customer.data?.url ?? "");
    const hasLogoChange = logoFile !== null || shouldDeleteLogo;

    if (!hasLabelChange && !hasUrlChange && !hasLogoChange) {
      setError("root", { message: "No changes to save." });
      return;
    }

    setIsLoading(true);
    clearErrors("root");

    try {
      const result = await requestUpdateCustomerInfo({
        token,
        label: hasLabelChange ? data.label : undefined,
        url: hasUrlChange ? data.url : undefined,
        logoFile: logoFile,
        deleteLogo: shouldDeleteLogo,
      });

      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["customer"] });
        setLogoFile(null);
        alert("Information updated successfully!");
        router.back();
      } else {
        setError("root", {
          message: result.msg ?? "Failed to update information.",
        });
      }
    } catch (_err: any) {
      setError("root", { message: "An error occurred while updating." });
    } finally {
      setIsLoading(false);
    }
  };

  const resetErrors = (field?: keyof EditInfoInputs) => {
    clearErrors("root");
    if (field) {
      clearErrors(field);
    }
  };

  return {
    onSubmit: handleSubmit(onSubmit),
    register,
    errors,
    isLoading,
    isValid,
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
  };
}
