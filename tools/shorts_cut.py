#!/usr/bin/env python3
"""tools/shorts_cut.py — Atlas Studio: автонарезка Shorts 9:16 из длинного ролика.

  python3 tools/shorts_cut.py final.mp4 --project projects/<slug> [--n 3] [--out ПАПКА] [--no-gemini]

1. По timeline/sentences.json ищет самостоятельные куски 20–55 с: сильное начало (число, вопрос, «ты», шок-факт,
   начало абзаца), без начала со связки («и», «а», «это», «он»…), законченная мысль в конце (конец абзаца, точка).
2. Делает 1080×1920: исходный кадр по центру (кроп без полос и вшитых субтитров) + размытая подложка,
   крупные субтитры по словам (2–4 слова, текущее слово жёлтое), в первые 1,5 с крупный заголовок-хук,
   в конце 1 с «Полное видео на канале». Громкость −14 LUFS.
3. Каждый Shorts: final_gate.py --shorts и лист кадров для просмотра глазами (shorts_лист.png).
"""
import argparse, json, re, subprocess, sys, shutil
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent; sys.path.insert(0, str(HERE)); QA = Path.home() / "frame-qa"
FD = HERE.parent / "node_modules/@fontsource/oswald/files"
W, H, FPS = 1080, 1920, 24
YEL, WHITE = (255, 214, 10), (255, 250, 240)
NUMW = r"(одн\w*|два|две|двух|три|трёх|четыр\w+|пят\w+|шест\w+|сем\w+|восьм\w+|девят\w+|десят\w+|двадцат\w+|тридцат\w+|сорок\w*|пятьдесят|сто|тысяч\w*|миллион\w*|миллиард\w*|половин\w+|треть\w*)"
CONNECT = r"^(и|а|но|это|он|она|они|оно|так|потому|поэтому|тогда|там|тут|вот|же|ещё|его|её|их|этот|эта|эти|такой|такая|при этом|кроме того|зато|однако|причём)\b"
CONTINUE = r"^(это|он|она|они|оно|его|её|их|этот|эта|эти|такой|такая|там|тут|поэтому|потому|тогда)\b"     # следующая фраза продолжает эту — обрывать нельзя
SHOCK = r"(никто|самый|самое|самая|опасн|смерт|умр|погиб|половин|на самом деле|запомни|обман|ловушк|не знаешь|не чувствуешь|секрет|правда|нет вовсе|почти)"


class Font:                                   # Oswald 700: кириллица и латиница из разных файлов (как в thumb_make.py)
    def __init__(s, size): s.c = ImageFont.truetype(str(FD / "oswald-cyrillic-700-normal.woff"), size); s.l = ImageFont.truetype(str(FD / "oswald-latin-700-normal.woff"), size); s.size = size
    def f(s, ch): return s.c if "Ѐ" <= ch <= "џ" or ch in "№" else s.l
    def width(s, t): return sum(s.f(ch).getlength(ch) for ch in t)
    def draw(s, d, xy, t, fill, stroke=0):
        x, y = xy
        for ch in t: d.text((x, y), ch, font=s.f(ch), fill=fill, stroke_width=stroke, stroke_fill=(0, 0, 0)); x += s.f(ch).getlength(ch)


def dur(p): return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout.strip())


# ---------------------------------------------------------------- выбор кусков
def candidates(S, paras_of, total):
    out = []
    for i in range(len(S)):
        a = S[i]["text"].strip(); low = a.lower()
        if re.search(r"продолжение следует", low): continue
        st = 0
        if re.search(r"\d|\b" + NUMW, low): st += 3
        if "?" in a: st += 2
        if re.search(r"\b(ты|тебе|тебя|твой|твоя|твоё)\b", low): st += 2
        if re.search(SHOCK, low): st += 2
        if i == 0 or paras_of[i] != paras_of[i - 1]: st += 2
        if re.match(CONNECT, low): st -= 5
        if len(a.split()) <= 2: st -= 1
        for j in range(i, len(S)):
            d = S[j]["end"] - S[i]["start"]
            if d > 55: break
            if d < 20: continue
            b = S[j]["text"].strip(); en = 0
            if j + 1 >= len(S) or paras_of[j + 1] != paras_of[j]: en += 3
            if re.search(r"[.!…]$", b): en += 1
            if re.search(r"[:,—]$", b) or (j + 1 < len(S) and re.match(CONTINUE, S[j + 1]["text"].lower()) and paras_of[j + 1] == paras_of[j]): en -= 3
            if re.search(r"продолжение следует", b.lower()): en -= 2
            if re.search(r"(но сначала|разберёмся|дальше|а вот|но это ещё|сейчас покажу|следующ|запомни)", b.lower()): en -= 4      # обрыв на «петле» — мысль не закончена
            body = " ".join(x["text"] for x in S[i:j + 1]).lower()
            dens = min(3, len(re.findall(r"\d|\b" + NUMW, body)) * 0.5)
            out.append(dict(i=i, j=j, t0=S[i]["start"], t1=S[j]["end"], dur=round(d, 2), score=round(st + en + dens + (1 if 28 <= d <= 48 else 0), 2), text=" ".join(x["text"] for x in S[i:j + 1])))
    return sorted(out, key=lambda c: -c["score"])


