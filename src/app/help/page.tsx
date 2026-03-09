"use client";
import Link from "next/link";
import { useT } from "@/hooks/useT";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-xl font-black text-pink-400 mb-3 border-b border-gray-800 pb-2">{title}</h2>
    <div className="space-y-2 text-gray-300 text-sm leading-relaxed">{children}</div>
  </section>
);

const Li = ({ children }: { children: React.ReactNode }) => <li className="ml-4 list-disc">{children}</li>;

export default function HelpPage() {
  const t = useT();
  const s = t.help.sections;
  return (
    <div className="min-h-screen bg-gray-950 text-white py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-gray-400 hover:text-white text-sm">{t.help.back}</Link>
        </div>
        <h1 className="text-3xl font-black mb-1">{t.help.title}</h1>
        <p className="text-gray-500 text-sm mb-8">{t.help.subtitle}</p>

        <Section title={s.gacha.title}>
          <p>{s.gacha.intro}</p>
          <ul className="space-y-1 mt-2">{s.gacha.items.map(i => <Li key={i}>{i}</Li>)}</ul>
        </Section>

        <Section title={s.rarity.title}>
          <p>{s.rarity.intro}</p>
          <ul className="space-y-1 mt-2">
            <Li><span className="text-gray-400 font-bold">C</span></Li>
            <Li><span className="text-blue-400 font-bold">N</span></Li>
            <Li><span className="text-green-400 font-bold">R</span></Li>
            <Li><span className="text-yellow-400 font-bold">SR</span></Li>
            <Li><span className="text-orange-400 font-bold">SSR</span></Li>
            <Li><span className="text-purple-400 font-bold">UR</span></Li>
            <Li><span className="text-pink-400 font-bold">LR</span></Li>
          </ul>
        </Section>

        <Section title={s.pity.title}>
          <p>{s.pity.p1}</p>
          <p>{s.pity.p2}</p>
        </Section>

        <Section title={s.bonusPack.title}>
          <p>{s.bonusPack.p1}</p>
        </Section>

        <Section title={s.rarityEffect.title}>
          <p>{s.rarityEffect.intro}</p>
          <ul className="space-y-1 mt-2">{s.rarityEffect.items.map(i => <Li key={i}>{i}</Li>)}</ul>
        </Section>

        <Section title={s.duplicate.title}>
          <p>{s.duplicate.p1}</p>
        </Section>

        <Section title={s.loginBonus.title}>
          <p>{s.loginBonus.p1}</p>
        </Section>

        <Section title={s.streakBonus.title}>
          <p>{s.streakBonus.p1}</p>
        </Section>

        <Section title={s.stats.title}>
          <ul className="space-y-1">{s.stats.items.map(i => <Li key={i}>{i}</Li>)}</ul>
        </Section>

        <Section title={s.element.title}>
          <p>{s.element.intro}</p>
          <ul className="space-y-1 mt-2">{s.element.items.map(i => <Li key={i}>{i}</Li>)}</ul>
        </Section>

        <Section title={s.daily.title}>
          <p>{s.daily.intro}</p>
          <ul className="space-y-1 mt-2">{s.daily.items.map(i => <Li key={i}>{i}</Li>)}</ul>
        </Section>

        <Section title={s.random.title}>
          <p>{s.random.intro}</p>
          <ul className="space-y-1 mt-2">{s.random.items.map(i => <Li key={i}>{i}</Li>)}</ul>
        </Section>

        <Section title={s.battleCalc.title}>
          <p>{s.battleCalc.intro}</p>
          <ul className="space-y-1 mt-2">{s.battleCalc.items.map(i => <Li key={i}>{i}</Li>)}</ul>
        </Section>

        <Section title={s.passiveSkill.title}>
          <p>{s.passiveSkill.intro}</p>
          <ul className="space-y-1 mt-2">{s.passiveSkill.items.map(i => <Li key={i}>{i}</Li>)}</ul>
        </Section>

        <Section title={s.vsId.title}>
          <p>{s.vsId.p1}</p>
          <p>{s.vsId.p2}</p>
        </Section>

        <Section title={s.raid.title}>
          <p>{s.raid.intro}</p>
          <ul className="space-y-1 mt-2">{s.raid.items.map(i => <Li key={i}>{i}</Li>)}</ul>
        </Section>

        <Section title={s.collection.title}>
          <p>{s.collection.intro}</p>
          <ul className="space-y-1 mt-2">{s.collection.items.map(i => <Li key={i}>{i}</Li>)}</ul>
        </Section>

        <Section title={s.achievements.title}>
          <p>{s.achievements.p1}</p>
          <p>{s.achievements.p2}</p>
        </Section>

        <Section title={s.team.title}>
          <p>{s.team.intro}</p>
          <ul className="space-y-1 mt-2">{s.team.items.map(i => <Li key={i}>{i}</Li>)}</ul>
        </Section>

        <Section title={s.online.title}>
          <p>{s.online.intro}</p>
          <ul className="space-y-1 mt-2">{s.online.items.map(i => <Li key={i}>{i}</Li>)}</ul>
        </Section>

        <Section title={s.teamOnline.title}>
          <p>{s.teamOnline.intro}</p>
          <ul className="space-y-1 mt-2">{s.teamOnline.items.map(i => <Li key={i}>{i}</Li>)}</ul>
        </Section>

        <Section title={s.backup.title}>
          <p>{s.backup.p1}</p>
          <p>{s.backup.p2}</p>
        </Section>

        <Section title={s.gachaStats.title}>
          <p>{s.gachaStats.p1}</p>
        </Section>

        <Section title={s.sound.title}>
          <p>{s.sound.p1}</p>
        </Section>

        <Section title={s.share.title}>
          <p>{s.share.p1}</p>
        </Section>

        <Section title={s.favorites.title}>
          <p>{s.favorites.p1}</p>
        </Section>

        <Section title={s.battleStats.title}>
          <p>{s.battleStats.p1}</p>
        </Section>

        <Section title={s.history.title}>
          <p>{s.history.p1}</p>
        </Section>

        <Section title={s.rarityCalc.title}>
          <p>{s.rarityCalc.intro}</p>
          <ul className="space-y-1 mt-2">{s.rarityCalc.items.map(i => <Li key={i}>{i}</Li>)}</ul>
        </Section>

        <Section title={s.cardView.title}>
          <p>{s.cardView.p1}</p>
        </Section>

        <Section title={s.cardValue.title}>
          <p>{s.cardValue.p1}</p>
        </Section>

        <Section title={s.cardUrl.title}>
          <p>{s.cardUrl.p1}</p>
          <p>{s.cardUrl.p2}</p>
        </Section>

        <Section title={s.push.title}>
          <p>{s.push.p1}</p>
          <p>{s.push.p2}</p>
        </Section>
      </div>
    </div>
  );
}
