import { getEnv } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";

interface ImgBBResponse {
  success?: boolean;
  data?: {
    url?: string;
    display_url?: string;
    delete_url?: string;
  };
  error?: {
    message?: string;
  };
}

/**
 * Uploads an in-memory image buffer to ImgBB using the server-side API key.
 */
export async function uploadToImgBB(
  buffer: Buffer,
  filename?: string
): Promise<{ url: string; deleteUrl?: string }> {
  const { IMGBB_API_KEY } = getEnv();

  const formData = new FormData();
  formData.append("image", buffer.toString("base64"));
  if (filename) {
    formData.append("name", filename);
  }

  let response: Response;
  try {
    response = await fetch(
      `https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMGBB_API_KEY)}`,
      {
        method: "POST",
        body: formData,
      }
    );
  } catch {
    throw new ApiError(502, "Failed to reach image hosting service", "UPLOAD_FAILED");
  }

  const payload = (await response.json().catch(() => null)) as ImgBBResponse | null;

  if (!response.ok || !payload?.success || !payload.data) {
    const reason = payload?.error?.message || "Image upload failed";
    throw new ApiError(502, reason, "UPLOAD_FAILED");
  }

  const url = payload.data.display_url || payload.data.url;
  if (!url) {
    throw new ApiError(502, "Image host did not return a valid URL", "UPLOAD_FAILED");
  }

  return {
    url,
    deleteUrl: payload.data.delete_url,
  };
}