def choose(C, n):
    pick = []
    for c in C:
        if all(c["t1"] + 1 < p["t0"] or c["t0"] > p["t1"] + 1 for p in pick): pick.append(c)
        if len(pick) == n: break
    return sorted(pick, key=lambda c: c["t0"])


def hooks_for(pick, no_gemini):
    res = None
    if not no_gemini:
        try:
            import atlas_gemini as AG
            sch = {"type": "OBJECT", "properties": {"hooks": {"type": "ARRAY", "items": {"type": "STRING"}}}, "required": ["hooks"]}
            r = AG.gen_json("Для каждого фрагмента ролика ниже придумай заголовок-хук для YouTube Shorts: 2–5 слов ПРОПИСНЫМИ, грамматически цельная фраза (можно с двоеточием), интрига или число, ТОЛЬКО по смыслу фрагмента, без обмана, без эмодзи и восклицаний.\n\n" + "\n\n".join(f"{k + 1}. {c['text']}" for k, c in enumerate(pick)), sch, temperature=0.7, what="хуки Shorts")
            res = [h.strip().upper() for h in (r or {}).get("hooks", [])]
        except Exception: res = None
    out = []
    for k, c in enumerate(pick):
        h = res[k] if res and k < len(res) and 1 <= len(res[k].split()) <= 6 else None
        if not h:
            first = re.split(r"(?<=[.!?…])\s", c["text"])[0].strip(" .").upper(); w = first.split()
            h = " ".join(w[:5]) + ("…" if len(w) > 5 else "")
        out.append(h)
    return out


# ---------------------------------------------------------------- оверлей (хук, субтитры, финал)
def wrap(font, text, maxw):
    lines, cur = [], ""
    for w in text.split():
        nx = (cur + " " + w).strip()
        if font.width(nx) > maxw and cur: lines.append(cur); cur = w
        else: cur = nx
    return lines + ([cur] if cur else [])


def groups(words):
    """Слова -> группы по 2–4 (разрыв на знаках препинания)."""
    G, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) >= 4 or (len(cur) >= 2 and re.search(r"[.,!?…:;—]$", w["word"])) or sum(len(x["word"]) for x in cur) > 20: G.append(cur); cur = []
    if cur:
        if G and len(cur) == 1 and len(G[-1]) < 4: G[-1] += cur
        else: G.append(cur)
    return G


