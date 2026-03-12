import type { NextFunction, Request, Response } from "express";
import multer from "multer";

export const customerLogoUpload = multer({
  limits: {
    fileSize: 1 * 1024 * 1024, // 1MB limit
    files: 1, // Only 1 file allowed
    fields: 3, // Max 3 fields (label, delete_logo, logo)
  },
  fileFilter: (_req, file, cb) => {
    // Check file type (no SVG, no GIF)
    const allowedMimeTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      cb(new Error("Invalid file type. Only PNG, JPG, and WebP are allowed."));
      return;
    }

    cb(null, true);
  },
});

export const multerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  customerLogoUpload.single("logo")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({
          success: false,
          code: "FILE_TOO_LARGE",
          msg: "File size must be under 1 MB.",
        });
        return;
      }
      res.status(400).json({
        success: false,
        code: "FILE_UPLOAD_ERROR",
        msg: err.message,
      });
      return;
    } else if (err) {
      res.status(400).json({
        success: false,
        code: "INVALID_FILE_TYPE",
        msg: err.message,
      });
      return;
    }
    next();
  });
};
