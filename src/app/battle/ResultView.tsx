"use client";
import TcgCard from "@/components/TcgCard";
import { useT } from "@/hooks/useT";
import { useGameStore } from "@/store/useGameStore";
import type { TwitterCard } from "@/types";
import Confetti from "@/components/Confetti";

interface Props {
  result: { winner: string; pHp: number; eHp: number; turns: number; ko: boolean };
  playerCard: TwitterCard;
  enemyCard: TwitterCard;
  kyu: string;
  log: string[];
  onlineNames: { my: string; opponent: string } | null;
  questStageIdx: number | null;
  questStreak: number;
  autoRepeat: boolean;
  setAutoRepeat: (fn: (v: boolean) => boolean) => void;
  repeatCount: number;
  onRematch: () => void;
  onChangeKyu: () => void;
  onChangeCard: () => void;
  onMenu: () => void;
  onNextEnemy: () => void;
  onBackToQuest: () => void;
  onRetry: () => void;
}

function HpBar({ current, max, isWin }: { current: number; max: number; isWin: boolean }) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">HP</span><span className={isWin ? "text-green-400" : "text-red-400"}>{current} / {max}</span></div>
      <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${isWin ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${Math.max(0, current / max * 100)}%` }} />
      </div>
    </div>
  );
}

export function ResultView({ result, playerCard, enemyCard, kyu, log, onlineNames, questStageIdx, questStreak, autoRepeat, setAutoRepeat, repeatCount, onRematch, onChangeKyu, onChangeCard, onMenu, onNextEnemy, onBackToQuest, onRetry }: Props) {
  const t = useT();
  const { battleHistory, questCleared, questBestStreak, markShare } = useGameStore();
  const q = t.battle.quest;
  const win = result.winner === "player";
  const questStage = questStageIdx !== null ? q.stages[questStageIdx] : null;
  const isQuestEndless = questStage?.wins === 0;
  const questCleared2 = !!(questStage && questStage.wins > 0 && questStreak >= questStage.wins);

  const KYU_ORDER = ["C","N","R","SR","SSR","UR","LR"];
  let curStreak = 0;
  for (let i = battleHistory.length - 1; i >= 0; i--) {
    const b = battleHistory[i];
    const kyuIdx = KYU_ORDER.indexOf(b.kyu);
    const rarityIdx = KYU_ORDER.indexOf(b.playerCardRarity ?? "C");
    if (b.winner === "player" && kyuIdx >= rarityIdx && KYU_ORDER.indexOf(b.enemyCardRarity ?? "C") >= rarityIdx && b.opponentName !== battleHistory[i-1]?.opponentName && (b.mode === "random" || b.mode === "team")) curStreak++;
    else break;
  }
  const streakBonusTriggered = win && curStreak > 0 && curStreak % 3 === 0;
  const copyText = t.battle.result.copyText(playerCard.displayName, enemyCard.displayName, win, kyu, result.ko, result.turns, result.pHp, playerCard.hp, result.eHp, enemyCard.hp, playerCard.atk, playerCard.def, enemyCard.atk, enemyCard.def);
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(copyText)}&url=${encodeURIComponent("https://twigacha.vercel.app")}`;

  return (
    <>
      {win && <Confetti />}
      <div className="min-h-dvh bg-gray-950 text-white flex flex-col items-center gap-6 px-4 py-10 slide-in-up">
        <div className={`text-3xl sm:text-5xl font-black ${win ? "text-yellow-400" : "text-red-400"}`}>
          {win ? `🏆 ${t.battle.result.win}！` : `💀 ${t.battle.result.lose}`}
        </div>
        {questStage && (
          <div className="text-center">
            <p className="text-yellow-400 font-bold">{questStage.title}</p>
            {win && !questCleared2 && <p className="text-green-400 text-sm">{questStreak}連勝中{questStage.wins > 0 ? ` (あと${questStage.wins - questStreak}勝)` : ""}</p>}
            {win && questCleared2 && <p className="text-yellow-400 font-bold animate-pulse">✅ クリア！ +{questStage.reward}パック</p>}
            {!win && isQuestEndless && <p className="text-gray-400 text-sm">{questStreak}連勝 / 最高{questBestStreak}連勝</p>}
          </div>
        )}
        {!questStage && streakBonusTriggered && (
          <div className="bg-orange-500/20 border border-orange-400/50 rounded-xl px-4 py-2 text-orange-300 font-bold text-sm animate-pulse">
            {t.battle.streakBonus(curStreak)}
          </div>
        )}
        <div className="flex gap-4 sm:gap-8 flex-wrap justify-center items-start">
          <div className="flex flex-col items-center gap-2 w-52 sm:w-64">
            <span className="text-sm text-blue-400 font-bold">{onlineNames?.my || playerCard.displayName}</span>
            <TcgCard card={playerCard} size="lg" />
            <HpBar current={result.pHp} max={playerCard.hp} isWin={win} />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-gray-600 sm:mt-20">VS</div>
          <div className="flex flex-col items-center gap-2 w-52 sm:w-64">
            <span className="text-sm text-red-400 font-bold">{onlineNames?.opponent ?? enemyCard.displayName}</span>
            <TcgCard card={enemyCard} size="lg" />
            <HpBar current={result.eHp} max={enemyCard.hp} isWin={!win} />
          </div>
        </div>
        <div className="bg-gray-800/80 rounded-2xl p-4 w-full max-w-2xl space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-400">{t.battle.result.win}/{t.battle.result.lose}</span><span className={`font-bold ${win ? "text-yellow-400" : "text-red-400"}`}>{win ? t.battle.result.win : t.battle.result.lose}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">{t.battle.result.decision}</span><span className="font-bold">{result.ko ? t.battle.result.ko : t.battle.result.timeout}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">{t.battle.result.turns}</span><span className="font-bold">{result.turns}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">{t.battle.result.kyu}</span><span className="font-bold">{enemyCard.rarity}</span></div>
          <div className="flex justify-between text-xs"><span className="text-gray-400">{t.battle.result.remainHp}</span><span className="font-bold">{playerCard.displayName} {result.pHp}/{playerCard.hp} | {enemyCard.displayName} {result.eHp}/{enemyCard.hp}</span></div>
        </div>
        {log.length > 0 && (
          <details className="w-full max-w-2xl bg-gray-800/80 rounded-2xl p-4">
            <summary className="cursor-pointer text-sm text-gray-400 hover:text-white">{t.battle.result.battleLog(log.length)}</summary>
            <div className="mt-3 space-y-1 max-h-60 overflow-y-auto text-xs text-gray-300 font-mono">
              {log.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          </details>
        )}
        {questStage ? (
          <div className="flex gap-3 flex-wrap justify-center w-full max-w-2xl">
            {win && !questCleared2 && <button onClick={onNextEnemy} className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-bold hover:opacity-90 transition">次の敵へ</button>}
            <button onClick={onRetry} className="px-6 py-3 bg-gray-700 rounded-xl font-bold hover:bg-gray-600 transition">{win ? t.battle.result.changeCard : "再挑戦"}</button>
            <button onClick={onBackToQuest} className="px-6 py-3 bg-gray-800 rounded-xl font-bold hover:bg-gray-700 transition text-gray-400">{q.back}</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 w-full max-w-2xl">
              <button onClick={() => setAutoRepeat(v => !v)} className={`flex-1 py-2 rounded-xl font-bold text-sm transition ${autoRepeat ? "bg-yellow-500 text-black" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
                {autoRepeat ? t.battle.autoRepeatOn : t.battle.autoRepeatOff}
              </button>
              {repeatCount > 0 && <span className="text-gray-400 text-sm">{t.battle.autoRepeatCount(repeatCount)}</span>}
            </div>
            <div className="grid grid-cols-4 gap-2 w-full max-w-2xl">
              <button onClick={() => navigator.clipboard.writeText(copyText)} className="px-3 py-2 text-sm bg-blue-700 rounded-xl font-bold hover:bg-blue-600 transition">{t.battle.result.copyBtn}</button>
              <button onClick={() => { window.open(shareUrl, "_blank"); markShare(); }} className="px-3 py-2 text-sm bg-sky-600 rounded-xl font-bold hover:bg-sky-500 transition">{t.battle.result.shareBtn}</button>
              <button onClick={() => { window.open(`https://bsky.app/intent/compose?text=${encodeURIComponent(copyText)}`, "_blank"); markShare(); }} className="px-3 py-2 text-sm bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition">Bluesky</button>
              <button onClick={() => { window.open(`https://misskeyshare.link/share.html?text=${encodeURIComponent(copyText)}&url=${encodeURIComponent("https://twigacha.vercel.app")}`, "_blank"); markShare(); }} className="px-3 py-2 text-sm bg-cyan-600 rounded-xl font-bold hover:bg-cyan-500 transition">Misskey</button>
              <button onClick={onRematch} className="px-3 py-2 text-sm bg-green-700 rounded-xl font-bold hover:bg-green-600 transition">{t.battle.result.rematch}</button>
              <button onClick={onChangeKyu} className="px-3 py-2 text-sm bg-green-700 rounded-xl font-bold hover:bg-green-600 transition">{t.battle.result.sameKyu}</button>
              <button onClick={onChangeKyu} className="px-3 py-2 text-sm bg-green-700 rounded-xl font-bold hover:bg-green-600 transition">{t.battle.result.sameKyuNewCard}</button>
              <div />
              <button onClick={onChangeKyu} className="px-3 py-2 text-sm bg-gray-600 rounded-xl font-bold hover:bg-gray-500 transition">{t.battle.result.changeKyu}</button>
              <button onClick={onChangeCard} className="px-3 py-2 text-sm bg-gray-600 rounded-xl font-bold hover:bg-gray-500 transition">{t.battle.result.changeCard}</button>
              <button onClick={onMenu} className="px-3 py-2 text-sm bg-gray-800 rounded-xl font-bold hover:bg-gray-700 transition text-gray-400">{t.battle.result.menu}</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
