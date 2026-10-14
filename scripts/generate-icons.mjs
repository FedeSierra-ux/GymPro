// Genera todos los iconos de GymPro (web, PWA y Android) desde una sola
// definición vectorial, para que no se desincronicen entre sí.
//
//   node scripts/generate-icons.mjs
//
// Salidas:
//   public/favicon.svg
//   public/icons/icon-{192,512}.{svg,png}
//   public/icons/icon-512-maskable.png
//   android/app/src/main/res/mipmap-*/ic_launcher{,_round}.png

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const BG_TOP = '#171A24'
const BG_BOTTOM = '#0C0E14'
const MARK_FROM = '#F2A93B'
const MARK_TO = '#E8634A'

// La mancuerna, en un lienzo de 512: tres discos por lado que bajan hacia
// afuera, agarre más fino que los discos y las puntas de la barra asomando.
const mark = `
    <g fill="url(#mark)">
      <rect x="200" y="222" width="112" height="68" rx="16"/>
      <rect x="318" y="138" width="56" height="236" rx="20"/>
      <rect x="138" y="138" width="56" height="236" rx="20"/>
      <rect x="384" y="170" width="36" height="172" rx="16"/>
      <rect x="92"  y="170" width="36" height="172" rx="16"/>
      <rect x="430" y="198" width="22" height="116" rx="11"/>
      <rect x="60"  y="198" width="22" height="116" rx="11"/>
      <rect x="460" y="239" width="22" height="34" rx="11"/>
      <rect x="30"  y="239" width="22" height="34" rx="11"/>
    </g>
    <g fill="${BG_BOTTOM}" opacity="0.45">
      <rect x="234" y="238" width="8" height="36" rx="4"/>
      <rect x="252" y="238" width="8" height="36" rx="4"/>
      <rect x="270" y="238" width="8" height="36" rx="4"/>
    </g>`

const backgrounds = {
  // Squircle estilo iOS: radio del 22%.
  squircle: '<rect width="512" height="512" rx="114" fill="url(#bg)"/>',
  circle: '<circle cx="256" cy="256" r="256" fill="url(#bg)"/>',
  // Sin recorte: la máscara la aplica el sistema (iconos maskable/adaptive).
  full: '<rect width="512" height="512" fill="url(#bg)"/>',
}

/**
 * @param {'squircle'|'circle'|'full'} shape
 * @param {number} scale  Tamaño de la marca. 0.94 deja el margen justo dentro
 *   del squircle; los maskable necesitan ~0.62 para entrar en la zona segura
 *   del 80% que recorta Android.
 */
function buildSvg(shape, scale = 0.94) {
  const offset = (512 * (1 - scale)) / 2
  return `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GymPro">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${BG_TOP}"/>
      <stop offset="1" stop-color="${BG_BOTTOM}"/>
    </linearGradient>
    <linearGradient id="mark" x1="0.08" y1="0.15" x2="0.92" y2="0.85">
      <stop offset="0" stop-color="${MARK_FROM}"/>
      <stop offset="1" stop-color="${MARK_TO}"/>
    </linearGradient>
  </defs>

  ${backgrounds[shape]}

  <g transform="translate(${offset.toFixed(2)} ${offset.toFixed(2)}) scale(${scale})">${mark}
  </g>
</svg>
`
}

async function writeSvg(relPath, svg) {
  const out = join(root, relPath)
  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, svg)
  console.log(`svg  ${relPath}`)
}

async function writePng(relPath, svg, size) {
  const out = join(root, relPath)
  await mkdir(dirname(out), { recursive: true })
  // La densidad se escala con el tamaño para que sharp rasterice el vector a
  // resolución nativa en vez de agrandar un bitmap de 512.
  await sharp(Buffer.from(svg), { density: (72 * size) / 512 })
    .resize(size, size)
    .png()
    .toFile(out)
  console.log(`png  ${relPath} (${size}px)`)
}

const squircle = buildSvg('squircle')
// En el recorte redondo los discos de las puntas tocaban el borde: al 70 % entran.
const circle = buildSvg('circle', 0.7)
// Launcher de Android (legacy): el squircle con la marca al 80 %.
const launcher = buildSvg('squircle', 0.8)
// El ícono 'any' de la PWA va a sangre: los launchers que aplican su propia
// máscara dejaban esquinas oscuras dobles con el squircle horneado.
const any = buildSvg('full', 0.8)
const maskable = buildSvg('full', 0.62)
// iOS recorta el ícono él mismo: si le pasamos el squircle quedan esquinas
// negras, así que el apple-touch-icon va a sangre y con la marca un poco más
// chica para no comerse el borde redondeado del sistema.
const appleTouch = buildSvg('full', 0.78)

// Web y PWA
await writeSvg('public/favicon.svg', squircle)
await writeSvg('public/icons/icon-192.svg', squircle)
await writeSvg('public/icons/icon-512.svg', squircle)
await writePng('public/icons/icon-192.png', any, 192)
await writePng('public/icons/icon-512.png', any, 512)
await writePng('public/icons/icon-512-maskable.png', maskable, 512)
await writePng('public/icons/apple-touch-icon.png', appleTouch, 180)

// Android (TWA): un PNG por densidad, cuadrado y redondo.
const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }
for (const [density, size] of Object.entries(densities)) {
  const dir = `android/app/src/main/res/mipmap-${density}`
  await writePng(`${dir}/ic_launcher.png`, launcher, size)
  await writePng(`${dir}/ic_launcher_round.png`, circle, size)
}

console.log('\nListo.')
