#!/usr/bin/env python3
"""tools/auto_storyboard.py — автоматическая раскадровка Atlas Studio: сценарий + тайминги озвучки -> story/shots.json.

  python3 tools/auto_storyboard.py --project projects/<slug> [--no-gemini] [--series|--no-series] [--seed 1]

Что делает:
  1. Режет озвучку на кадры по фразам timeline/sentences.json (кадр 2–4 с: короткие фразы склеивает, длинные делит по словам).
  2. Для каждого кадра выбирает шаблон и параметры из библиотеки engine/kit (schema.json — жёсткий список допустимых значений):
     Gemini одним текстовым запросом по JSON-схеме; если Gemini недоступен — эвристики (числа -> цифра/шкала,
     перечисления -> карточка/шаги, вопрос -> «?», «ты» + действие -> общий план с героем, эмоция -> лицо).
  3. Правила монтажа: не больше 2 одинаковых шаблонов подряд, движение камеры в каждом кадре, кадры > 5 с делятся,
     главы — карточками с затемнением, звук-акценты и план музыки по главам.
  4. Пишет story/shots.json, config.json (длительность — только из озвучки + 1,2 с хвост), scenes/kit.js, story/plan_log.json.
"""
import argparse, copy, json, math, os, random, re, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
SCHEMA = json.loads((ROOT / "engine/kit/schema.json").read_text(encoding="utf-8"))
SETS, ICONS, EXPRS, POSES = SCHEMA["sets"], SCHEMA["icons"], SCHEMA["exprs"], SCHEMA["poses"]
KINDS = SCHEMA["kinds"]
SHAPES, ZOOMW, RIBS = SCHEMA.get("shapes", {}), SCHEMA.get("zoom", []), SCHEMA.get("ribbons", ["gold"])
TAIL = 1.2

# ---------------------------------------------------------------- тайминг
def dur_of(p):
    o = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout.strip()
    return float(o)


def norm(w): return re.sub(r"[^\wё]", "", w.lower()).replace("ё", "е")


def para_index(sentences, script):
    """Номер абзаца сценария для каждой фразы (по счёту слов)."""
    paras = [p for p in re.split(r"\n\s*\n", script.strip()) if p.strip()]
    bounds, n = [], 0
    for p in paras: n += len([w for w in p.split() if norm(w)]); bounds.append(n)
    out, n = [], 0
    for s in sentences:
        k = next((i for i, b in enumerate(bounds) if n < b), len(paras) - 1); out.append(k)
        n += len([w for w in s["text"].split() if norm(w)])
    return out, paras


def beats_from(sentences, words, paras_of):
    """Фразы -> кадры 2–4,5 с. Возвращает [{start, text, sents:[i], para, first}]."""
    W = [w for w in words if w.get("word")]
    out = []
    for i, s in enumerate(sentences):
        d = s["end"] - s["start"]
        first = i == 0 or paras_of[i] != paras_of[i - 1]
        if d > 3.6:                                         # длинная фраза: делим по словам, лучше по запятой (кадр ~2,5 с, как в образце)
            ws = [w for w in W if s["start"] - 0.02 <= w["start"] <= s["end"] + 0.02]
            n = max(2, math.ceil(d / 2.7)); cuts = [s["start"]]
            for k in range(1, n):
                target = s["start"] + d * k / n
                cand = sorted(ws[1:], key=lambda w: abs(w["start"] - target) - (0.6 if re.search(r"[,;:—]$", ws[max(0, ws.index(w) - 1)]["word"]) else 0))
                if cand and cand[0]["start"] - cuts[-1] > 1.2 and s["end"] - cand[0]["start"] > 1.2: cuts.append(cand[0]["start"])
            for k, c0 in enumerate(cuts):
                c1 = cuts[k + 1] if k + 1 < len(cuts) else s["end"] + 0.01
                txt = " ".join(w["word"] for w in ws if c0 - 0.01 <= w["start"] < c1) or s["text"]
                out.append(dict(start=c0, text=txt, sents=[i], para=paras_of[i], first=first and k == 0, part=k))
        else:
            out.append(dict(start=s["start"], text=s["text"], sents=[i], para=paras_of[i], first=first, part=0))
    # склейка коротких (< 1,6 с до следующего) с соседом в том же абзаце
    merged = []
    for k, b in enumerate(out):
        nxt = out[k + 1]["start"] if k + 1 < len(out) else None
        if merged and nxt is not None and not b["first"] and (nxt - b["start"]) < 1.3 and (nxt - merged[-1]["start"]) <= 3.6 and merged[-1]["para"] == b["para"]:
            merged[-1]["text"] += " " + b["text"]; merged[-1]["sents"] += b["sents"]; continue
        if merged and nxt is None and (b["start"] - merged[-1]["start"]) < 1.4: merged[-1]["text"] += " " + b["text"]; continue
        merged.append(dict(b))
    merged[0]["start"] = 0.0
    return merged


# ---------------------------------------------------------------- эвристики (без Gemini)
ICON_KEYS = [("крабов", "crabstick"), ("палочк", "crabstick"), ("краб", "crab"), ("рыб", "fish"), ("минта", "fish"), ("завод", "factory"), ("цех", "factory"), ("производ", "factory"), ("лаборатор", "flask"),
             ("химич", "flask"), ("деньг", "money"), ("рубл", "coin"), ("цен", "coin"), ("стоим", "coin"), ("доллар", "money"), ("час", "clock"), ("минут", "clock"),
             ("времен", "clock"), ("телефон", "phone"), ("звон", "phone"), ("опасн", "warning"), ("сердц", "heart"), ("мозг", "brain"), ("вод", "water"), ("кров", "drop"),
             ("сол", "salt"), ("сахар", "sugar"), ("яйц", "egg"), ("яичн", "egg"), ("крахмал", "wheat"), ("мук", "wheat"), ("масл", "oil"), ("огон", "fire"), ("жар", "fire"),
             ("холод", "snow"), ("мороз", "snow"), ("упаков", "box"), ("коробк", "box"), ("груз", "truck"), ("магазин", "cart"), ("покуп", "cart"), ("люд", "people"),
             ("человек", "person"), ("дом", "house"), ("рост", "chart"), ("процент", "percent"), ("звезд", "star"), ("ток", "bolt"), ("энерг", "bolt"), ("растен", "leaf"),
             ("таблет", "pill"), ("лекарств", "pill"), ("глаз", "eye"), ("защит", "shield"), ("мир", "globe"), ("стран", "globe"), ("день", "calendar"), ("дня", "calendar"),
             ("дней", "calendar"), ("год", "calendar"), ("компьют", "chip"), ("машин", "car"), ("бутыл", "bottle"), ("нож", "knife"), ("вес", "scale"), ("грам", "scale"),
             ("микроскоп", "microscope"), ("днк", "dna"), ("клетк", "cell"), ("кост", "bone"), ("солнц", "sun"), ("ноч", "moon"), ("заряд", "battery"), ("секрет", "lock"),
             ("документ", "doc"), ("закон", "doc"), ("состав", "doc"), ("этикет", "doc"), ("кофе", "cup"), ("хлеб", "bread"), ("мяс", "meat"), ("молок", "milk"),
             ("яблок", "apple"), ("радиац", "radiation"), ("вирус", "virus"), ("бактер", "virus"), ("самолёт", "plane"), ("корабл", "ship"), ("судн", "ship"), ("лес", "tree"),
             ("мусор", "trash"), ("отход", "trash"), ("пакет", "bag"), ("звук", "sound"), ("япони", "globe"), ("белок", "egg"), ("краситель", "drop")]
