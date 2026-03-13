"use client";
import React from "react";
import { useT } from "@/hooks/useT";
import { useGameStore } from "@/store/useGameStore";
import type { TwitterCard } from "@/types";
import { isBirthday } from "@/lib/card";

const RARITY_ORDER = ["C","N","R","SR","SSR","UR","LR"];
const ELEMENTS = ["🔥","💧","🌿","⚡","✨","🌑","🌙","❄️"];

export function getStageFilters(collection: TwitterCard[], favorites: string[], questCleared: number[]): ((c: TwitterCard) => boolean)[] {
  return [
    c => c.rarity === "C", // 1
    c => RARITY_ORDER.indexOf(c.rarity) <= 1, // 2
    c => /\d/.test(c.username + c.displayName), // 3
    c => c.element === "🔥", // 4
    c => RARITY_ORDER.indexOf(c.rarity) <= 3, // 5
    c => c.element === "🔥", // 6
    c => c.element === "💧", // 7
    c => c.element === "🌿", // 8
    c => c.element === "⚡", // 9
    c => c.element === "✨", // 10
    c => c.element === "🌑", // 11
    c => c.element === "🌙", // 12
    c => c.element === "❄️", // 13
    c => c.rarity === "UR", // 14
    c => c.rarity === "LR", // 15
    c => ["SSR","UR","LR"].includes(c.rarity), // 16
    c => c.displayName.includes("猫") || c.username.toLowerCase().includes("cat"), // 17
    c => /w/i.test(c.displayName + c.username), // 18
    c => c.username.length <= 8, // 19
    c => /\p{Emoji}/u.test(c.displayName), // 20
    c => c.username.length >= 15, // 21
    c => /[\u3040-\u30ff\u4e00-\u9fff]/.test(c.displayName), // 22
    c => /^[a-zA-Z]+$/.test(c.username), // 23
    c => (c.username.match(/\d/g) ?? []).length >= 3, // 24
    c => c.username.includes("_"), // 25
    c => c.username.length === 5, // 26
    c => { const top = [...collection].sort((a,b) => b.atk-a.atk).slice(0,5).map(x=>x.id); return top.includes(c.id); }, // 27
    c => c.hp >= 1000, // 28
    c => c.luk >= 500, // 29
    c => c.spd >= 500, // 30
    c => c.int >= 500, // 31
    c => c.def <= 300, // 32
    c => c.atk <= 200, // 33
    c => c.luk <= 100, // 34
    c => c.int <= 100, // 35
    c => c.def >= 600, // 36
    c => favorites.includes(c.id), // 37
    c => isBirthday(c.joined), // 38
    c => (c.enhance ?? 0) > 0, // 39
    c => !c.enhance || c.enhance === 0, // 40
    c => !favorites.includes(c.id), // 41
    c => c.followers >= c.following * 2, // 42
    c => Math.abs(c.followers - c.following) <= 100, // 43
    c => c.followers <= 100, // 44
    c => c.followers >= 10000, // 45
    c => c.followers >= 1000000, // 46
    c => c.tweets >= 1000, // 47
    c => c.tweets <= 100, // 48
    c => c.following >= 1000, // 49
    c => c.followers > c.tweets, // 50
    c => c.tweets > c.followers, // 51
    () => { const h = new Date().getHours(); return h >= 6 && h < 9; }, // 52
    () => { const h = new Date().getHours(); return h >= 12 && h < 13; }, // 53
    () => { const h = new Date().getHours(); return h >= 22 || h < 4; }, // 54
    () => { const h = new Date().getHours(); return h >= 0 && h < 3; }, // 55
    () => { const h = new Date().getHours(); return h >= 17 && h < 19; }, // 56
    () => { const h = new Date().getHours(); return h >= 7 && h < 9; }, // 57
    () => { const h = new Date().getHours(); return h >= 20 && h < 22; }, // 58
    () => new Date().getDay() === 1, // 59
    () => new Date().getDay() === 2, // 60
    () => new Date().getDay() === 3, // 61
    () => new Date().getDay() === 4, // 62
    () => new Date().getDay() === 5, // 63
    () => { const d = new Date().getDay(); return d === 0 || d === 6; }, // 64
    () => new Date().getDay() === 0, // 65
    () => collection.length >= 50, // 66
    () => collection.length >= 100, // 67
    () => collection.length >= 108, // 68
    () => collection.length >= 150, // 69
    () => collection.length >= 200, // 70
    c => c.verified === true, // 71
    c => !c.bio || c.bio.trim() === "", // 72
    c => c.username.includes(".") || c.id.startsWith("bsky_"), // 73
    c => Date.now() - c.pulledAt < 86400000, // 74
    c => { const seed = new Date().toDateString().split("").reduce((a,b)=>a+b.charCodeAt(0),0)%5; if(seed===0)return c.rarity==="R"||c.rarity==="SR"; if(seed===1)return c.followers%2===0; if(seed===2)return c.username.length%2===0; if(seed===3)return ELEMENTS.indexOf(c.element)%2===0; return c.tweets%2===0; }, // 75
    c => { const n=c.followers; if(n<2)return false; for(let i=2;i<=Math.sqrt(n);i++)if(n%i===0)return false; return true; }, // 76
    c => { const n=c.spd; if(n<2)return false; for(let i=2;i<=Math.sqrt(n);i++)if(n%i===0)return false; return true; }, // 77
    c => c.atk % 2 === 1, // 78
    c => c.hp % 2 === 0, // 79
    c => c.spd % 3 === 0, // 80
    c => c.spd >= 400 && c.atk >= 400, // 81
    c => c.hp >= 1500 && c.def <= 200, // 82
    c => { const stats=[c.atk,c.def,c.spd,c.hp,c.int,c.luk]; return Math.max(...stats)-Math.min(...stats)<=200; }, // 83
    c => c.followers >= 1000 && c.tweets <= 100, // 84
    c => c.followers <= 100 && c.tweets >= 1000, // 85
    c => { const max=Math.max(...collection.map(x=>x.atk)); return c.atk===max; }, // 86
    c => { const total=(x:TwitterCard)=>x.atk+x.def+x.spd+x.hp+x.int+x.luk; const max=Math.max(...collection.map(total)); return total(c)===max; }, // 87
    c => { const min=Math.min(...collection.map(x=>x.atk)); return c.atk===min; }, // 88
    c => { const total=(x:TwitterCard)=>x.atk+x.def+x.spd+x.hp+x.int+x.luk; const min=Math.min(...collection.map(total)); return total(c)===min; }, // 89
    c => { const max=Math.max(...collection.map(x=>x.atk+x.def)); return c.atk+c.def===max; }, // 90
    () => true, // 91
    () => true, // 92
    c => { const r=[...collection].sort((a,b)=>b.pulledAt-a.pulledAt).slice(0,10).map(x=>x.id); return r.includes(c.id); }, // 93
    c => { const r=[...collection].sort((a,b)=>a.pulledAt-b.pulledAt).slice(0,10).map(x=>x.id); return r.includes(c.id); }, // 94
    c => { const s=c.username.toLowerCase().replace(/[^a-z0-9]/g,""); return s.length>=2&&s===s.split("").reverse().join(""); }, // 95
    c => { const bot=[...collection].sort((a,b)=>a.atk-b.atk).slice(0,5).map(x=>x.id); return bot.includes(c.id); }, // 96
    c => c.atk>=300&&c.def>=300&&c.spd>=300&&c.hp>=300&&c.int>=300&&c.luk>=300, // 97
    c => { const sorted=[...collection].sort((a,b)=>a.pulledAt-b.pulledAt); const idx=sorted.findIndex(x=>x.id===c.id); return idx>=93&&idx<=103; }, // 98
    c => { const total=(x:TwitterCard)=>x.atk+x.def+x.spd+x.hp+x.int+x.luk; const max=Math.max(...collection.map(total)); return total(c)===max; }, // 99
    c => c.atk>=500&&c.def>=500&&c.spd>=500&&c.hp>=500&&c.int>=500&&c.luk>=500, // 100
    c => c.username.toLowerCase().startsWith("a"), // 101
    c => c.username.toLowerCase().startsWith("b"), // 102
    c => c.username.toLowerCase().startsWith("c"), // 103
    c => c.username.toLowerCase().startsWith("d"), // 104
    c => c.username.toLowerCase().startsWith("e"), // 105
    c => c.username.toLowerCase().startsWith("f"), // 106
    c => c.username.toLowerCase().startsWith("g"), // 107
    c => c.username.toLowerCase().startsWith("h"), // 108
    c => c.username.toLowerCase().startsWith("i"), // 109
    c => c.username.toLowerCase().startsWith("j"), // 110
    c => c.username.toLowerCase().startsWith("k"), // 111
    c => c.username.toLowerCase().startsWith("l"), // 112
    c => c.username.toLowerCase().startsWith("m"), // 113
    c => c.username.toLowerCase().startsWith("n"), // 114
    c => c.username.toLowerCase().startsWith("o"), // 115
    c => c.username.toLowerCase().startsWith("p"), // 116
    c => c.username.toLowerCase().startsWith("q"), // 117
    c => c.username.toLowerCase().startsWith("r"), // 118
    c => c.username.toLowerCase().startsWith("s"), // 119
    c => c.username.toLowerCase().startsWith("t"), // 120
    c => c.username.toLowerCase().startsWith("u"), // 121
    c => c.username.toLowerCase().startsWith("v"), // 122
    c => c.username.toLowerCase().startsWith("w"), // 123
    c => c.username.toLowerCase().startsWith("x"), // 124
    c => c.username.toLowerCase().startsWith("y"), // 125
    c => c.username.toLowerCase().startsWith("z"), // 126
    c => ["あ","い","う","え","お"].some(ch => c.displayName.startsWith(ch)), // 127
    c => ["か","き","く","け","こ"].some(ch => c.displayName.startsWith(ch)), // 128
    c => ["さ","し","す","せ","そ"].some(ch => c.displayName.startsWith(ch)), // 129
    c => ["た","ち","つ","て","と"].some(ch => c.displayName.startsWith(ch)), // 130
    c => ["な","に","ぬ","ね","の"].some(ch => c.displayName.startsWith(ch)), // 131
    c => ["は","ひ","ふ","へ","ほ"].some(ch => c.displayName.startsWith(ch)), // 132
    c => ["ま","み","む","め","も"].some(ch => c.displayName.startsWith(ch)), // 133
    c => ["や","ゆ","よ"].some(ch => c.displayName.startsWith(ch)), // 134
    c => ["ら","り","る","れ","ろ"].some(ch => c.displayName.startsWith(ch)), // 135
    c => ["わ","を","ん"].some(ch => c.displayName.startsWith(ch)), // 136
    c => c.displayName.startsWith("A"), // 137
    c => c.displayName.startsWith("B"), // 138
    c => c.displayName.startsWith("C"), // 139
    c => c.displayName.startsWith("D"), // 140
    c => c.displayName.startsWith("E"), // 141
    c => c.displayName.startsWith("F"), // 142
    c => c.displayName.startsWith("G"), // 143
    c => c.displayName.startsWith("H"), // 144
    c => c.displayName.startsWith("I"), // 145
    c => c.displayName.startsWith("J"), // 146
    c => c.displayName.startsWith("K"), // 147
    c => c.displayName.startsWith("L"), // 148
    c => c.displayName.startsWith("M"), // 149
    c => c.displayName.startsWith("N"), // 150
    c => c.displayName.startsWith("O"), // 151
    c => c.displayName.startsWith("P"), // 152
    c => c.displayName.startsWith("Q"), // 153
    c => c.displayName.startsWith("R"), // 154
    c => c.displayName.startsWith("S"), // 155
    c => c.displayName.startsWith("T"), // 156
    c => c.displayName.startsWith("U"), // 157
    c => c.displayName.startsWith("V"), // 158
    c => c.displayName.startsWith("W"), // 159
    c => c.displayName.startsWith("X"), // 160
    c => c.displayName.startsWith("Y"), // 161
    c => c.displayName.startsWith("Z"), // 162
    c => c.followers >= 0 && c.followers <= 9, // 163
    c => c.followers >= 10 && c.followers <= 49, // 164
    c => c.followers >= 50 && c.followers <= 99, // 165
    c => c.followers >= 500 && c.followers <= 999, // 166
    c => c.followers >= 5000 && c.followers <= 9999, // 167
    c => c.followers >= 50000 && c.followers <= 99999, // 168
    c => c.followers >= 100000 && c.followers <= 499999, // 169
    c => c.followers >= 500000 && c.followers <= 999999, // 170
    c => c.followers >= 1000000, // 171
    c => c.following === 0, // 172
    c => c.following >= 1 && c.following <= 9, // 173
    c => c.following >= 10 && c.following <= 99, // 174
    c => c.following >= 100 && c.following <= 499, // 175
    c => c.following >= 500 && c.following <= 999, // 176
    c => c.following >= 5000, // 177
    c => c.following >= 10000, // 178
    c => c.tweets === 0, // 179
    c => c.tweets >= 1 && c.tweets <= 9, // 180
    c => c.tweets >= 10 && c.tweets <= 49, // 181
    c => c.tweets >= 50 && c.tweets <= 99, // 182
    c => c.tweets >= 500 && c.tweets <= 999, // 183
    c => c.tweets >= 5000 && c.tweets <= 9999, // 184
    c => c.tweets >= 50000, // 185
    c => { try { return new Date(c.joined).getFullYear() === 2006; } catch { return false; } }, // 186
    c => { try { return new Date(c.joined).getFullYear() === 2007; } catch { return false; } }, // 187
    c => { try { return new Date(c.joined).getFullYear() === 2008; } catch { return false; } }, // 188
    c => { try { return new Date(c.joined).getFullYear() === 2009; } catch { return false; } }, // 189
    c => { try { return new Date(c.joined).getFullYear() === 2010; } catch { return false; } }, // 190
    c => { try { return new Date(c.joined).getFullYear() === 2011; } catch { return false; } }, // 191
    c => { try { return new Date(c.joined).getFullYear() === 2012; } catch { return false; } }, // 192
    c => { try { return new Date(c.joined).getFullYear() === 2013; } catch { return false; } }, // 193
    c => { try { return new Date(c.joined).getFullYear() === 2014; } catch { return false; } }, // 194
    c => { try { return new Date(c.joined).getFullYear() === 2015; } catch { return false; } }, // 195
    c => { try { return new Date(c.joined).getFullYear() === 2016; } catch { return false; } }, // 196
    c => { try { return new Date(c.joined).getFullYear() === 2017; } catch { return false; } }, // 197
    c => { try { return new Date(c.joined).getFullYear() === 2018; } catch { return false; } }, // 198
    c => { try { return new Date(c.joined).getFullYear() === 2019; } catch { return false; } }, // 199
    c => { try { return new Date(c.joined).getFullYear() === 2020; } catch { return false; } }, // 200
    c => { try { return new Date(c.joined).getFullYear() === 2021; } catch { return false; } }, // 201
    c => { try { return new Date(c.joined).getFullYear() === 2022; } catch { return false; } }, // 202
    c => { try { return new Date(c.joined).getFullYear() === 2023; } catch { return false; } }, // 203
    c => { try { return new Date(c.joined).getFullYear() === 2024; } catch { return false; } }, // 204
    c => { try { return new Date(c.joined).getFullYear() === 2025; } catch { return false; } }, // 205
    c => { try { return new Date(c.joined).getMonth() === 0; } catch { return false; } }, // 206
    c => { try { return new Date(c.joined).getMonth() === 1; } catch { return false; } }, // 207
    c => { try { return new Date(c.joined).getMonth() === 2; } catch { return false; } }, // 208
    c => { try { return new Date(c.joined).getMonth() === 3; } catch { return false; } }, // 209
    c => { try { return new Date(c.joined).getMonth() === 4; } catch { return false; } }, // 210
    c => { try { return new Date(c.joined).getMonth() === 5; } catch { return false; } }, // 211
    c => { try { return new Date(c.joined).getMonth() === 6; } catch { return false; } }, // 212
    c => { try { return new Date(c.joined).getMonth() === 7; } catch { return false; } }, // 213
    c => { try { return new Date(c.joined).getMonth() === 8; } catch { return false; } }, // 214
    c => { try { return new Date(c.joined).getMonth() === 9; } catch { return false; } }, // 215
    c => { try { return new Date(c.joined).getMonth() === 10; } catch { return false; } }, // 216
    c => { try { return new Date(c.joined).getMonth() === 11; } catch { return false; } }, // 217
    c => c.element === "🔥" || c.element === "💧" || c.element === "🌿", // 218
    c => c.element === "🔥" || c.element === "💧" || c.element === "⚡", // 219
    c => c.element === "🔥" || c.element === "💧" || c.element === "✨", // 220
    c => c.element === "🔥" || c.element === "💧" || c.element === "🌑", // 221
    c => c.element === "🔥" || c.element === "💧" || c.element === "🌙", // 222
    c => c.element === "🔥" || c.element === "💧" || c.element === "❄️", // 223
    c => c.element === "🔥" || c.element === "🌿" || c.element === "⚡", // 224
    c => c.element === "🔥" || c.element === "🌿" || c.element === "✨", // 225
    c => c.element === "🔥" || c.element === "🌿" || c.element === "🌑", // 226
    c => c.element === "🔥" || c.element === "🌿" || c.element === "🌙", // 227
    c => c.element === "🔥" || c.element === "🌿" || c.element === "❄️", // 228
    c => c.element === "🔥" || c.element === "⚡" || c.element === "✨", // 229
    c => c.element === "🔥" || c.element === "⚡" || c.element === "🌑", // 230
    c => c.element === "🔥" || c.element === "⚡" || c.element === "🌙", // 231
    c => c.element === "🔥" || c.element === "⚡" || c.element === "❄️", // 232
    c => c.element === "🔥" || c.element === "✨" || c.element === "🌑", // 233
    c => c.element === "🔥" || c.element === "✨" || c.element === "🌙", // 234
    c => c.element === "🔥" || c.element === "✨" || c.element === "❄️", // 235
    c => c.element === "🔥" || c.element === "🌑" || c.element === "🌙", // 236
    c => c.element === "🔥" || c.element === "🌑" || c.element === "❄️", // 237
    c => c.element === "🔥" || c.element === "🌙" || c.element === "❄️", // 238
    c => c.element === "💧" || c.element === "🌿" || c.element === "⚡", // 239
    c => c.element === "💧" || c.element === "🌿" || c.element === "✨", // 240
    c => c.element === "💧" || c.element === "🌿" || c.element === "🌑", // 241
    c => c.element === "💧" || c.element === "🌿" || c.element === "🌙", // 242
    c => c.element === "💧" || c.element === "🌿" || c.element === "❄️", // 243
    c => c.element === "💧" || c.element === "⚡" || c.element === "✨", // 244
    c => c.element === "💧" || c.element === "⚡" || c.element === "🌑", // 245
    c => c.element === "💧" || c.element === "⚡" || c.element === "🌙", // 246
    c => c.element === "💧" || c.element === "⚡" || c.element === "❄️", // 247
    c => c.element === "💧" || c.element === "✨" || c.element === "🌑", // 248
    c => c.element === "💧" || c.element === "✨" || c.element === "🌙", // 249
    c => c.element === "💧" || c.element === "✨" || c.element === "❄️", // 250
    c => c.element === "💧" || c.element === "🌑" || c.element === "🌙", // 251
    c => c.element === "💧" || c.element === "🌑" || c.element === "❄️", // 252
    c => c.element === "💧" || c.element === "🌙" || c.element === "❄️", // 253
    c => c.element === "🌿" || c.element === "⚡" || c.element === "✨", // 254
    c => c.element === "🌿" || c.element === "⚡" || c.element === "🌑", // 255
    c => c.element === "🌿" || c.element === "⚡" || c.element === "🌙", // 256
    c => c.element === "🌿" || c.element === "⚡" || c.element === "❄️", // 257
    c => c.element === "🌿" || c.element === "✨" || c.element === "🌑", // 258
    c => c.element === "🌿" || c.element === "✨" || c.element === "🌙", // 259
    c => c.element === "🌿" || c.element === "✨" || c.element === "❄️", // 260
    c => c.element === "🌿" || c.element === "🌑" || c.element === "🌙", // 261
    c => c.element === "🌿" || c.element === "🌑" || c.element === "❄️", // 262
    c => c.element === "🌿" || c.element === "🌙" || c.element === "❄️", // 263
    c => c.element === "⚡" || c.element === "✨" || c.element === "🌑", // 264
    c => c.element === "⚡" || c.element === "✨" || c.element === "🌙", // 265
    c => c.element === "⚡" || c.element === "✨" || c.element === "❄️", // 266
    c => c.element === "⚡" || c.element === "🌑" || c.element === "🌙", // 267
    c => c.element === "⚡" || c.element === "🌑" || c.element === "❄️", // 268
    c => c.element === "⚡" || c.element === "🌙" || c.element === "❄️", // 269
    c => c.element === "✨" || c.element === "🌑" || c.element === "🌙", // 270
    c => c.element === "✨" || c.element === "🌑" || c.element === "❄️", // 271
    c => c.element === "✨" || c.element === "🌙" || c.element === "❄️", // 272
    c => c.element === "🌑" || c.element === "🌙" || c.element === "❄️", // 273
    c => c.atk >= 0 && c.atk <= 100, // 274
    c => c.atk >= 101 && c.atk <= 200, // 275
    c => c.atk >= 201 && c.atk <= 300, // 276
    c => c.atk >= 301 && c.atk <= 400, // 277
    c => c.atk >= 401, // 278
    c => c.def >= 0 && c.def <= 100, // 279
    c => c.def >= 101 && c.def <= 200, // 280
    c => c.def >= 201 && c.def <= 300, // 281
    c => c.def >= 301 && c.def <= 400, // 282
    c => c.def >= 401, // 283
    c => c.spd >= 0 && c.spd <= 100, // 284
    c => c.spd >= 101 && c.spd <= 200, // 285
    c => c.spd >= 201 && c.spd <= 300, // 286
    c => c.spd >= 301 && c.spd <= 400, // 287
    c => c.spd >= 401, // 288
    c => c.hp >= 0 && c.hp <= 500, // 289
    c => c.hp >= 501 && c.hp <= 1000, // 290
    c => c.hp >= 1001 && c.hp <= 1500, // 291
    c => c.hp >= 1501 && c.hp <= 2000, // 292
    c => c.hp >= 2001, // 293
    c => c.int >= 0 && c.int <= 100, // 294
    c => c.int >= 101 && c.int <= 200, // 295
    c => c.int >= 201 && c.int <= 300, // 296
    c => c.int >= 301 && c.int <= 400, // 297
    c => c.int >= 401, // 298
    c => c.luk >= 0 && c.luk <= 100, // 299
    c => c.luk >= 101 && c.luk <= 200, // 300
    c => c.luk >= 201 && c.luk <= 300, // 301
    c => c.luk >= 301 && c.luk <= 400, // 302
    c => c.luk >= 401, // 303
    c => { const t=c.atk+c.def+c.spd+c.hp+c.int+c.luk; return t>=0&&t<=1000; }, // 304
    c => { const t=c.atk+c.def+c.spd+c.hp+c.int+c.luk; return t>=1001&&t<=1500; }, // 305
    c => { const t=c.atk+c.def+c.spd+c.hp+c.int+c.luk; return t>=1501&&t<=2000; }, // 306
    c => { const t=c.atk+c.def+c.spd+c.hp+c.int+c.luk; return t>=2001&&t<=2500; }, // 307
    c => { const t=c.atk+c.def+c.spd+c.hp+c.int+c.luk; return t>=2501&&t<=3000; }, // 308
    c => { const t=c.atk+c.def+c.spd+c.hp+c.int+c.luk; return t>=3001&&t<=3500; }, // 309
    c => { const t=c.atk+c.def+c.spd+c.hp+c.int+c.luk; return t>=3501&&t<=4000; }, // 310
    c => c.atk+c.def+c.spd+c.hp+c.int+c.luk >= 4001, // 311
    c => { const max=Math.max(...collection.map(x=>x.atk+x.spd)); return c.atk+c.spd===max; }, // 312
    c => { const max=Math.max(...collection.map(x=>x.atk+x.int)); return c.atk+c.int===max; }, // 313
    c => { const max=Math.max(...collection.map(x=>x.atk+x.luk)); return c.atk+c.luk===max; }, // 314
    c => { const max=Math.max(...collection.map(x=>x.atk+x.hp)); return c.atk+c.hp===max; }, // 315
    c => { const max=Math.max(...collection.map(x=>x.def+x.spd)); return c.def+c.spd===max; }, // 316
    c => { const max=Math.max(...collection.map(x=>x.def+x.int)); return c.def+c.int===max; }, // 317
    c => { const max=Math.max(...collection.map(x=>x.def+x.luk)); return c.def+c.luk===max; }, // 318
    c => { const max=Math.max(...collection.map(x=>x.def+x.hp)); return c.def+c.hp===max; }, // 319
    c => { const max=Math.max(...collection.map(x=>x.spd+x.int)); return c.spd+c.int===max; }, // 320
    c => { const max=Math.max(...collection.map(x=>x.spd+x.hp)); return c.spd+c.hp===max; }, // 321
    c => { const max=Math.max(...collection.map(x=>x.int+x.luk)); return c.int+c.luk===max; }, // 322
    c => { const max=Math.max(...collection.map(x=>x.int+x.hp)); return c.int+c.hp===max; }, // 323
    c => { const max=Math.max(...collection.map(x=>x.luk+x.hp)); return c.luk+c.hp===max; }, // 324
    c => { const m=Math.max(...collection.map(x=>x.spd)); return c.spd===m; }, // 325
    c => { const m=Math.max(...collection.map(x=>x.int)); return c.int===m; }, // 326
    c => { const m=Math.max(...collection.map(x=>x.luk)); return c.luk===m; }, // 327
    c => { const m=Math.max(...collection.map(x=>x.def)); return c.def===m; }, // 328
    c => { const m=Math.min(...collection.map(x=>x.def)); return c.def===m; }, // 329
    c => { const m=Math.min(...collection.map(x=>x.spd)); return c.spd===m; }, // 330
    c => { const m=Math.min(...collection.map(x=>x.int)); return c.int===m; }, // 331
    c => { const m=Math.min(...collection.map(x=>x.luk)); return c.luk===m; }, // 332
    c => (c.enhance ?? 0) === 1, // 333
    c => (c.enhance ?? 0) === 2, // 334
    c => (c.enhance ?? 0) === 3, // 335
    c => (c.enhance ?? 0) === 4, // 336
    () => { const h=new Date().getHours(); return h>=4&&h<6; }, // 337
    () => { const h=new Date().getHours(); return h>=9&&h<10; }, // 338
    () => { const h=new Date().getHours(); return h>=10&&h<11; }, // 339
    () => { const h=new Date().getHours(); return h>=11&&h<12; }, // 340
    () => { const h=new Date().getHours(); return h>=13&&h<14; }, // 341
    () => { const h=new Date().getHours(); return h>=14&&h<15; }, // 342
    () => { const h=new Date().getHours(); return h>=15&&h<16; }, // 343
    () => { const h=new Date().getHours(); return h>=16&&h<17; }, // 344
    () => { const h=new Date().getHours(); return h>=18&&h<19; }, // 345
    () => { const h=new Date().getHours(); return h>=19&&h<20; }, // 346
    () => { const h=new Date().getHours(); return h>=20&&h<21; }, // 347
    () => { const h=new Date().getHours(); return h>=21&&h<22; }, // 348
    () => { const h=new Date().getHours(); return h>=3&&h<4; }, // 349
    () => collection.length >= 10, // 350
    () => collection.length >= 20, // 351
    () => collection.length >= 30, // 352
    () => collection.length >= 40, // 353
    () => collection.length >= 60, // 354
    () => collection.length >= 70, // 355
    () => collection.length >= 80, // 356
    () => collection.length >= 90, // 357
    () => collection.length >= 120, // 358
    () => collection.length >= 160, // 359
    () => collection.length >= 250, // 360
    () => collection.length >= 300, // 361
    c => c.followers>0&&c.followers%5===0, // 362
    c => c.followers>0&&c.followers%10===0, // 363
    c => c.followers>0&&c.followers%100===0, // 364
    c => c.followers>0&&c.followers%1000===0, // 365
    c => c.tweets>0&&c.tweets%7===0, // 366
    c => c.tweets>0&&c.tweets%11===0, // 367
    c => c.atk%5===0, // 368
    c => c.atk%10===0, // 369
    c => c.hp%100===0, // 370
    c => c.spd%7===0, // 371
    c => c.luk>0&&c.luk%13===0, // 372
    c => c.def%4===0, // 373
    c => c.int>0&&c.int%6===0, // 374
    c => (c.atk+c.def+c.spd+c.hp+c.int+c.luk)%10===0, // 375
    c => c.followers>0&&c.followers%777===0, // 376
    c => c.displayName.length === 1, // 377
    c => c.displayName.length <= 3, // 378
    c => c.displayName.length >= 20, // 379
    c => c.displayName.includes("!") || c.displayName.includes("！"), // 380
    c => c.displayName.includes("♪") || c.displayName.includes("♫"), // 381
    c => c.displayName.includes("★") || c.displayName.includes("☆"), // 382
    c => /\d/.test(c.displayName), // 383
    c => /[❤️💕💖💗💓💞💝]/.test(c.displayName), // 384
    c => /[🎵🎶🎼🎤🎧]/.test(c.displayName), // 385
    c => c.displayName.length >= 10, // 386
    c => !!(c.bio && c.bio.length >= 50), // 387
    c => !!(c.bio && c.bio.length >= 100), // 388
    c => !!(c.bio && /https?:\/\//.test(c.bio)), // 389
    c => !!(c.bio && c.bio.includes("#")), // 390
    c => !!(c.bio && c.bio.includes("@")), // 391
    c => !!(c.bio && /\p{Emoji}/u.test(c.bio)), // 392
    c => !!(c.bio && /^[\x00-\x7F]*$/.test(c.bio) && c.bio.length > 0), // 393
    c => !!(c.bio && /[\u3040-\u30ff\u4e00-\u9fff]/.test(c.bio)), // 394
    c => c.rarity==="C"||c.rarity==="N", // 395
    c => c.rarity==="R"||c.rarity==="SR", // 396
    c => c.rarity==="SSR"||c.rarity==="UR", // 397
    c => c.rarity==="UR"||c.rarity==="LR", // 398
    c => ["C","N","R"].includes(c.rarity), // 399
    c => ["SR","SSR","UR"].includes(c.rarity), // 400
    c => RARITY_ORDER.indexOf(c.rarity)<=4, // 401
    c => RARITY_ORDER.indexOf(c.rarity)<=5, // 402
    () => questCleared.includes(9), // 403
    () => questCleared.includes(19), // 404
    () => questCleared.includes(29), // 405
    () => questCleared.includes(49), // 406
    () => questCleared.includes(69), // 407
    () => questCleared.includes(79), // 408
    () => questCleared.includes(89), // 409
    () => questCleared.includes(99), // 410
    () => questCleared.includes(109), // 411
    () => questCleared.includes(119), // 412
    () => { const m=new Date().getMonth()+1; return m>=3&&m<=5; }, // 413
    () => { const m=new Date().getMonth()+1; return m>=6&&m<=8; }, // 414
    () => { const m=new Date().getMonth()+1; return m>=9&&m<=11; }, // 415
    () => { const m=new Date().getMonth()+1; return m===12||m<=2; }, // 416
    c => /\d$/.test(c.username), // 417
    c => /^\d/.test(c.username), // 418
    c => c.username.includes("0"), // 419
    c => c.username.includes("7"), // 420
    c => c.username.includes("777"), // 421
    c => c.displayName.length === 5, // 422
    c => c.displayName.length === 7, // 423
    c => c.displayName.length >= 30, // 424
    c => c.displayName.length === 2, // 425
    c => c.followers >= 10000, // 426
    c => c.username.length === 10, // 427
    c => [c.atk,c.def,c.spd,c.hp,c.int,c.luk].some(v=>v>=490&&v<=510), // 428
    c => { const sorted=[...collection].sort((a,b)=>a.pulledAt-b.pulledAt); const idx=sorted.findIndex(x=>x.id===c.id); return idx%2===0; }, // 429
    c => { const sorted=[...collection].sort((a,b)=>a.pulledAt-b.pulledAt); const idx=sorted.findIndex(x=>x.id===c.id); return idx%2===1; }, // 430
    c => c.element==="🔥"||c.element==="🌿", // 431
    c => c.element==="🔥"||c.element==="⚡", // 432
    c => c.element==="🔥"||c.element==="✨", // 433
    c => c.element==="🔥"||c.element==="🌑", // 434
    c => c.element==="🔥"||c.element==="🌙", // 435
    c => c.element==="💧"||c.element==="✨", // 436
    c => c.element==="💧"||c.element==="🌑", // 437
    c => c.element==="💧"||c.element==="🌙", // 438
    c => c.element==="💧"||c.element==="❄️", // 439
    c => c.element==="🌿"||c.element==="🌑", // 440
    c => c.followers>=1&&c.followers<=9, // 441
    c => c.followers>=10&&c.followers<=99, // 442
    c => c.followers>=100&&c.followers<=999, // 443
    c => c.followers>=1000&&c.followers<=9999, // 444
    c => c.followers>=1000000, // 445
    c => { const freq:Record<string,number>={}; collection.forEach(x=>{const ch=(x.displayName[0]??"").toLowerCase();freq[ch]=(freq[ch]||0)+1;}); const top=Object.entries(freq).sort((a,b)=>b[1]-a[1])[0]?.[0]??""; return (c.displayName[0]??"").toLowerCase()===top; }, // 446
    c => { const freq:Record<string,number>={}; collection.forEach(x=>{freq[x.element]=(freq[x.element]||0)+1;}); const top=ELEMENTS.reduce((a,b)=>(freq[a]||0)>=(freq[b]||0)?a:b); return c.element!==top; }, // 447
    c => { const m=new Date().getMonth(); try{return new Date(c.joined).getMonth()===m;}catch{return false;} }, // 448
    c => c.following >= 1000, // 449
    c => { const max=Math.max(...collection.map(x=>x.atk)); return c.atk===max; }, // 450
    c => c.atk%2===0, // 451
    c => c.def%2===1, // 452
    c => c.spd%2===0, // 453
    c => c.luk%2===1, // 454
    c => c.int%2===0, // 455
    c => c.luk>=400&&c.spd>=400, // 456
    c => c.int>=400&&c.def>=400, // 457
    c => c.followers<=100&&c.luk>=500, // 458
    c => c.followers>=10000&&c.atk<=200, // 459
    () => { const elems=new Set(collection.map(x=>x.element)); return ELEMENTS.every(e=>elems.has(e as typeof collection[0]["element"])); }, // 460
    () => collection.length >= 108, // 461
    c => c.rarity==="LR", // 462
    c => c.luk>=600, // 463
    c => c.atk>=400&&c.def>=400&&c.spd>=400, // 464
    () => questCleared.includes(119), // 465
    c => c.username.length===6, // 466
    c => c.username.length===7, // 467
    c => c.username.length===9, // 468
    c => c.username.length===12, // 469
    c => c.username.length===20, // 470
    c => c.followers===0, // 471
    c => c.following===0, // 472
    c => c.tweets===0, // 473
    c => c.atk>=999, // 474
    c => c.hp>=2000, // 475
    c => c.atk<=100&&c.def<=100&&c.spd<=100&&c.hp<=100&&c.int<=100&&c.luk<=100, // 476
    c => c.atk<=200&&c.def<=200&&c.spd<=200&&c.hp<=200&&c.int<=200&&c.luk<=200, // 477
    c => { const max=Math.max(...collection.map(x=>x.spd+x.luk)); return c.spd+c.luk===max; }, // 478
    c => { const max=Math.max(...collection.map(x=>x.atk+x.int)); return c.atk+c.int===max; }, // 479
    c => { const max=Math.max(...collection.map(x=>x.def+x.hp)); return c.def+c.hp===max; }, // 480
    c => c.followers%2===0, // 481
    c => c.tweets%2===0, // 482
    c => c.following%2===1, // 483
    c => /[A-Z]/.test(c.username), // 484
    c => c.username===c.username.toLowerCase(), // 485
    c => (c.username.match(/_/g)??[]).length>=2, // 486
    c => !!(c.bio&&/https?:\/\//.test(c.bio)), // 487
    c => !!(c.bio&&c.bio.includes("#")), // 488
    c => !!(c.bio&&c.bio.includes("@")), // 489
    c => (c.enhance??0)===5, // 490
    c => c.followers>=5000&&c.followers<=9999, // 491
    () => questCleared.length>=492, // 492
    () => true, // ∞
  ];
}

export const STAGE_ENEMY_SCALE = [0.6, 0.8, 1.0, 1.1, 1.3, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.5, 1.8, 1.4, 0.8, 0.8, 0.8, 0.8, 1.0, 1.0, 1.0, 0.8, 0.8, 1.0, 1.2, 1.0, 1.0, 1.0, 1.0, 1.2, 1.2, 1.2, 1.2, 1.0, 1.0, 1.2, 1.0, 1.0, 1.0, 1.2, 1.0, 0.8, 1.2, 1.5, 1.0, 0.8, 1.0, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.5, 0.8, 1.0, 1.0, 1.2, 1.5, 1.5, 1.0, 1.0, 1.0, 2.0, 1.2, 1.2, 1.2, 1.2, 2.0, 2.0, 1.8, 1.8, 1.5, 2.0, 1.2, 0.8, 0.8, 2.0, 1.8, 2.0, 2.0, 3.5, 3.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.0, 1.0, 1.0, 1.0, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.2, 1.2, 1.2, 1.2, 1.0, 1.0, 1.0, 1.0, 1.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.2, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.8, 0.8, 1.0, 1.0, 1.5, 1.2, 1.0, 1.0, 1.0, 2.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 2.0, 1.0, 2.0, 5.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 6.0, 1.5];

export function normalizeEnemy(card: TwitterCard, scale: number): TwitterCard {
  return { ...card, atk: Math.round(card.atk * scale), def: Math.round(card.def * scale), spd: Math.round(card.spd * scale), hp: Math.round(card.hp * scale), int: Math.round(card.int * scale), luk: Math.round(card.luk * scale) };
}

export default function QuestView({ collection, onBack, onSelectStage }: {
  collection: TwitterCard[];
  onBack: () => void;
  onSelectStage: (idx: number) => void;
}) {
  const t = useT();
  const q = t.battle.quest;
  const { questCleared, questBestStreak } = useGameStore();
  const now = new Date();
  const day = now.getDay(); const hour = now.getHours(); const month = now.getMonth() + 1;
  const locked: Record<number, string> = {};
  // 時間帯ロック (0-indexed stage numbers)
  if (hour < 6 || hour >= 9) locked[51] = "🔒 6時〜9時のみ";
  if (hour < 12 || hour >= 13) locked[52] = "🔒 12時〜13時のみ";
  if (hour >= 4 && hour < 22) locked[53] = "🔒 22時〜4時のみ";
  if (hour >= 3) locked[54] = "🔒 0時〜3時のみ";
  if (hour < 17 || hour >= 19) locked[55] = "🔒 17時〜19時のみ";
  if (hour < 7 || hour >= 9) locked[56] = "🔒 7時〜9時のみ";
  if (hour < 20 || hour >= 22) locked[57] = "🔒 20時〜22時のみ";
  // 曜日ロック
  if (day !== 1) locked[58] = "🔒 月曜のみ";
  if (day !== 2) locked[59] = "🔒 火曜のみ";
  if (day !== 3) locked[60] = "🔒 水曜のみ";
  if (day !== 4) locked[61] = "🔒 木曜のみ";
  if (day !== 5) locked[62] = "🔒 金曜のみ";
  if (day !== 0 && day !== 6) locked[63] = "🔒 土日のみ";
  if (day !== 0) locked[64] = "🔒 日曜のみ";
  // コレクション枚数ロック
  if (collection.length < 50) locked[65] = `🔒 ${collection.length}/50枚`;
  if (collection.length < 100) locked[66] = `🔒 ${collection.length}/100枚`;
  if (collection.length < 108) locked[67] = `🔒 ${collection.length}/108枚`;
  if (collection.length < 150) locked[68] = `🔒 ${collection.length}/150枚`;
  if (collection.length < 200) locked[69] = `🔒 ${collection.length}/200枚`;
  // 時間帯ロック（残り）
  if (hour < 4 || hour >= 6) locked[336] = "🔒 4時〜6時のみ";
  if (hour < 9 || hour >= 10) locked[337] = "🔒 9時〜10時のみ";
  if (hour < 10 || hour >= 11) locked[338] = "🔒 10時〜11時のみ";
  if (hour < 11 || hour >= 12) locked[339] = "🔒 11時〜12時のみ";
  if (hour < 13 || hour >= 14) locked[340] = "🔒 13時〜14時のみ";
  if (hour < 14 || hour >= 15) locked[341] = "🔒 14時〜15時のみ";
  if (hour < 15 || hour >= 16) locked[342] = "🔒 15時〜16時のみ";
  if (hour < 16 || hour >= 17) locked[343] = "🔒 16時〜17時のみ";
  if (hour < 18 || hour >= 19) locked[344] = "🔒 18時〜19時のみ";
  if (hour < 19 || hour >= 20) locked[345] = "🔒 19時〜20時のみ";
  if (hour < 20 || hour >= 21) locked[346] = "🔒 20時〜21時のみ";
  if (hour < 21 || hour >= 22) locked[347] = "🔒 21時〜22時のみ";
  if (hour < 3 || hour >= 4) locked[348] = "🔒 3時〜4時のみ";
  // コレクション枚数ロック（残り）
  if (collection.length < 10) locked[349] = `🔒 ${collection.length}/10枚`;
  if (collection.length < 20) locked[350] = `🔒 ${collection.length}/20枚`;
  if (collection.length < 30) locked[351] = `🔒 ${collection.length}/30枚`;
  if (collection.length < 40) locked[352] = `🔒 ${collection.length}/40枚`;
  if (collection.length < 60) locked[353] = `🔒 ${collection.length}/60枚`;
  if (collection.length < 70) locked[354] = `🔒 ${collection.length}/70枚`;
  if (collection.length < 80) locked[355] = `🔒 ${collection.length}/80枚`;
  if (collection.length < 90) locked[356] = `🔒 ${collection.length}/90枚`;
  if (collection.length < 120) locked[357] = `🔒 ${collection.length}/120枚`;
  if (collection.length < 160) locked[358] = `🔒 ${collection.length}/160枚`;
  if (collection.length < 250) locked[359] = `🔒 ${collection.length}/250枚`;
  if (collection.length < 300) locked[360] = `🔒 ${collection.length}/300枚`;
  // クリア条件ロック
  if (!questCleared.includes(9)) locked[402] = "🔒 第10章クリア後";
  if (!questCleared.includes(19)) locked[403] = "🔒 第20章クリア後";
  if (!questCleared.includes(29)) locked[404] = "🔒 第30章クリア後";
  if (!questCleared.includes(49)) locked[405] = "🔒 第50章クリア後";
  if (!questCleared.includes(69)) locked[406] = "🔒 第70章クリア後";
  if (!questCleared.includes(79)) locked[407] = "🔒 第80章クリア後";
  if (!questCleared.includes(89)) locked[408] = "🔒 第90章クリア後";
  if (!questCleared.includes(99)) locked[409] = "🔒 第100章クリア後";
  if (!questCleared.includes(109)) locked[410] = "🔒 第110章クリア後";
  if (!questCleared.includes(119)) locked[411] = "🔒 第120章クリア後";
  // 季節ロック
  if (month < 3 || month > 5) locked[412] = "🔒 3〜5月のみ";
  if (month < 6 || month > 8) locked[413] = "🔒 6〜8月のみ";
  if (month < 9 || month > 11) locked[414] = "🔒 9〜11月のみ";
  if (month !== 12 && month > 2) locked[415] = "🔒 12〜2月のみ";
  // 最終章ロック
  if (!questCleared.includes(463)) locked[464] = "🔒 第465章クリア後";
  if (questCleared.length < 492) locked[491] = `🔒 全章クリア後 (${questCleared.length}/492)`;

  const [showCleared, setShowCleared] = React.useState(false);
  const [query, setQuery] = React.useState("");
  return (
    <div className="min-h-dvh bg-gray-950 text-white flex flex-col items-center gap-4 px-4 py-8 slide-in-up">
      <div className="flex items-center gap-4 w-full max-w-lg">
        <button onClick={onBack} className="text-gray-400 hover:text-white text-sm">{q.back}</button>
        <h1 className="text-2xl font-black bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">{q.title}</h1>
        <label className="flex items-center gap-1 text-xs text-gray-400 ml-auto cursor-pointer">
          <input type="checkbox" checked={showCleared} onChange={e => setShowCleared(e.target.checked)} className="accent-yellow-400" />
          ✅
        </label>
        <span className="text-xs text-gray-500">{questCleared.length}/492 {q.cleared}</span>
      </div>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="🔍" className="w-full max-w-lg px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 outline-none" />
      <div className="flex flex-col gap-3 w-full max-w-lg">
        {q.stages.map((s, i) => {
          const cleared = questCleared.includes(i);
          if (cleared && !showCleared) return null;
          if (query && !s.title.includes(query) && !s.condition.includes(query)) return null;
          const isEndless = s.wins === 0;
          const lockMsg = locked[i];
          return (
            <button key={i} onClick={() => !lockMsg && onSelectStage(i)} disabled={!!lockMsg}
              className={`w-full p-4 rounded-xl text-left transition border ${lockMsg ? "border-gray-800 bg-gray-900/40 opacity-50 cursor-not-allowed" : cleared ? "border-yellow-500/50 bg-yellow-500/10" : "border-gray-700 bg-gray-800/60 hover:bg-gray-700/60"}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-white">{s.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{q.condition}: {s.condition}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{lockMsg ?? (isEndless ? q.bestStreak(questBestStreak) : q.wins(s.wins))}</p>
                </div>
                <div className="text-right">
                  {cleared && <span className="text-yellow-400 text-xs font-bold">✅ {q.cleared}</span>}
                  {!isEndless && <p className="text-xs text-green-400 mt-1">{q.reward(s.reward)}</p>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
