import { api, tokenSession } from "./api";
export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
/** Cache files are private to this installation; no token is placed in a URL or shared file. */
export async function shareExport(
  path: string,
  name: string,
  mime: string,
  body?: unknown,
) {
  const token = tokenSession.get();
  const data = await api.binary(path, {
    mime,
    ...(body ? { method: "POST", body } : {}),
  });
  const [{ File, Directory, Paths }, Sharing] = await Promise.all([
    import("expo-file-system"),
    import("expo-sharing"),
  ]);
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("Thiết bị chưa hỗ trợ chia sẻ tệp.");
  if (!token || token !== tokenSession.get())
    throw new Error("Phiên đăng nhập đã thay đổi.");
  const directory = new Directory(Paths.cache, "scanms-exports");
  directory.create({ idempotent: true, intermediates: true });
  const file = new File(directory, name.replace(/[^a-zA-Z0-9_.-]/g, "_"));
  file.write(data);
  if (token !== tokenSession.get()) {
    file.delete();
    throw new Error("Phiên đăng nhập đã thay đổi.");
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: mime,
    dialogTitle: "Lưu hoặc chia sẻ tệp SCANMS",
  });
}
export async function clearPrivateExports(
  stillLoggedOut: () => boolean = () => true,
) {
  try {
    const { Directory, Paths } = await import("expo-file-system");
    const directory = new Directory(Paths.cache, "scanms-exports");
    if (stillLoggedOut() && directory.exists) directory.delete();
  } catch {
    /* Cache cleanup must never keep an expired session signed in. */
  }
}