SET_KEYS = [("завод", "factory"), ("цех", "factory"), ("производ", "factory"), ("конвейер", "factory"), ("лаборатор", "lab"), ("учён", "lab"), ("анализ", "lab"),
            ("магазин", "store"), ("полк", "store"), ("куп", "store"), ("кухн", "kitchen"), ("готов", "kitchen"), ("салат", "kitchen"), ("офис", "office"),
            ("компани", "office"), ("бизнес", "office"), ("комнат", "room"), ("дома", "room"), ("диван", "room"), ("улиц", "street"), ("город", "city"), ("ночь", "city")]
EMO = [("страш", "scared"), ("боиш", "scared"), ("ужас", "shocked"), ("шок", "shocked"), ("удив", "surprised"), ("не поверишь", "shocked"), ("боль", "sad"),
       ("плохо", "sad"), ("груст", "sad"), ("зл", "angry"), ("обман", "angry"), ("сомнев", "confused"), ("странн", "confused"), ("думаешь", "thinking"),
       ("кажется", "thinking"), ("рад", "happy"), ("вкусн", "smile"), ("нрав", "smile"), ("тошн", "sad"), ("опасн", "worried"), ("тревог", "worried")]
# v2: лупа, контур тела, предмет со шлейфом
ZOOM_KEYS = [("бактер", "germs"), ("микроб", "germs"), ("плесен", "germs"), ("вирус", "virus"), ("клетк", "cells"), ("клеток", "cells"), ("волокн", "fibers"), ("белок", "fibers"),
             ("кристалл", "crystals"), ("соли", "crystals"), ("капл", "drops"), ("молекул", "drops"), ("жир", "fat"), ("микроскоп", "cells")]
ORGAN_KEYS = [("мозг", ("body", "brain")), ("сердц", ("body", "heart")), ("лёгк", ("body", "lungs")), ("легки", ("body", "lungs")), ("желуд", ("body", "stomach")), ("кишеч", ("body", "gut")),
              ("печен", ("body", "liver")), ("почк", ("body", "kidney")), ("кров", ("body", "blood")), ("кож", ("body", "skin")), ("кост", ("body", "bone")), ("мышц", ("body", "muscle")),
              ("нос", ("head", "nose")), ("обоня", ("head", "nose")), ("глаз", ("head", "eye")), ("зрени", ("head", "eye")), ("горл", ("head", "throat")), ("рот", ("head", "mouth")),
              ("язык", ("head", "mouth")), ("ух", ("head", "ear")), ("слух", ("head", "ear")), ("филе", ("fish", "meat")), ("рыбн", ("fish", "meat"))]
PROP_RE = r"(запах|пахн|вкус|ешь|съешь|съел|пьёшь|выпьешь|нюх|аромат|тянет|соблазн|держишь|откусываешь|глотаешь)"
NUMW = r"(одн\w*|два|две|двух|три|трёх|четыр\w+|пят\w+|шест\w+|сем\w+|восьм\w+|девят\w+|десят\w+|двадцат\w+|тридцат\w+|сорок\w*|пятьдесят|сто|двест\w+|тысяч\w*|миллион\w*|миллиард\w*|половин\w+|треть\w*|четверт\w+)"
STOP = set("и в во на не что это как а но с со к ко по за из у от до для же ли бы то ты тебя тебе твой твоя твои твоё твоего я мы вы он она они его её их там тут так уже ещё всё все вот этот эта эти тот та те который которая которые где когда если чем при о об без над под через".split())


def pick(keys, txt, default=None):
    t = txt.lower()
    for k, v in keys:
        if k in t: return v
    return default


def caption(txt, n=3):
    ws = [w for w in re.findall(r"[\wё\-%]+", txt) if norm(w) not in STOP and len(w) > 2]
    ws = sorted(ws, key=lambda w: (-len(w)))[:n]
    order = [w for w in re.findall(r"[\wё\-%]+", txt) if w in ws]
    return " ".join(dict.fromkeys(order)).upper()[:34]


def numbers(txt):
    return re.findall(r"\d[\d\s]*(?:[.,]\d+)?\s*(?:%|процент\w*|грамм\w*|г\b|кг|рубл\w*|₽|лет|год\w*|час\w*|минут\w*|дн\w+|раз\w*)?", txt) + \
           [m.group(0) for m in re.finditer(r"\b" + NUMW + r"(?:\s+\w+){0,1}", txt.lower())]


def heuristic(b, prev_sets):
    txt = b["text"]; low = txt.lower(); st = prev_sets
    nums = [n.strip() for n in numbers(txt) if n.strip()]
    lst = [x.strip(" .") for x in re.split(r",|\sи\s|:", txt) if x.strip(" .")]
    if b.get("chapter"): return dict(tpl="chapter", head=b["chapter"], set=st)
    if "?" in txt: return dict(tpl="insert", kind="q", set=st, caption=caption(txt, 3))
    sp = spoken_numbers(txt)
    if sp and not re.search(r"\d", txt):                     # число словами -> цифрой на экране
        v = max(sp); big = ("≈" if re.search(r"почти|около|примерно|меньше|больше", low) else "") + f"{v:g}".replace(".", ",") + ("%" if re.search(r"процент|половин|треть|четверт", low) else "")
        rest = [w for w in re.findall(r"[\wё\-]+", txt) if not re.match(r"^" + NUMW + r"$", w.lower()) and w.lower() not in ("почти", "около", "примерно", "меньше", "больше", "бывает", "процентов", "процента")]
        return dict(tpl="diagram", kind="stat", big=big, small=" ".join(rest[:4]).upper())
    if nums:
        big = nums[0].upper()[:14]
        if len(nums) >= 2 and re.search(r"(вместо|против|а не|чем|раз)", low): return dict(tpl="diagram", kind="compare", items=[f"{nums[0].upper()}|{caption(txt.split(nums[0])[0] or txt, 2)}", f"{nums[1].upper()}|{caption(txt.split(nums[1])[-1] or txt, 2)}"])
        return dict(tpl="diagram", kind="stat", big=big, small=caption(txt.replace(nums[0], ""), 5))
    verbs = [x for x in lst if re.search(r"(ют|ет|ят|ит|ут)\b", x.lower())]
    if (re.search(r"(сначала|потом|затем|после этого|в конце)", low) and len(lst) >= 3) or (len(verbs) >= 3 and all(len(x.split()) <= 5 for x in verbs)):
        return dict(tpl="diagram", kind="flow", items=[caption(x, 2) for x in (verbs if len(verbs) >= 3 else lst)[:4]])
    if False: return dict(tpl="diagram", kind="steps", items=[caption(x, 3) for x in lst[:4]])
    if len(lst) >= 4 and all(len(x.split()) <= 4 for x in lst[1:]): return dict(tpl="diagram", kind="card", title=caption(lst[0], 2), items=[x.upper()[:26] for x in lst[1:5]])
    z = pick(ZOOM_KEYS, txt)
    if z: return dict(tpl="insert", kind="zoom", what=z, set=st, caption=caption(txt, 3))
    org = pick(ORGAN_KEYS, txt)
    if org: return dict(tpl="diagram", kind="outline", shape=org[0], spot=org[1], title=caption(txt, 2), small="", big="")
    emo = pick(EMO, txt)
    ic0 = pick(ICON_KEYS, txt)
    if ic0 and re.search(PROP_RE, low): return dict(tpl="prop", icon=ic0, expr=emo or "surprised", set=st, caption=caption(txt, 3))
    if emo and re.search(r"\b(ты|тебе|тебя|твой|твоя)\b", low): return dict(tpl="face", expr=emo, set=st, caption=caption(txt, 3))
    ic = pick(ICON_KEYS, txt)
    if re.search(r"\b(ты|тебе|тебя)\b", low):
        pose = "phone" if "телефон" in low else "reach" if re.search(r"(берёшь|покупаешь|тянешь)", low) else "think" if re.search(r"(думаешь|знаешь|помнишь)", low) else "walk" if re.search(r"(идёшь|заходишь|выходишь)", low) else "stand"
        return dict(tpl="wide", set=st, who="hero", pose=pose, expr=emo or "neutral", caption=caption(txt, 3), hold=ic if pose == "reach" else None)
    if ic: return dict(tpl="insert", kind="icon", icons=[ic], labels=[caption(txt, 2)], set=st, caption="")
    return dict(tpl="wide", set=st, who="pro" if st in ("lab", "factory") else "hero", pose="explain", expr="neutral", caption=caption(txt, 3))


