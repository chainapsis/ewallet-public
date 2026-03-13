import type {
  CreateCustomerResponse,
  CreateCustomerWithDashboardUserRequest,
} from "@oko-wallet/oko-types/admin";
import type { OkoApiSuccessResponse } from "@oko-wallet/oko-types/api_response";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { addCustomer } from "@oko-wallet-admin/fetch/customer";
import { useAppState } from "@oko-wallet-admin/state";
import { isValidEmail, isValidUrl } from "@oko-wallet-admin/utils/";

export function useCreateCustomerForm() {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateCustomerWithDashboardUserRequest>();
  const { token } = useAppState();

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
      alert(
        "Only PNG, JPG, JPEG, and WebP files are allowed. SVG and GIF are not supported.",
      );
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      alert("File size must be less than 1MB.");
      return;
    }

    const isValidDimensions = await validateImageDimensions(file);
    if (!isValidDimensions) {
      alert("Image must be exactly 128×128 pixels.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setLogoFile(file);
  };

  const handleLogoRemove = (
    fileInputRef?: React.RefObject<HTMLInputElement | null>,
  ) => {
    setLogoPreview(null);
    setLogoFile(null);
    if (fileInputRef?.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleLogoUpload(files[0]);
    }
  };

  const mutation = useMutation<
    OkoApiSuccessResponse<CreateCustomerResponse> | undefined,
    any,
    CreateCustomerWithDashboardUserRequest
  >({
    mutationFn: async (data) => {
      if (!token) {
        throw new Error("Please log in to continue.");
      }

      if (!data.label) {
        setError("label", {
          message: "Team Name is required.",
        });
        return;
      }

      if (data.url && !/^(https?:\/\/)/i.test(data.url)) {
        data.url = `https://${data.url}`;
      }

      if (!data.url) {
        setError("url", {
          message: "App URL must exist.",
        });
        return;
      }

      if (!isValidUrl(data.url)) {
        setError("url", {
          message: "App URL format is invalid.",
        });
        return;
      }

      if (!isValidEmail(data.email)) {
        setError("email", {
          message: "Email format is invalid.",
        });
      }

      if (Object.keys(errors).length > 0) {
        return;
      }

      const body = {
        label: data.label,
        url: data.url,
        logo: logoFile || undefined,
        email: data.email,
      };

      const response = await addCustomer({ token, data: body });

      if (!response.success) {
        throw new Error(response.msg ?? "Failed to create customer.");
      }

      return {
        success: true,
        data: response.data,
      };
    },
  });

  return {
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
  };
}
