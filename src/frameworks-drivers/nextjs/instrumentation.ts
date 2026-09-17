/**
 * Next.js サーバーインスタンスの初期化時に、業務タイムゾーンを固定する。
 * ホスティング基盤が package scripts を経由しない場合も Date の暦日計算を安定させる。
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.env.TZ = "Asia/Tokyo";
  }
}