# ---------------------------------------------------------------- Gemini
def gemini_plan(beats, title, fmt):
    import atlas_gemini as AG
    S = {"type": "OBJECT", "properties": {"shots": {"type": "ARRAY", "items": {"type": "OBJECT", "properties": {
        "i": {"type": "INTEGER"}, "tpl": {"type": "STRING", "enum": ["wide", "face", "prop", "insert", "diagram", "chapter"]},
        "shape": {"type": "STRING", "enum": ["none"] + list(SHAPES)}, "spot": {"type": "STRING", "enum": ["none"] + sorted({x for v in SHAPES.values() for x in v})},
        "what": {"type": "STRING", "enum": ["none"] + ZOOMW}, "ribbon": {"type": "STRING", "enum": RIBS},
        "kind": {"type": "STRING", "enum": ["none"] + KINDS["insert"] + KINDS["diagram"]}, "set": {"type": "STRING", "enum": SETS},
        "caption": {"type": "STRING"}, "who": {"type": "STRING", "enum": ["hero", "pro", "person"]}, "second": {"type": "STRING", "enum": ["none", "pro", "person", "crowd"]},
        "pose": {"type": "STRING", "enum": POSES}, "expr": {"type": "STRING", "enum": EXPRS}, "icons": {"type": "ARRAY", "items": {"type": "STRING", "enum": ICONS}},
        "big": {"type": "STRING"}, "small": {"type": "STRING"}, "title": {"type": "STRING"}, "items": {"type": "ARRAY", "items": {"type": "STRING"}},
        "values": {"type": "ARRAY", "items": {"type": "NUMBER"}}, "msgs": {"type": "ARRAY", "items": {"type": "STRING"}}, "head": {"type": "STRING"},
        "accent": {"type": "STRING", "enum": ["gold", "red", "green", "cyan", "cream"]}},
        "required": ["i", "tpl", "kind", "set", "caption", "who", "second", "pose", "expr", "icons", "big", "small", "title", "items", "values", "msgs", "head", "accent", "shape", "spot", "what", "ribbon"]}}}, "required": ["shots"]}
    lines = "\n".join(f'{k}. [{b["end"] - b["start"]:.1f} с{", НАЧАЛО АБЗАЦА" if b["first"] else ""}] {b["text"]}' for k, b in enumerate(beats))
    prompt = f"""Ты режиссёр монтажа объясняющего ролика для взрослых (русский YouTube, тёмный кинематографичный 2D-стиль: силуэты людей с контровым светом, декорации, инфографика).
Тема ролика: «{title}». Формат: {'вертикальный Shorts' if fmt == 'shorts' else 'горизонтальный 16:9'}.
Для КАЖДОГО кадра ниже (номер i и текст диктора) выбери, что показать. Только допустимые значения из схемы.

Шаблоны (tpl):
- wide: общий план — декорация set + герой who (hero = «ты», зритель; pro = специалист в халате; person = другой взрослый) с позой pose и выражением expr; second — второй персонаж или толпа; caption — надпись 1–4 слова сверху.
- face: крупный план лица героя (who) с эмоцией expr на размытой декорации set; можно 1 иконку в icons рядом. Для эмоций и реакций.
- prop: крупное лицо героя + большой ПРЕДМЕТ (icons[0]) рядом, от предмета к лицу тянется светящийся шлейф цвета ribbon (запах, вкус, соблазн, «тянет», герой держит/ест/нюхает). expr — реакция.
- insert (kind): phone — телефон с сообщениями msgs (2–3 коротких реплики) или звонком (big = имя звонящего, items=["call"]); money — ценник: big цена («149 ₽»), small подпись;
  gauge — шкала-прибор: values=[значение, максимум], small = единица; icon — 1–3 крупные иконки icons с подписями items; q — большой «?» (caption — вопрос 2–4 слова); sign — предупреждающий знак.
- diagram (kind): stat — одна большая цифра big + small пояснение; scale — шкала: title подпись, values=[максимум, до какого значения заполнить, метка1, метка2...], items = подписи меток;
  graph — график: title, values = 4–6 точек от 0 до 1 (форма кривой), items = 3 подписи оси X; card — карточка: title + items 2–4 строки; people — люди-иконки: values=[всего, выделено], title подпись;
  rule — правило: big номер, title заголовок, small пояснение; compare — сравнение двух: items = ["ЧИСЛО|подпись", "ЧИСЛО|подпись"], title заголовок; steps — шаги 1-2-3: items 3–4 шага по 1–3 слова, title;
  ingredients — состав: items названия, icons иконки к каждому, values доли в % (если долей нет, не выдумывай — используй card); timeline — таймлайн: items = ["ДАТА|подпись", ...] 3–5 штук, title;
  bars — столбики: items подписи, values числа, title.
  flow — ЦЕПОЧКА превращения/пути (сырьё → обработка → продукт; нос → фильтр → мозг): items = 2–4 звена по 1–2 слова, icons — иконка к каждому звену, title заголовок. Предпочитай flow вместо steps и card, когда есть процесс.
  outline — контурный рисунок shape (head/body/fish) с выноской на точке spot (орган, часть тела, часть рыбы): title = подпись выноски, big = число из текста (если есть), small = пояснение.
- insert zoom — «под микроскопом»: светлая линза с частицами what (germs бактерии, cells клетки, fibers волокна, crystals кристаллы, drops капли, fat жир, virus вирусы); caption — подпись снизу.
- chapter: карточка новой главы, только на НАЧАЛЕ АБЗАЦА, если первая фраза абзаца — короткий заголовок; head = 1–3 слова.

Заполни ВСЕ поля каждого кадра: поля, которые шаблону не нужны, оставь пустыми ("" или []), а нужные шаблону (items, values, icons, big, small, title) заполни обязательно — схема без данных бесполезна.
Правила: цифры и факты бери ТОЛЬКО из текста диктора, ничего не выдумывай. Подписи и caption — ПРОПИСНЫМИ, коротко (≤ 4 слов, ≤ 28 символов).
Чередуй: не больше 2 одинаковых tpl подряд, примерно 30% wide/face/prop с людьми, 40% diagram, 30% insert. Число в тексте — почти всегда diagram (stat/compare/scale/people/outline).
Разнообразие важнее всего: соседние кадры должны отличаться и по типу, и по цвету. Не используй card больше 2 раз за ролик — вместо списков flow или icon. Орган/часть тела — outline, микромир (бактерии, клетки, волокна) — zoom, запах/вкус/еда в руке — prop.
Перечисление — card/steps/ingredients. Вопрос — insert q или face с expr thinking/confused. Обращение «ты» + действие — wide с героем hero.
Декорации set держи постоянными внутри смысловой части (2–3 разных set на ролик, плюс void только для схем). Никаких детских образов, никаких животных-персонажей.

Кадры:
{lines}
"""
    res = AG.gen_json(prompt, S, temperature=0.6, what="раскадровка")
    if not res or not isinstance(res.get("shots"), list): return None, AG.LOG
    by = {int(x.get("i", -1)): x for x in res["shots"]}
    return [by.get(k) for k in range(len(beats))], AG.LOG


# ---------------------------------------------------------------- план -> params кадра
def up(s, n=28): return re.sub(r"\s+", " ", str(s or "")).strip().upper()[:n]


