// Örnek ürünler ve ana sayfa için çizim (vektör) tesbih görselleri üretir ve media/ klasörüne yazar.
// Bunlar fotoğraf değildir; yalnızca yerleşimi ve oranları görmek için yer tutucudur.
import { createHash } from "node:crypto";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const W = 1200;
const H = 1500; // 4:5, ürün kartlarındaki ve ana sayfadaki görsel oranıyla aynı
const COUNT = 34; // 33 tane + imame

// Her ürün için renk ve biçim: bead = [parlak, açık, ana, kenar]
const looks = {
  "ornek-damla-kehribar": {
    bead: ["#FFE9AE", "#F4B54E", "#DA8820", "#86490B"],
    metal: ["#F6E3AE", "#BC8D31"],
    thread: "#B9701B",
    glow: true,
    rx: 330,
    ry: 400,
  },
  "ornek-sikma-kehribar": {
    bead: ["#FFCDA6", "#E5703F", "#B53C18", "#5B1907"],
    metal: ["#F2DCA6", "#B2842D"],
    thread: "#8D2B12",
    glow: true,
    rx: 340,
    ry: 388,
  },
  "ornek-kuka": {
    bead: ["#8E6E58", "#52392D", "#2F2019", "#110A07"],
    metal: ["#E4E1DA", "#807A70"],
    thread: "#3A2619",
    glow: false,
    rx: 322,
    ry: 408,
  },
  "ornek-narcil": {
    bead: ["#FFF7E4", "#EDDBB8", "#CFB78C", "#8E7750"],
    metal: ["#F0E2BC", "#A98A45"],
    thread: "#BFA77A",
    glow: false,
    rx: 334,
    ry: 396,
  },
  "ornek-damla-kehribar-acik": {
    bead: ["#FFF3CC", "#FAD680", "#EEB847", "#A9701C"],
    metal: ["#F6E3AE", "#BC8D31"],
    thread: "#C98A2B",
    glow: true,
    rx: 337,
    ry: 392,
  },
  "ornek-oltu-tasi": {
    bead: ["#74747C", "#33333A", "#16161B", "#050507"],
    metal: ["#E9E9ED", "#8A8A92"],
    thread: "#1A1A1F",
    glow: false,
    rx: 326,
    ry: 404,
  },
  "ornek-abanoz": {
    bead: ["#86645A", "#43291F", "#22130E", "#090403"],
    metal: ["#E6CF98", "#A5802F"],
    thread: "#2A1A12",
    glow: false,
    rx: 331,
    ry: 399,
  },
  "ornek-narcil-koyu": {
    bead: ["#F2DFC0", "#CDAA7A", "#9C7646", "#5B4020"],
    metal: ["#EAD7A6", "#9E7E3C"],
    thread: "#A98B5A",
    glow: false,
    rx: 329,
    ry: 401,
  },
};

// Aynı girdi her zaman aynı sayıyı verir; böylece görseller (ve dosya adları) tekrar üretilince değişmez.
const rand = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// Elips üzerinde yay uzunluğuna göre eşit aralıklı noktalar; ilk nokta en altta.
function loopPoints(cx, cy, rx, ry, count) {
  const steps = 4000;
  const at = (t) => [cx + rx * Math.cos(t), cy + ry * Math.sin(t)];
  const ts = [Math.PI / 2];
  const cum = [0];
  let prev = at(ts[0]);
  for (let i = 1; i <= steps; i++) {
    const t = Math.PI / 2 + (i / steps) * Math.PI * 2;
    const p = at(t);
    cum.push(cum[i - 1] + Math.hypot(p[0] - prev[0], p[1] - prev[1]));
    ts.push(t);
    prev = p;
  }
  const total = cum[steps];
  const points = [];
  let j = 0;
  for (let k = 0; k < count; k++) {
    const target = (k * total) / count;
    while (cum[j + 1] < target) j++;
    const f = (target - cum[j]) / (cum[j + 1] - cum[j]);
    points.push(at(ts[j] + f * (ts[j + 1] - ts[j])));
  }
  return { points, spacing: total / count };
}

const n = (value) => value.toFixed(1);

