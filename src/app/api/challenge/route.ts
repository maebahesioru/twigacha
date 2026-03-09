import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { simulateBattle, simulateTeamBattle } from '@/lib/battle';
import type { TwitterCard } from '@/types';
import { rateLimit, getIp } from '@/lib/rateLimit';

const str = (v: unknown, max = 100) => typeof v === 'string' ? v.slice(0, max) : '';
const id32 = (v: unknown) => str(v, 32).replace(/[^a-zA-Z0-9_-]/g, '');

const STAT_MAX = 9999;
function clampCard(c: TwitterCard): TwitterCard {
  const s = (v: unknown) => Math.min(Math.max(0, Math.round(Number(v) || 0)), STAT_MAX);
  return { ...c, atk: s(c.atk), def: s(c.def), spd: s(c.spd), hp: s(c.hp), int: s(c.int), luk: s(c.luk) };
}
function sanitize(card: unknown): TwitterCard { return clampCard(card as TwitterCard); }
function sanitizeTeam(team: unknown): TwitterCard[] { return (Array.isArray(team) ? team : []).slice(0, 5).map(sanitize); }

// POST /api/challenge  { action: 'create', hostId, hostCard }
//                      { action: 'join',   id, guestId, guestCard }
//                      { action: 'matchmake', playerId, card }
//                      { action: 'team_create', hostId, hostTeam }
//                      { action: 'team_join',   id, guestId, guestTeam }
//                      { action: 'team_matchmake', playerId, team }
// GET  /api/challenge?id=xxx
async function cleanup() {
  const hour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const tenMin = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await Promise.all([
    supabase.from('challenges').delete().lt('created_at', hour),
    supabase.from('matchmaking').delete().lt('created_at', tenMin),
  ]);
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    // 同接数（未マッチのキュー数）を返す
    const { count } = await supabase.from('matchmaking').select('*', { count: 'exact', head: true }).eq('matched', false);
    return NextResponse.json({ online: count ?? 0 });
  }
  const { data, error } = await supabase.from('challenges').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!rateLimit(getIp(req), 60, 60_000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  cleanup(); // fire and forget
  const body = await req.json();
  // sanitize string fields
  body.hostId = id32(body.hostId);
  body.guestId = id32(body.guestId);
  body.playerId = id32(body.playerId);
  body.id = str(body.id, 10).toUpperCase();
  body.name = str(body.name, 30);
  body.queueId = str(body.queueId, 40);

  if (body.action === 'team_create') {
    const id = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { error } = await supabase.from('challenges').insert({
      id, host_id: body.hostId, host_card: sanitizeTeam(body.hostTeam), host_name: body.name ?? '',
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id });
  }

  if (body.action === 'team_join') {
    const { data, error } = await supabase.from('challenges').select('*').eq('id', body.id).single();
    if (error || !data) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (data.result) return NextResponse.json({ error: 'already finished' }, { status: 400 });
    if (data.guest_id) return NextResponse.json({ error: 'already joined' }, { status: 400 });
    const guestTeam = sanitizeTeam(body.guestTeam);
    const result = simulateTeamBattle(data.host_card as TwitterCard[], guestTeam);
    await supabase.from('challenges').update({ guest_id: body.guestId, guest_card: guestTeam, guest_name: body.name ?? '', result }).eq('id', body.id);
    return NextResponse.json({ result, hostTeam: data.host_card, hostName: data.host_name, guestName: body.name ?? '' });
  }

  if (body.action === 'team_matchmake') {
    const { playerId, name } = body;
    const team = sanitizeTeam(body.team);
    const { data: waiting } = await supabase.from('matchmaking').select('*').eq('matched', false).neq('player_id', playerId).order('created_at', { ascending: true }).limit(1);
    if (waiting && waiting.length > 0) {
      const opponent = waiting[0];
      const result = simulateTeamBattle(opponent.card as TwitterCard[], team);
      const id = Math.random().toString(36).slice(2, 8).toUpperCase();
      await supabase.from('challenges').insert({ id, host_id: opponent.player_id, host_card: opponent.card, host_name: opponent.player_name ?? '', guest_id: playerId, guest_card: team, guest_name: name ?? '', result });
      await supabase.from('matchmaking').update({ matched: true, challenge_id: id }).eq('id', opponent.id);
      return NextResponse.json({ matched: true, challengeId: id, result, hostTeam: opponent.card, hostName: opponent.player_name ?? '', guestName: name ?? '', isHost: false });
    }
    await supabase.from('matchmaking').delete().eq('player_id', playerId);
    const { data: entry } = await supabase.from('matchmaking').insert({ player_id: playerId, card: team, player_name: name ?? '' }).select().single();
    return NextResponse.json({ matched: false, queueId: entry?.id });
  }

  if (body.action === 'matchmake') {
    const { playerId, name } = body;
    const card = sanitize(body.card);
    const { data: waiting } = await supabase.from('matchmaking').select('*').eq('matched', false).neq('player_id', playerId).order('created_at', { ascending: true }).limit(1);
    if (waiting && waiting.length > 0) {
      const opponent = waiting[0];
      const result = simulateBattle(opponent.card as TwitterCard, card);
      const id = Math.random().toString(36).slice(2, 8).toUpperCase();
      await supabase.from('challenges').insert({ id, host_id: opponent.player_id, host_card: opponent.card, host_name: opponent.player_name ?? '', guest_id: playerId, guest_card: card, guest_name: name ?? '', result });
      await supabase.from('matchmaking').update({ matched: true, challenge_id: id }).eq('id', opponent.id);
      return NextResponse.json({ matched: true, challengeId: id, result, hostCard: opponent.card, hostName: opponent.player_name ?? '', guestName: name ?? '', isHost: false });
    }
    await supabase.from('matchmaking').delete().eq('player_id', playerId);
    const { data: entry } = await supabase.from('matchmaking').insert({ player_id: playerId, card, player_name: name ?? '' }).select().single();
    return NextResponse.json({ matched: false, queueId: entry?.id });
  }

  if (body.action === 'matchmake_poll') {
    // キューエントリが matched になったか確認
    const { data } = await supabase.from('matchmaking').select('*').eq('id', body.queueId).single();
    if (!data) return NextResponse.json({ cancelled: true });
    if (data.matched && data.challenge_id) {
      const { data: challenge } = await supabase.from('challenges').select('*').eq('id', data.challenge_id).single();
      await supabase.from('matchmaking').delete().eq('id', body.queueId);
      return NextResponse.json({ matched: true, challengeId: data.challenge_id, result: challenge?.result, hostCard: challenge?.host_card, guestCard: challenge?.guest_card, hostName: challenge?.host_name, guestName: challenge?.guest_name, isHost: true });
    }
    return NextResponse.json({ matched: false });
  }

  if (body.action === 'matchmake_cancel') {
    await supabase.from('matchmaking').delete().eq('id', body.queueId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'create') {
    const id = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { error } = await supabase.from('challenges').insert({
      id, host_id: body.hostId, host_card: sanitize(body.hostCard), host_name: body.name ?? '',
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id });
  }

  if (body.action === 'join') {
    const { data, error } = await supabase.from('challenges').select('*').eq('id', body.id).single();
    if (error || !data) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (data.result) return NextResponse.json({ error: 'already finished' }, { status: 400 });
    if (data.guest_id) return NextResponse.json({ error: 'already joined' }, { status: 400 });
    const guestCard = sanitize(body.guestCard);
    const result = simulateBattle(data.host_card as TwitterCard, guestCard);
    const { error: upErr } = await supabase.from('challenges').update({
      guest_id: body.guestId, guest_card: guestCard, guest_name: body.name ?? '', result,
    }).eq('id', body.id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    return NextResponse.json({ result, hostCard: data.host_card, hostName: data.host_name, guestName: body.name ?? '' });
  }

  return NextResponse.json({ error: 'invalid action' }, { status: 400 });
}