def pairs(items):
    out = []
    for it in items or []:
        a, _, b = str(it).partition("|"); out.append([up(a, 16), up(b, 24)])
    return out


UNITS = {"ноль": 0, "один": 1, "одна": 1, "одно": 1, "одного": 1, "одной": 1, "два": 2, "две": 2, "двух": 2, "три": 3, "трёх": 3, "трех": 3, "четыре": 4, "четырёх": 4, "четырех": 4,
         "пять": 5, "пяти": 5, "шесть": 6, "шести": 6, "семь": 7, "семи": 7, "восемь": 8, "восьми": 8, "девять": 9, "девяти": 9, "десять": 10, "десяти": 10,
         "одиннадцать": 11, "двенадцать": 12, "пятнадцать": 15, "двадцать": 20, "двадцати": 20, "тридцать": 30, "тридцати": 30, "сорок": 40, "сорока": 40,
         "пятьдесят": 50, "пятидесяти": 50, "шестьдесят": 60, "семьдесят": 70, "восемьдесят": 80, "девяносто": 90, "сто": 100, "ста": 100, "двести": 200, "триста": 300}
FRAC = {"половин": 50, "треть": 33, "четверт": 25}


def spoken_numbers(txt):
    """Числа, сказанные в тексте: цифрами и словами («сорок пять» -> 45, «половина» -> 50, «трёх десятых» -> 0.3)."""
    low = txt.lower().replace("ё", "е"); out = {float(x.replace(",", ".")) for x in re.findall(r"\d+(?:[.,]\d+)?", low)}
    toks = re.findall(r"[а-я]+", low); cur = None
    for k, w in enumerate(toks + [""]):
        if re.match(r"^(десят|сот)(ых|ая|ые|ой)$", w) and cur is not None: out.discard(cur); out.add(cur / (10 if w.startswith("десят") else 100)); cur = None; continue
        v = UNITS.get(w) if w else None
        if v is None: v = next((UNITS[u] for u in UNITS if len(u) > 3 and w.startswith(u[:-1]) and len(w) <= len(u) + 2), None) if w and len(w) > 3 else None
        if v == 1 and not (cur and cur >= 20): v = None                                  # «одна добавка» — не число
        if v is not None:
            cur = cur + v if cur is not None and ((cur >= 100 and cur % 100 == 0 and v < 100) or (cur >= 20 and cur % 10 == 0 and v < 10)) else v; out.add(cur); continue
        if w.startswith(("тысяч",)) and cur: out.add(cur * 1000)
        cur = None
        for f, fv in FRAC.items():
            if w.startswith(f): out.add(fv)
    return out


def said_word(w, txt_words):
    """Слово есть в речи с точностью до окончания (вода/воду, рыба/рыбы)."""
    w = norm(w); k = max(3, len(w) - 1)
    return len(w) < 3 or any(t.startswith(w[:k]) or w.startswith(t[:max(3, len(t) - 1)]) for t in txt_words if len(t) >= 3)


def has_nums(txt, vals):
    """Числа плана должны быть в тексте диктора: цифрами или словами. Иначе это выдумка — такой кадр не строим."""
    low = txt.lower()
    if re.search(r"\b" + NUMW, low): return True
    digs = set(re.findall(r"\d+", low.replace(" ", "")))
    return bool(vals) and all(any(str(int(v)) in dg or f"{v:g}".replace(".", "") in dg for dg in digs) for v in vals if v >= 2)


def fix_num(s): return re.sub(r"(\d)\.(\d)", r"\1,\2", s)


