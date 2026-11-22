// ブラウザ専用: スマホで撮った大きな写真を、送信用に縮小した JPEG にする。
// （原寸だと数MBになり、サーバーの受信上限を超えたり、読み取りが遅くなったりする）

export type ResizedImage = {
  /** data URL なしの base64 */
  base64: string;
  mimeType: "image/jpeg";
  /** プレビュー用の data URL */
  dataUrl: string;
};

export async function resizeImageFile(
  file: File,
  maxSide = 1600,
  quality = 0.85
): Promise<ResizedImage> {
  // EXIF の向きを反映して読み込む
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("画像を処理できませんでした");
  ctx.fillStyle = "#ffffff"; // 透過PNGの背景を白にする
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return { base64: dataUrl.split(",")[1], mimeType: "image/jpeg", dataUrl };
}
