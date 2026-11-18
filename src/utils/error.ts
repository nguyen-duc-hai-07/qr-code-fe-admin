import { AxiosError } from 'axios';

interface BackendErrorData {
  status?: number;
  message?: string;
  data?: {
    code?: string;
    message?: string;
  };
}

/**
 * Trả về thông báo lỗi 100% bằng Tiếng Việt chuẩn cho người dùng.
 * Xử lý mọi tình huống: lỗi mạng, lỗi HTTP status, lỗi backend trả về hoặc lỗi logic ném ra.
 */
export function getErrorMessage(err: unknown, defaultMessage = 'Đã có lỗi xảy ra, vui lòng thử lại sau!'): string {
  if (!err) return defaultMessage;

  // 1. Kiểm tra nếu là AxiosError hoặc đối tượng có response
  const axiosError = err as AxiosError<BackendErrorData>;
  if (axiosError?.isAxiosError || (err as Record<string, unknown>)?.response) {
    if (!axiosError.response) {
      if (axiosError.code === 'ERR_NETWORK') {
        return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau!';
      }
      return 'Không nhận được phản hồi từ hệ thống, vui lòng thử lại sau ít phút!';
    }

    const { status, data } = axiosError.response;

    // Ưu tiên thông báo từ backend nếu hợp lệ và không phải chuỗi tiếng Anh mặc định của Axios
    const rawMsg = data?.message || data?.data?.message;
    if (rawMsg && typeof rawMsg === 'string' && rawMsg.trim() !== '') {
      const lower = rawMsg.toLowerCase();
      // Nếu message chứa các từ tiếng anh mặc định, dịch sang tiếng Việt
      if (lower === 'unauthorized' || lower.includes('status code 401')) {
        return 'Tên đăng nhập hoặc mật khẩu không chính xác!';
      }
      if (lower === 'forbidden' || lower.includes('status code 403') || lower.includes('access denied')) {
        return 'Bạn không có quyền thực hiện thao tác này!';
      }
      if (lower === 'not found' || lower.includes('status code 404')) {
        return 'Không tìm thấy dữ liệu yêu cầu!';
      }
      if (lower.includes('status code 500') || lower.includes('internal server error')) {
        return 'Hệ thống máy chủ đang gặp sự cố, vui lòng thử lại sau!';
      }
      return rawMsg;
    }

    // Mapping các HTTP status code sang tiếng Việt
    switch (status) {
      case 400:
        return 'Thông tin yêu cầu không hợp lệ, vui lòng kiểm tra lại!';
      case 401:
        return 'Tên đăng nhập hoặc mật khẩu không chính xác!';
      case 403:
        return 'Bạn không có quyền thực hiện thao tác này!';
      case 404:
        return 'Đường dẫn hoặc dữ liệu không tồn tại!';
      case 409:
        return 'Dữ liệu này đã tồn tại trong hệ thống, vui lòng thử lại!';
      case 500:
      case 502:
      case 503:
        return 'Hệ thống máy chủ đang bận, vui lòng thử lại sau ít phút!';
      default:
        return defaultMessage;
    }
  }

  // 2. Custom Exception / Javascript Error (ví dụ: throw new Error("..."))
  if (err instanceof Error) {
    const msg = err.message;
    // Bỏ qua các chuỗi mặc định tiếng Anh của Axios
    if (msg.includes('status code') || msg.includes('Network Error')) {
      return defaultMessage;
    }
    return msg;
  }

  if (typeof err === 'string') return err;
  return defaultMessage;
}