def to_params(d, b, cur_set, rnd):
    tpl, kind = d.get("tpl"), d.get("kind") or "none"
    st = d.get("set") if d.get("set") in SETS else cur_set
    if st == "void" and tpl in ("wide", "face"): st = cur_set if cur_set != "void" else "city"
    cap = up(d.get("caption"), 30)
    txt = [dict(str=cap, y=0.2, mode=rnd.choice(["slam", "rise"]), at=0.25, c=d.get("accent") or "gold")] if cap else []
    vals = [v for v in (d.get("values") or []) if isinstance(v, (int, float))]
    said = spoken_numbers(b["text"])
    def ok_num(x): return all(any(abs(float(n.replace(",", ".")) - v) < 0.01 or abs(float(n.replace(",", ".")) - v) / max(v, 1e-9) < 0.12 for v in said) for n in re.findall(r"\d+(?:[.,]\d+)?", str(x)))
    stems = {norm(w)[:4] for w in b["text"].split() if len(norm(w)) >= 4}
    if d.get("big") and not ok_num(d["big"]): d = dict(d, big=None)
    items = [str(x) for x in (d.get("items") or []) if str(x).strip()]
    items = [x for x in items if ok_num(x)]
    if kind == "compare": items = [x for x in items if not re.search(r"\d", x) or any(norm(w)[:4] in stems for w in str(x).partition("|")[2].split() if len(norm(w)) >= 4)]   # число и подпись должны быть из одной фразы                                            # подписи с числами, которых нет в речи, — выдумка
    if kind == "gauge" and not (vals and str(int(vals[0])) in re.sub(r"\s", "", b["text"])): kind = "icon"; d = dict(d, kind="icon")
    if kind in ("gauge", "scale", "people", "bars", "money") and vals and not all(any(abs(v - x) <= 0.12 * max(1, abs(x)) for x in said | {100.0, 10.0, 1.0}) for v in vals[:2]) or kind in ("stat", "money") and not d.get("big"):
        kind = "none"; d = dict(d, kind=kind, big=None, values=[], items=[]); items, vals = [], []                 # выдуманные числа и подписи к ним убираем
        if tpl == "diagram" and kind == "none": tpl = "wide"
        elif tpl == "insert": kind = "icon"
    icons = [i for i in (d.get("icons") or []) if i in ICONS]
    if tpl == "chapter": return dict(tpl="chapter", head=" ".join(up(d.get("head") or d.get("caption") or b["text"], 22).strip(" .").split()[:3]), sub=up(d.get("small"), 30) or None, bg=dict(set=st if st != "void" else "city"))
    if tpl == "prop":
        ex = d.get("expr") if d.get("expr") in EXPRS else "surprised"
        ic = icons[0] if icons else pick(ICON_KEYS, b["text"], None)
        if ic:
            p = dict(tpl="prop", icon=ic, expr={"smile": "surprised", "happy": "surprised", "neutral": "thinking"}.get(ex, ex), c=d.get("ribbon") if d.get("ribbon") in RIBS else rnd.choice(RIBS), bg=dict(set=st if st != "void" else cur_set), side=rnd.choice([1, -1]), text=[dict(t, y=0.16) for t in txt])
            return p
        tpl = "face"
    if tpl == "face":
        ex = d.get("expr") if d.get("expr") in EXPRS else "thinking"
        ex = {"smile": "thinking", "happy": "thinking", "smirk": "thinking", "neutral": "thinking", "awe": "surprised"}.get(ex, ex)          # крупное лицо без «смайлика»: взрослая подача
        p = dict(tpl="face", who=d.get("who") if d.get("who") in ("hero", "pro") else "hero", expr=ex, bg=dict(set=st), side=rnd.choice([1, -1]), look=[round(rnd.uniform(.2, .6), 2), round(rnd.uniform(-.3, .1), 2)], text=[dict(t, y=0.18) for t in txt])
        if p["side"] < 0: p["fx0"] = 0.7
        if icons: p["icon"] = icons[0]
        return p
    if tpl == "insert":
        bg = dict(set=st if st != "void" else cur_set)
        if kind == "phone":
            if "call" in [i.lower() for i in items]: return dict(tpl="insert", kind="phone", mode="call", **{"from": up(d.get("big") or "НЕИЗВЕСТНЫЙ НОМЕР", 22)}, bg=bg, text=[])
            msgs = [str(m)[:60] for m in (d.get("msgs") or items)][:3] or [b["text"][:60]]
            return dict(tpl="insert", kind="phone", mode="msg", **{"from": up(d.get("title") or "СООБЩЕНИЯ", 20)}, msgs=msgs, bg=bg, text=[])
        if kind == "money" and d.get("big"): return dict(tpl="insert", kind="money", big=up(d["big"], 12), small=up(d.get("small"), 30) or None, bg=bg, text=[])
        if kind == "gauge" and vals: return dict(tpl="insert", kind="gauge", val=vals[0], max=vals[1] if len(vals) > 1 and vals[1] > 0 else max(1, vals[0] * 1.4), unit=up(d.get("small"), 16) or None, bg=bg, text=[dict(t, y=0.14) for t in txt])
        if kind == "zoom":
            w = d.get("what") if d.get("what") in ZOOMW else pick(ZOOM_KEYS, b["text"], "cells")
            return dict(tpl="insert", kind="zoom", what=w, mag=rnd.choice(["×100", "×400", "×1000"]), label=cap or None, bg=bg, text=[])
        if kind == "q": return dict(tpl="insert", kind="q", bg=bg, text=[dict(str=cap or "ПОЧЕМУ?", y=0.82, mode="slam", at=0.3, c="cream")])
        if kind == "sign": return dict(tpl="insert", kind="sign", icon=icons[0] if icons else "warning", bg=bg, text=[dict(str=cap or "ВНИМАНИЕ", y=0.8, mode="slam", at=0.3, c="accent")])
        ic = icons or [pick(ICON_KEYS, b["text"], "warning")]
        return dict(tpl="insert", kind="icon", icons=ic[:3], labels=[up(x, 18) for x in items[:3]] or ([cap] if cap and len(ic) == 1 else []), bg=bg, text=[] if (items or len(ic) == 1) else txt)
    if tpl == "diagram":
        title = up(d.get("title") or d.get("head"), 40)
        if kind == "stat" and d.get("big") and re.search(r"\d|%|½", str(d["big"])):
            bg_ = fix_num(up(d["big"], 14)); bg_ = ("≈" + bg_) if re.search(r"почти|около|примерно|порядка", b["text"].lower()) and not re.search(r"[≈~<>]", bg_) else bg_
            return dict(tpl="diagram", kind="stat", big=bg_, small=up(d.get("small"), 46) or None, col="red" if d.get("accent") == "red" else None)
        if kind == "scale" and len(vals) >= 2 and vals[0] > 0:
            lab = lambda k, v: up(items[k], 26) if k < len(items) and any(norm(w)[:4] in stems for w in items[k].split() if len(norm(w)) >= 4) else f"{v:g}".replace(".", ",")
            marks = [[v, lab(k, v)] for k, v in enumerate(vals[2:6])]                      # подпись метки — только словами из речи
            mx = vals[0]; top = max([vals[1]] + [m[0] for m in marks])
            if top > 0 and mx > top * 2.5: mx = float(f"{top * 1.6:.2g}")             # шкала не должна быть «пустой»: максимум под данные
            return dict(tpl="diagram", kind="scale", label=title or cap, max=mx, to=min(vals[1], mx), marks=marks)
        if kind == "graph" and len(vals) >= 3:
            ys = [max(0.04, min(0.96, float(v))) for v in vals[:7]]; pts = [[round(k / (len(ys) - 1), 3), y] for k, y in enumerate(ys)]
            ticks = [[round(k / max(1, len(items[:3]) - 1), 2), up(x, 12)] for k, x in enumerate(items[:3])]
            return dict(tpl="diagram", kind="graph", label=title or cap, pts=pts, ticks=ticks, red=d.get("accent") == "red")
        if kind == "people" and len(vals) >= 2 and 1 <= vals[0] <= 40: return dict(tpl="diagram", kind="people", n=int(vals[0]), hi=int(min(vals[1], vals[0])), label=title or cap, at=0.8)
        if kind == "rule" and title and d.get("small") and re.search(r"правил|перв|втор|трет|во-первых|запомни", b["text"].lower()): return dict(tpl="diagram", kind="rule", n=up(d.get("big") or "1", 3), head=up(title, 24), sub=up(d.get("small"), 44))
        if kind == "compare" and len(items) >= 2 and all(re.search(r"\d", x.partition("|")[0]) for x in items[:2]):
            cols = ["red", "green"]; return dict(tpl="diagram", kind="compare", items=[[a, b2, cols[k]] for k, (a, b2) in enumerate(pairs(items[:2]))], head=title or None, arrow=True)
        if kind in ("flow", "steps") and len(items) >= 2:                     # цепочка со значками вместо карточек-шагов
            tw = [norm(w) for w in b["text"].split()]
            its = [up(x.partition("|")[0], 16) for x in items[:4]]
            if all(any(said_word(w, tw) for w in re.findall(r"[а-яёa-z]{4,}", x.lower())) or not re.findall(r"[а-яёa-z]{4,}", x.lower()) for x in its):
                return dict(tpl="diagram", kind="flow", items=[dict(icon=icons[k] if k < len(icons) else pick(ICON_KEYS, x, "box"), label=x) for k, x in enumerate(its)], head=title or None)
        if kind == "outline":
            shp = d.get("shape") if d.get("shape") in SHAPES else None; org = pick(ORGAN_KEYS, b["text"])
            if not shp and org: shp = org[0]
            if shp:
                spot = d.get("spot") if d.get("spot") in SHAPES[shp] else (org[1] if org and org[0] == shp else SHAPES[shp][0])
                big = fix_num(up(d.get("big"), 12)) if d.get("big") and re.search(r"\d|%", str(d.get("big"))) else None
                return dict(tpl="diagram", kind="outline", shape=shp, spot=spot, label=title or cap or None, small=up(d.get("small"), 26) or None, big=big)
        if kind == "steps" and len(items) >= 2: return dict(tpl="diagram", kind="steps", items=[up(x, 26) for x in items[:4]], head=title or None)
        if kind == "ingredients" and len(items) >= 2:
            its = [dict(name=str(x)[:24], icon=icons[k] if k < len(icons) else pick(ICON_KEYS, str(x), "box"), share=vals[k] if k < len(vals) else None) for k, x in enumerate(items[:6])]
            return dict(tpl="diagram", kind="ingredients", items=its, head=title or None, hi=0)
        if kind == "timeline" and len(items) >= 2: return dict(tpl="diagram", kind="timeline", items=pairs(items[:5]), head=title or None, at=len(items[:5]) - 1)
        if kind == "bars" and len(items) >= 2 and len(vals) >= 2: return dict(tpl="diagram", kind="bars", rows=[dict(label=str(x)[:24], v=vals[k], val=str(vals[k]).replace(".", ",")) for k, x in enumerate(items[:5]) if k < len(vals)], head=title or None)
        if items:                                                    # карточка: только слова из речи, без повторов
            tw = [norm(w) for w in b["text"].split()]
            ok = lambda x: all(said_word(w, tw) for w in re.findall(r"[а-яёa-z]{4,}", x.lower()))
            lines, tails = [], set()
            for x in items[:4]:
                head, _, tail = x.partition("|")
                if tail and norm(tail) in tails: continue
                tails.add(norm(tail)); lines.append(up(x.replace("|", " — "), 30))
            lines = [l for l in lines if ok(l)]
            ttl = title or cap or ""                                    # заголовок карточки — рубрика, а не факт; проверяем строки
            if len(lines) >= 2: return dict(tpl="diagram", kind="card", title=ttl or "ГЛАВНОЕ", lines=lines, accent="#ffd47e")
            if lines:
                h_, _, t_ = lines[0].partition(" — ")
                if t_: return dict(tpl="insert", kind="icon", icons=[pick(ICON_KEYS, h_, "doc"), pick(ICON_KEYS, t_, "coin")], labels=[h_, "= " + t_], bg=dict(set=cur_set), text=[])
                return dict(tpl="insert", kind="icon", icons=[pick(ICON_KEYS, b["text"], "doc")], labels=[lines[0]], bg=dict(set=cur_set), text=[])
        if d.get("big") and re.search(r"\d|%", str(d["big"])): return dict(tpl="diagram", kind="stat", big=up(d["big"], 14), small=up(d.get("small") or cap, 46))
        tpl = "wide"                                             # схема без данных — не рисуем пустую, показываем сцену
        if st == "void": st = cur_set if cur_set != "void" else "city"
    if st == "void": st = cur_set if cur_set != "void" else "city"
    who = d.get("who") if d.get("who") in ("hero", "pro", "person") else "hero"
    pose = d.get("pose") if d.get("pose") in POSES else "stand"
    walk = pose == "walk"
    hx = rnd.choice([0.3, 0.36, 0.62, 0.68]); f = 1 if hx < 0.5 else -1
    acts = [dict(t=who, x=hx, s=1.45, f=f, expr={"happy": "smirk", "smile": "smirk", "awe": "surprised"}.get(d.get("expr"), d.get("expr")) if d.get("expr") in EXPRS else "neutral", **({"walk": True, "vx": 0.05 * f} if walk else {"pose": pose}))]
    if d.get("icons") and pose in ("reach", "holdFront", "explain", "point"): acts[0]["hold"] = icons[0] if icons else None
    sec = d.get("second") or "none"
    if sec in ("pro", "person"): acts.append(dict(t=sec, x=round(1 - hx + rnd.uniform(-.04, .04), 2), s=1.42, f=-f, pose=rnd.choice(["explain", "talk", "crossArms"]), expr="neutral"))
    elif sec == "crowd": acts.append(dict(t="person", x=round(1 - hx, 2), s=1.42, f=-f, pose="crossArms", expr="neutral"))   # мелкая толпа читается как шум — второй взрослый вместо неё
    elif icons and not acts[0].get("hold"): acts.append(dict(t="obj", x=round(1 - hx, 2), s=1.2, icon=icons[0]))
    return dict(tpl="wide", set=st, actors=acts, text=txt)