class Overlay:
    def __init__(s, words, hook, length):
        s.words, s.hook, s.len = words, hook, length; s.G = groups(words); s.cache = {}
        s.fsub = Font(104); s.fhook = Font(118); s.fend = Font(112); s.fend2 = Font(64)
        s.hook_lines = wrap(s.fhook, hook, W - 140)[:3]

    def state(s, t):
        if t >= s.len - 1.0: return ("end", min(9, int((t - (s.len - 1.0)) * 24 / 3)))
        hk = None
        if t < 1.5: hk = min(8, int(t * 24 / 1.2)) if t < 0.4 else 9
        g = next((k for k, gr in enumerate(s.G) if gr[0]["start"] - 0.05 <= t <= (s.G[k + 1][0]["start"] - 0.05 if k + 1 < len(s.G) else gr[-1]["end"] + 0.4)), None)
        cw = None
        if g is not None:
            cw = max((k for k, w in enumerate(s.G[g]) if w["start"] - 0.05 <= t), default=0)
        return ("main", hk, g, cw)

    def frame(s, t):
        key = s.state(t)
        if key in s.cache: return s.cache[key]
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        if key[0] == "end":
            k = (key[1] + 1) / 10; d.rectangle((0, 0, W, H), fill=(6, 6, 12, int(200 * min(1, k * 1.5))))
            for n, (txt, f, col) in enumerate([("ПОЛНОЕ ВИДЕО", s.fend, WHITE), ("НА КАНАЛЕ", s.fend, YEL)]):
                x = (W - f.width(txt)) / 2; f.draw(d, (x, 760 + n * 150), txt, col + (255,), stroke=7)
            sub = "ССЫЛКА В ОПИСАНИИ"; s.fend2.draw(d, ((W - s.fend2.width(sub)) / 2, 1080), sub, (230, 230, 230, 255), stroke=4)
        else:
            _, hk, g, cw = key
            if hk is not None:
                sc = 0.6 + 0.4 * min(1, (hk + 1) / 9) if hk < 9 else 1.0
                f = Font(int(118 * sc)); lines = wrap(f, s.hook, W - 120)[:3]; y0 = 300 - len(lines) * f.size * 0.6
                pad = 30; bw = max(f.width(l) for l in lines) + pad * 2; bh = len(lines) * f.size * 1.18 + pad
                d.rounded_rectangle(((W - bw) / 2, y0 - pad / 2, (W + bw) / 2, y0 + bh), radius=24, fill=(10, 10, 16, 215), outline=YEL + (255,), width=5)
                for n, l in enumerate(lines): f.draw(d, ((W - f.width(l)) / 2, y0 + n * f.size * 1.18 - f.size * 0.12), l, (WHITE if n < len(lines) - 1 else YEL) + (255,), stroke=6)
            if g is not None:
                ws = [w["word"].strip().upper() for w in s.G[g]]; f = s.fsub
                while f.size > 60 and f.width(" ".join(ws)) > W - 100 and len(ws) <= 2: f = Font(f.size - 8)
                lines, cur = [], []
                for k, w in enumerate(ws):
                    if cur and f.width(" ".join([x[1] for x in cur] + [w])) > W - 110: lines.append(cur); cur = []
                    cur.append((k, w))
                lines.append(cur); y = 1330 - (len(lines) - 1) * f.size * 0.6
                for ln in lines:
                    txt = " ".join(w for _, w in ln); x = (W - f.width(txt)) / 2
                    for k, w in ln:
                        f.draw(d, (x, y), w, (YEL if k == cw else WHITE) + (255,), stroke=8); x += f.width(w + " ")
                    y += f.size * 1.15
        b = im.tobytes(); s.cache[key] = b
        if len(s.cache) > 400: s.cache.clear()
        return b


def render(video, c, hook, words, out, fps=FPS):
    L = round(c["t1"] - c["t0"] + 0.35, 2); total = L + 1.0
    ws = [dict(word=w["word"], start=round(w["start"] - c["t0"], 3), end=round(w["end"] - c["t0"], 3)) for w in words if c["t0"] - 0.05 <= w["start"] < c["t1"] + 0.05]
    ov = Overlay(ws, hook, total)
    fc = (f"[0:v]fps={fps},crop=1720:820:100:60,split[a][b];[a]scale=-2:{H},crop={W}:{H},boxblur=26:2,eq=brightness=-0.12:saturation=0.85[bg];"   # без полос и вшитых субтитров
          f"[b]scale={W}:-2[fg];[bg][fg]overlay=0:620[base];[base]tpad=stop_mode=clone:stop_duration=1.0[bt];"
          f"[bt][1:v]overlay=0:0:format=auto,format=yuv420p[v];"
          f"[0:a]afade=t=in:d=0.08,afade=t=out:st={L - 0.25}:d=0.25,apad=pad_dur=1.0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a2]")
    cmd = ["ffmpeg", "-y", "-v", "error", "-ss", f"{c['t0']:.3f}", "-t", f"{L:.3f}", "-i", str(video),
           "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
           "-filter_complex", fc, "-map", "[v]", "-map", "[a2]", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-r", str(fps),
           "-c:a", "aac", "-b:a", "192k", "-t", f"{total:.3f}", "-movflags", "+faststart", str(out)]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    n = int(round(total * fps)) + 2
    try:
        for f in range(n): p.stdin.write(ov.frame(f / fps))
    except BrokenPipeError: pass
    p.stdin.close(); p.wait()
    if p.returncode: raise SystemExit(f"ffmpeg упал на {out.name}")
    return total


