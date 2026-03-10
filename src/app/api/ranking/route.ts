import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { card_id, username, display_name, avatar, rarity, atk, element, won, ko_win, ultimate_count } = await req.json();
  if (!card_id) return NextResponse.json({ error: "missing card_id" }, { status: 400 });

  const { data: ex } = await supabase.from("card_rankings").select("wins,losses,streak,max_streak,ko_wins,ultimate_count").eq("card_id", card_id).single();

  const wins = (ex?.wins ?? 0) + (won ? 1 : 0);
  const losses = (ex?.losses ?? 0) + (won ? 0 : 1);
  const streak = won ? (ex?.streak ?? 0) + 1 : 0;
  const max_streak = Math.max(ex?.max_streak ?? 0, streak);
  const ko_wins = (ex?.ko_wins ?? 0) + (ko_win ? 1 : 0);
  const ult = (ex?.ultimate_count ?? 0) + (ultimate_count ?? 0);

  await supabase.from("card_rankings").upsert(
    { card_id, username, display_name, avatar, rarity, atk: atk ?? 0, element, wins, losses, streak, max_streak, ko_wins, ultimate_count: ult, updated_at: new Date().toISOString() },
    { onConflict: "card_id" }
  );
  return NextResponse.json({ wins, losses, streak, max_streak });
}

export async function GET() {
  const { data } = await supabase.from("card_rankings")
    .select("card_id,username,display_name,avatar,rarity,atk,element,wins,losses,streak,max_streak,ko_wins,ultimate_count")
    .order("wins", { ascending: false })
    .limit(200);
  return NextResponse.json(data ?? []);
}