# ---------------------------------------------------------------- правила монтажа
CAMS = [(1.0, 1.1, 30, -30), (1.12, 1.0, -40, 40), (1.0, 1.12, 0, 0), (1.1, 1.02, 50, -50), (1.04, 1.14, -30, 20)]


def fix_runs(shots):
    """Итоговая проверка: не больше 2 одинаковых шаблонов подряд (после деления длинных кадров и всех замен)."""
    n = 0
    for k in range(2, len(shots)):
        a, b, c = (shots[k - 2]["params"]["tpl"], shots[k - 1]["params"]["tpl"], shots[k]["params"]["tpl"])
        if not (a == b == c) or c in ("title", "chapter"): continue
        P = shots[k]["params"]; st = shots[k].get("_set") or "city"; cap = (P.get("text") or [{}])[0].get("str") if P.get("text") else None; n += 1
        if c == "wide":
            who = next((x["t"] for x in P.get("actors", []) if x.get("t") in ("hero", "pro")), "hero"); ex = next((x.get("expr") for x in P.get("actors", []) if x.get("expr")), "thinking")
            shots[k]["params"] = dict(tpl="face", who=who, expr={"smile": "thinking", "happy": "thinking", "neutral": "thinking"}.get(ex, ex), bg=dict(set=st), side=-1, fx0=0.7, look=[-0.4, -0.1], text=[dict(str=cap, y=0.18, mode="rise", at=0.25, c="gold")] if cap else [])
        elif c == "face": shots[k]["params"] = dict(tpl="wide", set=st, actors=[dict(t=P.get("who", "hero"), x=0.62, s=1.45, f=-1, pose="think", expr=P.get("expr", "thinking"))], text=P.get("text", []), z0=1.3, z1=1.4, x0=150, x1=100)
        elif c == "diagram" and P.get("kind") == "stat":
            ic = pick(ICON_KEYS, shots[k].get("line", ""), "chart"); shots[k]["params"] = dict(tpl="insert", kind="icon", icons=[ic], labels=[P.get("small") or ""], bg=dict(set=st), text=[dict(str=P.get("big", ""), y=0.16, mode="slam", at=0.2, c="gold")])
        elif c == "diagram": shots[k]["params"] = dict(tpl="wide", set=st, actors=[dict(t="pro", x=0.32, s=1.45, f=1, pose="explain", expr="neutral")], text=[dict(str=up(P.get("title") or P.get("head") or P.get("label") or caption(shots[k].get("line", ""), 3), 28), y=0.2, mode="rise", at=0.25, c="gold")])
        elif c == "insert": shots[k]["params"] = dict(tpl="wide", set=st, actors=[dict(t="hero", x=0.64, s=1.45, f=-1, pose="stand", expr="thinking")], text=P.get("text", []) if P.get("kind") != "q" else [])
        Q = shots[k]["params"]; Q.setdefault("z0", 1.0); Q.setdefault("z1", 1.08); Q["seed"] = 100 + k
    return n


def edit_rules(shots, cur_sets, rnd):
    def same(k): return k >= 2 and shots[k]["params"]["tpl"] == shots[k - 1]["params"]["tpl"] == shots[k - 2]["params"]["tpl"]
    for k in range(len(shots)):
        P = shots[k]["params"]
        if same(k):                                   # третий одинаковый подряд — меняем план
            t = P["tpl"]; st = cur_sets[k]
            if t == "wide": shots[k]["params"] = dict(tpl="face", who=P["actors"][0]["t"] if P.get("actors") and P["actors"][0]["t"] in ("hero", "pro") else "hero", expr=(P.get("actors") or [{}])[0].get("expr", "thinking"), bg=dict(set=st), side=1, text=[dict(x, y=0.18) for x in P.get("text", [])])
            elif t == "face": shots[k]["params"] = dict(tpl="wide", set=st, actors=[dict(t="hero", x=0.36, s=1.45, f=1, pose="think", expr=P.get("expr", "neutral"))], text=P.get("text", []))
            elif t == "diagram" and P.get("kind") not in ("stat",): shots[k]["params"] = dict(tpl="wide", set=st, actors=[dict(t="pro", x=0.32, s=1.45, f=1, pose="explain", expr="neutral")], text=[dict(str=up(P.get("title") or P.get("head") or P.get("label") or caption(shots[k]["line"], 3), 28), y=0.2, mode="rise", at=0.25, c="gold")])
            elif t == "insert": shots[k]["params"] = dict(tpl="wide", set=st, actors=[dict(t="hero", x=0.64, s=1.45, f=-1, pose="stand", expr="thinking")], text=P.get("text", []))
        if k and shots[k]["params"].get("kind") and shots[k]["params"].get("kind") == shots[k - 1]["params"].get("kind") and shots[k]["params"]["tpl"] == "diagram" and shots[k]["params"]["kind"] in ("stat", "card"):
            shots[k]["params"]["z0"], shots[k]["params"]["z1"] = 1.12, 1.0          # две одинаковые схемы подряд — хотя бы разное движение
    faces = [k for k, sh in enumerate(shots) if sh["params"]["tpl"] == "face"]          # крупных лиц не больше ~15%
    limit = max(2, int(len(shots) * 0.15)); last_face = -9
    for k in faces:
        if len([f for f in faces if f <= k]) > limit or k - last_face < 3:
            P = shots[k]["params"]; shots[k]["params"] = dict(tpl="wide", set=cur_sets[k], actors=[dict(t=P.get("who", "hero"), x=0.62, s=1.45, f=-1, pose="think" if P.get("expr") in ("thinking", "confused") else "stand", expr=P.get("expr", "neutral"))], text=[dict(x, y=0.2) for x in P.get("text", [])], frame="medium")
        else: last_face = k
    nwide, prev = 0, None
    for k, sh in enumerate(shots):                     # общий и средний план по очереди; разные герои и стороны
        P = sh["params"]
        if P["tpl"] != "wide" or not P.get("actors"): continue
        a0 = next((x for x in P["actors"] if x.get("t") in ("hero", "pro", "person")), None)
        if prev and a0 and prev[0] == P.get("set") and prev[1] == a0["t"] and abs(prev[2] - a0["x"]) < 0.2:
            for x in P["actors"]:
                if x.get("t") != "crowd": x["x"] = round(1 - x["x"], 2); x["f"] = -x.get("f", 1)
        if a0: prev = (P.get("set"), a0["t"], a0["x"])
        nwide += 1
        fr = P.get("frame") or ["wide", "medium", "wide", "close"][nwide % 4]
        if fr in ("medium", "close") and a0 and len(P["actors"]) == 1:              # средний / крупный план героя: камера на нём
            z = 1.3 if fr == "medium" else 1.65; cx = (a0["x"] - 0.5) * 1920 * (0.72 if fr == "medium" else 0.9)
            P.update(z0=z, z1=z + 0.1, x0=round(cx + 30), x1=round(cx - 30), y0=0, frame=fr)
    for k, sh in enumerate(shots):                     # камера в каждом кадре
        P = sh["params"]; z0, z1, x0, x1 = CAMS[k % len(CAMS)]
        if P["tpl"] in ("wide", "title"): P.setdefault("z0", z0); P.setdefault("z1", z1); P.setdefault("x0", x0); P.setdefault("x1", x1)
        elif P["tpl"] in ("diagram", "insert", "chapter"): P.setdefault("z0", 1.0 if k % 2 else 1.07); P.setdefault("z1", 1.07 if k % 2 else 1.0)
        P["seed"] = 3 + k
        for x in P.get("text", []) or []: x["y"] = min(0.7, x.get("y", 0.2))