def sheet(files, out):
    cells = []
    for f in files:
        D = dur(f)
        for t in (0.6, D * 0.35, D * 0.7, D - 0.4):
            tmp = out.parent / f"_f{len(cells)}.png"; subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.2f}", "-i", str(f), "-frames:v", "1", "-vf", "scale=270:480", str(tmp)]); cells.append((f.name, t, tmp))
    cols = 4; rows = (len(cells) + cols - 1) // cols; im = Image.new("RGB", (cols * 280 + 10, rows * 515 + 10), (17, 17, 17)); d = ImageDraw.Draw(im)
    for k, (nm, t, p) in enumerate(cells):
        x, y = 10 + (k % cols) * 280, 10 + (k // cols) * 515; im.paste(Image.open(p), (x, y)); d.text((x, y + 485), f"{nm[:26]} {t:.1f}s", fill=(220, 220, 220), font=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 14)); p.unlink()
    im.save(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video"); ap.add_argument("--project", required=True); ap.add_argument("--n", type=int, default=3); ap.add_argument("--out"); ap.add_argument("--no-gemini", action="store_true")
    a = ap.parse_args(); P = Path(a.project).expanduser().resolve(); V = Path(a.video).expanduser().resolve()
    out = Path(a.out).expanduser() if a.out else V.parent / "shorts_v1"; out.mkdir(parents=True, exist_ok=True)
    S = json.loads((P / "timeline/sentences.json").read_text(encoding="utf-8"))
    wj = json.loads((P / "timeline/words.json").read_text(encoding="utf-8")); words = wj["words"] if isinstance(wj, dict) else wj
    import auto_storyboard as AS
    cfg = json.loads((P / "config.json").read_text(encoding="utf-8")); sp = P / cfg.get("script", "input/script.txt")
    paras_of, _ = AS.para_index(S, sp.read_text(encoding="utf-8") if sp.exists() else "\n\n".join(x["text"] for x in S))
    C = candidates(S, paras_of, dur(V)); pick = choose(C, a.n)
    sj = P / "story/shots.json"
    if sj.exists():                                  # начало куска — на склейке кадров, чтобы не мелькнул хвост прошлой сцены
        cuts = [x["start"] for x in json.loads(sj.read_text(encoding="utf-8"))["shots"]]
        for c in pick:
            prev_end = S[c["i"] - 1]["end"] if c["i"] > 0 else 0.0
            near = [t for t in cuts if max(prev_end + 0.05, c["t0"] - 0.6) <= t <= c["t0"]]   # склейка чуть раньше фразы и после конца прошлой
            if near: c["t0"] = near[-1]
    if not pick: raise SystemExit("не нашёл кусков 20–55 с с законченной мыслью")
    hooks = hooks_for(pick, a.no_gemini)
    rep = ["# Shorts из ролика", "", f"Источник: {V.name}", "", "| # | Файл | Кусок | Длина | Балл | Хук | Ворота |", "|---|---|---|---|---|---|---|"]; files = []
    for k, (c, h) in enumerate(zip(pick, hooks)):
        hs = re.sub(r"[^\wё]+", "_", h.lower()).strip("_")[:40]; name = f"short_{k + 1}_{hs}.mp4"; f = out / name
        total = render(V, c, h, words, f); files.append(f)
        g = subprocess.run([sys.executable, str(QA / "final_gate.py"), str(f), "--shorts", "--out", str(f.with_suffix(".gate.md"))], capture_output=True, text=True).stdout
        m = re.search(r"Итог: PASS (\d+), WARN (\d+), FAIL (\d+)", g)
        rep.append(f"| {k + 1} | {name} | {int(c['t0'] // 60)}:{c['t0'] % 60:04.1f}–{int(c['t1'] // 60)}:{c['t1'] % 60:04.1f} | {total:.1f} с | {c['score']} | {h} | {'PASS %s WARN %s FAIL %s' % m.groups() if m else '?'} |")
        print(f"{name}: {total:.1f} с, хук «{h}», ворота: {m.group(0) if m else '?'}")
    rep += ["", "## Текст кусков"] + [f"{k + 1}. {c['text']}" for k, c in enumerate(pick)]
    (out / "SHORTS.md").write_text("\n".join(rep), encoding="utf-8")
    sheet(files, out / "shorts_лист.png"); print("Лист кадров:", out / "shorts_лист.png")


if __name__ == "__main__":
    main()
