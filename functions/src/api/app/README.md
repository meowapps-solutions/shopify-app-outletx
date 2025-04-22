### Sử dụng HTTP status codes chuẩn

- 200 OK: Thành công.
- 201 Created: Tạo mới thành công.
- 204 No Content: Thành công (không có nội dung trả về, ví dụ: DELETE).
- 400 Bad Request: Lỗi cú pháp request.
- 401 Unauthorized: Chưa xác thực.
- 403 Forbidden: Không có quyền truy cập.
- 404 Not Found: Không tìm thấy tài nguyên.
- 422 Unprocessable Entity: Lỗi validation.
- 429 Too Many Requests: Vượt quá giới hạn request.
- 500 Internal Server Error: Lỗi server.


### Response body (cho lỗi) nên có format JSON

```JSON
{
  "error": {
    "code": "invalid_input",  // Mã lỗi cụ thể
    "message": "Invalid rule conditions.", // Thông báo lỗi chi tiết
  }
}
```