SFX_OF = {"prop": [("whoosh", 0.25, -14)], "zoom": [("riser", 0.05, -16)], "flow": [("pop", 0.2, -12), ("pop", 0.6, -12)], "outline": [("whoosh", 0.1, -14), ("hit", 1.25, -10)], "chapter": [("impact", 0.05, -6)], "stat": [("hit", 0.15, -8)], "compare": [("hit", 0.3, -9)], "people": [("pop", 0.9, -12)], "q": [("whoosh", 0.1, -12)],
          "phone": [("phonebuzz", 0.3, -14)], "money": [("counter", 0.2, -12)], "steps": [("pop", 0.35, -12)], "ingredients": [("pop", 0.35, -12)], "timeline": [("whoosh", 0.2, -12)],
          "sign": [("stinger", 0.2, -12)], "gauge": [("tick", 0.3, -10), ("tick", 0.8, -10)], "graph": [("riser", 0.1, -16)]}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--project", required=True); ap.add_argument("--no-gemini", action="store_true")
    ap.add_argument("--series", dest="series", action="store_true", default=None); ap.add_argument("--no-series", dest="series", action="store_false")
    ap.add_argument("--seed", type=int, default=1); ap.add_argument("--replan", action="store_true"); ap.add_argument("--format", choices=["long", "shorts"])
    a = ap.parse_args(); P = Path(a.project).resolve(); rnd = random.Random(a.seed)
    cfg = json.loads((P / "config.json").read_text(encoding="utf-8"))
    sentences = json.loads((P / "timeline/sentences.json").read_text(encoding="utf-8"))
    wj = json.loads((P / "timeline/words.json").read_text(encoding="utf-8")); words = wj["words"] if isinstance(wj, dict) else wj
    script = (P / cfg.get("script", "input/script.txt")).read_text(encoding="utf-8") if (P / cfg.get("script", "input/script.txt")).exists() else "\n\n".join(s["text"] for s in sentences)
    fmt = a.format or ("shorts" if cfg.get("aspect") == "9:16" else "long")
    voice = P / cfg.get("voiceover", "input/voiceover.wav"); VD = dur_of(voice); END = round(VD + TAIL, 2)
    paras_of, paras = para_index(sentences, script)
    beats = beats_from(sentences, words, paras_of)
    for k, b in enumerate(beats): b["end"] = beats[k + 1]["start"] if k + 1 < len(beats) else END
    series = a.series if a.series is not None else bool(re.search(r"продолжение следует", script.lower()))
    # главы: первая фраза абзаца — короткий заголовок («Час ноль.», «Первые часы.»)
    for b in beats:
        if b["first"] and b["para"] > 0 and len(b["text"].split()) <= 4 and fmt == "long" and END > 150: b["chapter"] = up(b["text"].strip(" ."), 22)
    plan, log, src = None, [], "эвристики"
    if not a.no_gemini:
        (P / "story").mkdir(exist_ok=True); cache = P / "story/gemini_plan.json"; key = [b["text"] for b in beats]
        if cache.exists() and not a.replan and json.loads(cache.read_text(encoding="utf-8")).get("key") == key:
            plan = json.loads(cache.read_text(encoding="utf-8"))["plan"]; log = ["Gemini: план из кэша story/gemini_plan.json (без нового запроса; --replan чтобы спросить заново)"]
        else:
            try: plan, log = gemini_plan(beats, cfg.get("title", ""), fmt)
            except Exception as e: log = [f"Gemini: ошибка {str(e)[:120]}"]
            if plan: cache.write_text(json.dumps(dict(key=key, plan=plan), ensure_ascii=False, indent=1), encoding="utf-8")
        if plan: src = "Gemini"
    shots, cur, cur_sets, stats = [], None, [], {"gemini": 0, "heur": 0, "fixed": 0}
    pal = ["city", "room", "lab", "street", "office", "kitchen"]
    para_set = {i: pick(SET_KEYS, ptxt) or pal[i % len(pal)] for i, ptxt in enumerate(paras)}   # декорация абзаца по ключевым словам, иначе по кругу
    for k, b in enumerate(beats):
        d = plan[k] if plan and plan[k] else None
        if d: stats["gemini"] += 1
        else: d = heuristic(b, para_set.get(b["para"], "city")); stats["heur"] += 1
        if b.get("chapter"): d = dict(tpl="chapter", head=b["chapter"], set=d.get("set") or cur, kind="none", caption="")
        if d.get("tpl") == "chapter" and not (b["first"] and len(b["text"].split()) <= 6 and END > 150 and k > 0): d["tpl"] = "diagram" if d.get("big") else "wide"; stats["fixed"] += 1   # глава — только короткий заголовок в начале абзаца
        if d.get("set") in SETS and d["set"] != "void": cur = d["set"]
        cur = cur or para_set.get(b["para"], "city")
        params = to_params(d, b, cur, rnd)
        cur_sets.append(cur)
        shots.append(dict(start=round(b["start"], 2), end=round(b["end"], 2), bars="wide" if fmt == "long" else "none", **{"in": dict(type="dip", dur=0.25) if params["tpl"] == "chapter" else dict(type="cut")},
                          sfx=[dict(at=at, name=n, gain=g) for n, at, g in SFX_OF.get(params.get("kind") or params["tpl"], [])], params=params, line=b["text"][:120], src="g" if plan and plan[k] else "h", _set=cur))
    # первый кадр — хук с героем, если там схема без людей; финал
    if shots[0]["params"]["tpl"] in ("diagram", "chapter"): shots[0]["params"] = to_params(dict(tpl="wide", set=cur_sets[0], who="hero", pose="stand", expr="thinking", caption=caption(beats[0]["text"], 3)), beats[0], cur_sets[0], rnd)
    last = shots[-1]
    if series and re.search(r"продолжение следует", last["line"].lower()):
        last["params"] = dict(tpl="title", set=cur_sets[-1] if cur_sets[-1] != "void" else "city", lines=["ПРОДОЛЖЕНИЕ", "СЛЕДУЕТ"], actors=[]); last["bars"] = "scope" if fmt == "long" else "none"; last["captions"] = False; last["sfx"] = [dict(at=0.1, name="stinger", gain=-10)]
    info = lambda: sum(1 for x in shots if x["params"]["tpl"] in ("diagram", "insert")) / len(shots)
    cands = []                                          # инфографика из текста: числа и шаги — всегда, иконки — пока инфографики < 40%
    for k, sh in enumerate(shots):
        if k == 0 or sh["params"]["tpl"] not in ("wide", "face") or sh.get("bars") == "scope": continue
        h = heuristic(beats[k], cur_sets[k])
        if h["tpl"] == "prop" and sh["params"]["tpl"] == "wide": cands.append((1, k, to_params(h, beats[k], cur_sets[k], rnd))); continue
        if h["tpl"] in ("diagram", "insert") and h.get("kind") != "q":
            p2 = to_params(h, beats[k], cur_sets[k], rnd)
            if p2["tpl"] in ("diagram", "insert"): cands.append((0 if p2["tpl"] == "diagram" else 1, k, p2))
    for pr, k, p2 in sorted(cands, key=lambda c: c[:2]):
        if pr == 1 and info() >= 0.4: break
        if pr == 0 and shots[k]["params"]["tpl"] == "face" and sum(1 for x in shots if x["params"]["tpl"] == "face") <= 2: continue
        shots[k]["params"] = p2; shots[k]["sfx"] = [dict(at=at, name=n, gain=g) for n, at, g in SFX_OF.get(p2.get("kind") or p2["tpl"], [])]; shots[k]["src"] = "h+"
    for k, sh in enumerate(shots[:-1]):                # карточка главы не короче 1,8 с (берём у следующего кадра)
        nx = shots[k + 1]
        if sh["params"]["tpl"] == "chapter" and sh["end"] - sh["start"] < 1.8 and nx["end"] - sh["start"] > 4.2:
            t = round(sh["start"] + 1.8, 2); sh["end"] = t; nx["start"] = t
    edit_rules(shots, cur_sets, rnd)
    ncard = 0                                            # карточек-списков не больше 2 на ролик: остальные — значками
    for k, sh in enumerate(shots):
        Q_ = sh["params"]
        if Q_.get("tpl") == "diagram" and Q_.get("kind") == "card":
            ncard += 1
            if ncard > 2:
                ln = Q_.get("lines") or []
                sh["params"] = dict(tpl="insert", kind="icon", icons=[pick(ICON_KEYS, x, "doc") for x in ln[:3]], labels=[x[:18] for x in ln[:3]], bg=dict(set=cur_sets[k] if cur_sets[k] != "void" else "city"), text=[], z0=Q_.get("z0", 1.0), z1=Q_.get("z1", 1.07), seed=Q_.get("seed", 6))
    # кадры > 5 с — делим, меняя крупность и сторону
    final = []
    for sh in shots:
        d = sh["end"] - sh["start"]
        if d <= 4.0 or sh["params"]["tpl"] == "title": final.append(sh); continue
        n = math.ceil(d / 2.8); w = d / n
        for j in range(n):
            c = copy.deepcopy(sh); c["start"] = round(sh["start"] + j * w, 2); c["end"] = round(sh["start"] + (j + 1) * w, 2) if j < n - 1 else sh["end"]
            if j:
                c["sfx"] = []; c["in"] = dict(type="cut"); Q = c["params"]; z0, z1, x0, x1 = CAMS[(j + len(final)) % len(CAMS)]; Q.update(z0=z0, z1=z1, x0=x0, x1=x1, seed=Q.get("seed", 6) + j)
                if Q["tpl"] == "wide":
                    Q["text"] = []
                    if Q.get("actors"): Q["actors"] = [dict(x, x=round(1 - x["x"], 2), f=-x.get("f", 1)) if x.get("t") != "crowd" else x for x in Q["actors"]]
                if Q["tpl"] == "face": Q["fx0"] = 0.7 if Q.get("fx0", 0.3) < 0.5 else 0.3; Q["side"] = -Q.get("side", 1); Q["text"] = []
                if Q["tpl"] in ("diagram", "insert") and j % 2 == 1:     # длинная схема: вторая часть — реакция героя, а не та же картинка
                    st2 = (Q.get("bg") or {}).get("set") or sh.get("_set") or "city"
                    c["params"] = dict(tpl="wide", set=st2 if st2 != "void" else "city", actors=[dict(t="hero", x=0.66, s=1.45, f=-1, pose="think", expr="thinking")], text=[], frame="medium", z0=1.3, z1=1.4, x0=250, x1=200, seed=Q.get("seed", 6) + j)
            final.append(c)
    nfix = fix_runs(final)
    for i, sh in enumerate(final): sh["id"] = f"s{i + 1:03d}"; sh["scene"] = ""; sh["notes"] = ""; sh.pop("_set", None)
    # музыка по главам
    marks = [0.0] + [s["start"] for s in final if s["params"]["tpl"] == "chapter"] + [END]
    moods = ["mystery", "tension", "mystery", "tension", "wonder", "tension", "mystery"]
    music = [dict(start=round(marks[k], 2), end=round(marks[k + 1], 2), mood=moods[k % len(moods)], intensity=round(0.45 + 0.1 * (k % 3), 2)) for k in range(len(marks) - 1) if marks[k + 1] - marks[k] > 0.5]
    story = dict(title=cfg.get("title", ""), duration=END, shots=final, music=music)
    (P / "story").mkdir(exist_ok=True); (P / "story/shots.json").write_text(json.dumps(story, ensure_ascii=False, indent=1), encoding="utf-8")
    cfg["duration"] = END; cfg.setdefault("kitCam", 1.8); cfg.setdefault("kitPunch", 0.06); cfg.setdefault("grade", dict(contrast=1.1, gain=[1.14, 1.12, 1.1], grain=0.025, vignette=0.42)); cfg.setdefault("captions", True); cfg.setdefault("bars", "wide" if fmt == "long" else "none")
    (P / "config.json").write_text(json.dumps(cfg, ensure_ascii=False, indent=1), encoding="utf-8")
    sc = P / "scenes"; sc.mkdir(exist_ok=True)
    if not any(sc.rglob("*.js")): (sc / "kit.js").write_text("// Atlas Studio: общие декорации и шаблоны кадров\nimport '/engine/kit/shots.js';\n", encoding="utf-8")
    from collections import Counter
    L = [s["end"] - s["start"] for s in final]; tp = Counter(s["params"]["tpl"] for s in final)
    rep = dict(source=src, beats=len(beats), shots=len(final), gemini=stats["gemini"], heuristics=stats["heur"], median=round(sorted(L)[len(L) // 2], 2), max=round(max(L), 2), min=round(min(L), 2),
               tpl=dict(tp), sets=dict(Counter(cur_sets)), end=END, voice=round(VD, 2), log=log, run_fixes=nfix)
    (P / "story/plan_log.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Раскадровка ({src}): {len(final)} кадров из {len(beats)} фраз-кадров; медиана {rep['median']} с, мин {rep['min']}, макс {rep['max']}; конец {END} с (озвучка {VD:.2f})")
    print("Шаблоны:", ", ".join(f"{k} {v}" for k, v in tp.most_common()), "| декорации:", ", ".join(f"{k} {v}" for k, v in Counter(cur_sets).most_common()))
    for l in log: print("  ·", l)


if __name__ == "__main__":
    main()
