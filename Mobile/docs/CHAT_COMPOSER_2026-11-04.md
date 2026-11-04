# Thanh nhập chat mobile — 04/11/2026

Luồng nghiệp vụ mobile dùng cùng web: cùng tài khoản, phân quyền, hội thoại, API upload và Socket.IO. Chỉ đổi FE cho điện thoại, giữ màu vàng be SCANMS; không thêm CSS hoặc backend riêng.

## Header chat gọn

Header dùng một hàng logo/avatar 38 px, tên đối tác và dòng trạng thái 11 px bên dưới; bỏ nút tên Shop cỡ lớn và badge trạng thái tách riêng. Customer/KOL bấm cụm tên Shop để mở gian hàng như trước; Shop xem tên/avatar khách hoặc KOL đang trao đổi. Tên dài được rút gọn một dòng.

Nhãn **“Chat đã kết nối”** phản ánh kết nối Socket.IO của chính client, không suy ra Shop đang online. Khi mất kết nối, nhãn đổi thành **“Đang kết nối lại…”**. Đã kiểm tra trực quan header trên Android và qua TypeScript/oxlint; component nằm tại `src/features/chat/ChatHeader.tsx`.

## Cách sử dụng

1. Mở hội thoại hiện có trong **Tin nhắn** hoặc từ trang Shop/hợp tác.
2. Thanh dưới cùng gồm **+**, ô nhập nhiều dòng và nút gửi mũi tên.
3. Bấm **+** để mở sheet **Đính kèm**. Chọn **Ảnh và video** hoặc **Tài liệu**; picker hệ điều hành mở theo lựa chọn.
4. Hủy picker: giữ nguyên nội dung và tệp đã chọn trước đó. Chọn thành công: tải lên API, hiện ảnh nhỏ hoặc biểu tượng tệp/tên tệp trong bản nháp. Bấm dấu x để bỏ tệp trước khi gửi.
5. Bấm mũi tên để gửi chữ, tệp hoặc cả hai. Nút gửi bị khóa khi bản nháp rỗng, socket chưa sẵn sàng, đang chọn/tải tệp hoặc đang gửi. Gửi lại bản nháp có kết quả chưa rõ vẫn dùng mã chống trùng hiện có.

Ảnh tối đa 5 MB, tài liệu 20 MB và video 50 MB theo backend. Loại thực tế và nội dung tệp vẫn được server kiểm tra. Upload không tự gửi tin nhắn; chỉ phát `send_message` khi người dùng bấm gửi.

## Cấu trúc

- `src/features/chat/ChatScreen.tsx`: lịch sử, socket, xác nhận gửi, chống gửi trùng.
- `src/features/chat/ChatComposer.tsx`: ô nhập, nút gửi, xem trước/bỏ tệp và khóa gửi trong lúc upload.
- `src/features/chat/AttachmentPicker.tsx`: nút +, sheet lựa chọn và picker/upload hiện có.
- Upload: `POST /chat/conversations/:conversationId/attachments`; Socket.IO: `send_message`.

Không cần migration hoặc thay dữ liệu nghiệp vụ. Phần UI dùng chung cho các role có quyền chat; server tiếp tục kiểm tra thành viên hội thoại. Không thêm công cụ camera/voice chưa được yêu cầu.

## Kiểm tra

- Mobile TypeScript, oxlint: PASS.
- Bộ test mobile hiện có: 61/61 PASS. Không viết test chỉ để so sánh nhãn/bố cục.
- Expo Android JS export: PASS, bundle `entry-caa5d6a3d3e544f73240c18e36b03ca2.hbc`.
- Đã kiểm tra trực quan thanh nhập và menu dấu + trên emulator bằng phiên Customer hiện có. Không gửi tin nhắn/tệp thử tới tài khoản khác để nghiệm thu bố cục.
- Trình chọn tài liệu Android đã mở từ menu mới; kiểm tra hủy chọn, không tạo file upload hoặc tin nhắn.
- Cần nghiệm thu gửi tệp thực tế hai client: nhận ảnh/video/tài liệu, bỏ tệp, sai loại/quá dung lượng, mất mạng và gửi lại sau timeout. Kết quả build hoặc hủy picker không thay thế kiểm tra nhận tệp ở đối tác.

API picker được đối chiếu [Expo SDK 58 ImagePicker](https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/) và [DocumentPicker](https://docs.expo.dev/versions/v58.0.0/sdk/document-picker/); giao diện dùng các component React Native hiện có.