// Tek bir tesbihi çizen parçalar (tuval 1200×1500, tesbihin merkezi 600,600).
// prefix: aynı görselde iki tesbih olunca renk geçişi adları çakışmasın diye.
function tesbihParts(look, prefix = "") {
  const cx = W / 2;
  const cy = 600;
  const { points, spacing } = loopPoints(cx, cy, look.rx, look.ry, COUNT);
  const r = (spacing / 2) * 0.97;
  const [light, mid, base, edge] = look.bead;
  const [metalLight, metalDark] = look.metal;

  // imame, ara boncuklar ve püskül aynı dikey eksende (x = cx)
  const imameCy = points[0][1] + r * 0.55;
  const imameRx = r * 0.84;
  const imameRy = r * 1.75;
  const spacerR = r * 0.3;
  const spacerYs = [0, 1, 2].map((i) => imameCy + imameRy + spacerR + i * spacerR * 2.1 - 2);
  const capRx = r * 0.48;
  const capRy = r * 0.72;
  const capCy = spacerYs[2] + spacerR + r * 0.78;
  const tasselTop = capCy + capRy - 8;
  const bandY = tasselTop + 52;
  const dxs = Array.from({ length: 17 }, (_, i) => (i - 8) * 8.5).sort((a, b) => Math.abs(b) - Math.abs(a));
  const strandPath = (dx) =>
    `M ${cx} ${n(tasselTop)} C ${cx} ${n(tasselTop + 70)}, ${n(cx + dx * 0.45)} ${n(tasselTop + 140)}, ${n(cx + dx)} ${n(tasselTop + 215)}`;

  // Renk geçişleri (her tesbihin kendi renkleri)
  const defs = `<radialGradient id="${prefix}bead" cx="0.36" cy="0.30" r="0.82">
    <stop offset="0" stop-color="${light}"/><stop offset="0.3" stop-color="${mid}"/><stop offset="0.65" stop-color="${base}"/><stop offset="1" stop-color="${edge}"/>
  </radialGradient>
  <radialGradient id="${prefix}glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${light}" stop-opacity="0.55"/><stop offset="1" stop-color="${light}" stop-opacity="0"/></radialGradient>
  <radialGradient id="${prefix}spec" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff" stop-opacity="0.8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="${prefix}metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${metalLight}"/><stop offset="0.5" stop-color="${metalDark}"/><stop offset="1" stop-color="${metalLight}"/></linearGradient>`;

  // Gölgeler (tek blur ile)
  const shadows = [
    `<ellipse cx="${cx}" cy="${cy}" rx="${look.rx}" ry="${look.ry}" fill="none" stroke="#2B1B0E" stroke-width="10"/>`,
    ...points.slice(1).map(([x, y]) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="#2B1B0E"/>`),
    `<ellipse cx="${cx}" cy="${n(imameCy)}" rx="${n(imameRx)}" ry="${n(imameRy)}" fill="#2B1B0E"/>`,
    ...dxs.map((dx) => `<path d="${strandPath(dx)}" fill="none" stroke="#2B1B0E" stroke-width="7" stroke-linecap="round"/>`),
  ].join("");

  // Taneler
  const beads = points
    .slice(1)
    .map(([x, y], i) => {
      const tone = 0.02 + 0.1 * rand(i + 1);
      const ex = x - r * 0.34;
      const ey = y - r * 0.4;
      return [
        `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="url(#${prefix}bead)"/>`,
        `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="#000" fill-opacity="${tone.toFixed(3)}"/>`,
        look.glow ? `<circle cx="${n(x + r * 0.16)}" cy="${n(y + r * 0.2)}" r="${n(r * 0.55)}" fill="url(#${prefix}glow)"/>` : "",
        `<ellipse cx="${n(ex)}" cy="${n(ey)}" rx="${n(r * 0.3)}" ry="${n(r * 0.18)}" fill="url(#${prefix}spec)" transform="rotate(-35 ${n(ex)} ${n(ey)})"/>`,
      ].join("");
    })
    .join("");

  // Püskül telleri: kalın ana çizgi + ince parlak çizgi
  const strands = dxs
    .map(
      (dx) =>
        `<path d="${strandPath(dx)}" fill="none" stroke="${look.thread}" stroke-width="6.5" stroke-linecap="round"/>` +
        `<path d="${strandPath(dx)}" fill="none" stroke="#fff" stroke-opacity="0.22" stroke-width="1.6" stroke-linecap="round" transform="translate(-1.6 0)"/>`,
    )
    .join("");

  const spacers = spacerYs
    .map((y) => `<circle cx="${cx}" cy="${n(y)}" r="${n(spacerR)}" fill="url(#${prefix}metal)" stroke="#00000033" stroke-width="1"/>`)
    .join("");

  const body = `<ellipse cx="${cx}" cy="${cy}" rx="${look.rx}" ry="${look.ry}" fill="none" stroke="#24160D" stroke-width="5"/>
${beads}
${strands}
<rect x="${cx - 38}" y="${n(bandY - 8)}" width="76" height="16" rx="8" fill="url(#${prefix}metal)" stroke="#00000033" stroke-width="1"/>
<ellipse cx="${cx}" cy="${n(capCy)}" rx="${n(capRx)}" ry="${n(capRy)}" fill="url(#${prefix}metal)" stroke="#00000033" stroke-width="1"/>
${spacers}
<ellipse cx="${cx}" cy="${n(imameCy)}" rx="${n(imameRx)}" ry="${n(imameRy)}" fill="url(#${prefix}bead)"/>
<ellipse cx="${cx}" cy="${n(imameCy)}" rx="${n(imameRx)}" ry="${n(imameRy)}" fill="#000" fill-opacity="0.06"/>
${look.glow ? `<ellipse cx="${n(cx + imameRx * 0.15)}" cy="${n(imameCy + imameRy * 0.2)}" rx="${n(imameRx * 0.55)}" ry="${n(imameRy * 0.55)}" fill="url(#${prefix}glow)"/>` : ""}
<ellipse cx="${n(cx - imameRx * 0.36)}" cy="${n(imameCy - imameRy * 0.46)}" rx="${n(imameRx * 0.26)}" ry="${n(imameRy * 0.2)}" fill="url(#${prefix}spec)"/>`;

  return { defs, shadows, body };
}

// Arka plan, ışık, kenar karartması ve gölge bulanıklığı: tüm görsellerde ortak.
const sceneDefs = `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F1E7D8"/><stop offset="1" stop-color="#D8C7AE"/></linearGradient>
  <radialGradient id="light" cx="0.45" cy="0.32" r="0.7"><stop offset="0" stop-color="#FFF9EE" stop-opacity="0.85"/><stop offset="1" stop-color="#FFF9EE" stop-opacity="0"/></radialGradient>
  <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="#3A2A18" stop-opacity="0"/><stop offset="1" stop-color="#3A2A18" stop-opacity="0.3"/></radialGradient>`;
const blurDef = `<filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>`;

// Ürün görseli: tek tesbih, ortada.
function buildSvg(look) {
  const t = tesbihParts(look);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  ${sceneDefs}
  ${t.defs}
  ${blurDef}
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#light)"/>
<g filter="url(#blur)" opacity="0.32" transform="translate(14 22)">${t.shadows}</g>
${t.body}
<rect width="${W}" height="${H}" fill="url(#vignette)"/>
</svg>`;
}

// Ana sayfa görseli: iki tesbih, hafif döndürülmüş ve üst üste.
// Her biri kendi merkezi (600,600) etrafında döndürülüp ölçeklenir, sonra tuvale yerleştirilir.
const place = ({ x, y, angle, scale }) =>
  `translate(${x} ${y}) translate(600 600) rotate(${angle}) scale(${scale}) translate(-600 -600)`;

const heroLayout = {
  back: { look: "ornek-abanoz", at: { x: -140, y: -50, angle: 34, scale: 0.8 } },
  front: { look: "ornek-damla-kehribar", at: { x: 50, y: 60, angle: -9, scale: 0.98 } },
};

function buildHeroSvg() {
  const back = tesbihParts(looks[heroLayout.back.look], "a-");
  const front = tesbihParts(looks[heroLayout.front.look], "b-");
  const backAt = place(heroLayout.back.at);
  const frontAt = place(heroLayout.front.at);
  const shadow = (parts, at) =>
    `<g filter="url(#blur)" opacity="0.32" transform="translate(14 22)"><g transform="${at}">${parts.shadows}</g></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  ${sceneDefs}
  ${back.defs}
  ${front.defs}
  ${blurDef}
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#light)"/>
${shadow(back, backAt)}
<g transform="${backAt}">${back.body}</g>
${shadow(front, frontAt)}
<g transform="${frontAt}">${front.body}</g>
<rect width="${W}" height="${H}" fill="url(#vignette)"/>
</svg>`;
}

// SVG'yi JPEG'e çevirir; dosya adına içerik izi (hash) ekler, aynı adlı eski sürümleri siler, dosyayı yazar.
async function writeImage(dir, name, svg) {
  const buffer = await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 8);
  const file = `${name}-${hash}.jpg`;
  // Yalnızca bu görselin eski sürümleri silinir: ad-<8 haneli iz>.jpg
  const own = new RegExp(`^${name}-[0-9a-f]{8}\\.jpg$`);
  for (const old of await readdir(dir)) {
    if (own.test(old) && old !== file) await rm(path.join(dir, old));
  }
  await writeFile(path.join(dir, file), buffer);
  return file;
}

// media/ klasörüne her ürün için bir JPEG yazar; dosya adlarına içerik izi (hash) eklenir.
// Döndürür: { ürün-slug: dosya-adı }
export async function createSampleImages(dir) {
  await mkdir(dir, { recursive: true });
  const result = {};
  for (const [slug, look] of Object.entries(looks)) {
    result[slug] = await writeImage(dir, slug, buildSvg(look));
  }
  return result;
}

// media/ klasörüne ana sayfa görselini yazar. Döndürür: dosya adı.
export async function createHeroImage(dir) {
  await mkdir(dir, { recursive: true });
  return writeImage(dir, "hero", buildHeroSvg());
}
