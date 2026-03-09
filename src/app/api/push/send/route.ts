import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendPush } from '@/lib/webpush';

const MESSAGES = [
  { title: '🎴 TwiGacha', body: 'デイリーミッションがリセット！ / Daily missions reset!', url: '/' },
  { title: '🔥 レイドボス更新 / Raid Boss Updated', body: '新しいレイドボスが出現！ / A new raid boss has appeared!', url: '/battle' },
  { title: '🎰 ガチャタイム / Gacha Time', body: '今日の無料パックを受け取ろう！ / Claim your free packs today!', url: '/' },
  { title: '⚔️ バトル挑戦 / Battle Challenge', body: 'バトルミッションをクリアしてボーナスパックをゲット / Clear battle missions for bonus packs', url: '/battle' },
  { title: '✨ TwiGacha', body: 'レアカードが待っている！ガチャを引こう / Rare cards await — pull the gacha!', url: '/' },
];

const WEEKEND_MESSAGES = [
  { title: '🎉 週末ガチャ / Weekend Gacha', body: '週末は特別な気分でガチャを引こう！ / Enjoy a special weekend gacha!', url: '/' },
  { title: '⚔️ 週末バトル / Weekend Battle', body: '週末は対戦相手が多い！ / More players online this weekend!', url: '/battle' },
];

const HOLIDAY_MESSAGES: Record<string, { title: string; body: string; url: string }> = {
  '01-01': { title: '🎍 謹賀新年 / Happy New Year', body: '新年あけましておめでとう！初ガチャを引こう / Happy New Year! Pull your first gacha!', url: '/' },
  '12-25': { title: '🎄 メリークリスマス / Merry Christmas', body: 'クリスマスプレゼントにレアカードをゲット！ / Get a rare card as your Christmas gift!', url: '/' },
  '02-14': { title: '💝 バレンタイン / Valentine\'s Day', body: '好きなカードにお気に入りを付けよう♪ / Mark your favorite cards with ★', url: '/collection' },
  '10-31': { title: '🎃 ハロウィン / Halloween', body: 'トリック・オア・ガチャ！ / Trick or Gacha!', url: '/' },
};

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data } = await supabase.from('push_subscriptions').select('*');
  if (!data?.length) return NextResponse.json({ sent: 0 });

  // 日付・曜日判定（JST）
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const mmdd = `${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  const dow = now.getUTCDay(); // 0=日, 6=土

  let pool = [...MESSAGES];
  if (HOLIDAY_MESSAGES[mmdd]) pool = [HOLIDAY_MESSAGES[mmdd]]; // 祝日は固定
  else if (dow === 0 || dow === 6) pool = [...pool, ...WEEKEND_MESSAGES]; // 週末は追加

  const msg = pool[Math.floor(Math.random() * pool.length)];

  const results = await Promise.allSettled(
    data.map(row =>
      sendPush(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        msg
      )
    )
  );

  const expired = data.filter((_, i) => results[i].status === 'rejected');
  if (expired.length) {
    await supabase.from('push_subscriptions')
      .delete().in('endpoint', expired.map(r => r.endpoint));
  }

  return NextResponse.json({ sent: results.filter(r => r.status === 'fulfilled').length, msg: msg.title });
}
