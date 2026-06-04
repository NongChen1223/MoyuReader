import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const rootDir = new URL('..', import.meta.url).pathname
const outputRoot = path.join(rootDir, 'frontend/src/assets/pets')
const frameSize = 96
const framesPerAction = 10

const petActions = {
  dog: [
    { id: 'walk', description: '走路游荡' },
    { id: 'sit_tail', description: '坐着摇尾巴' },
    { id: 'mouth_open', description: '张嘴吃文件' },
    { id: 'question', description: '疑问反馈' },
  ],
  cat: [
    { id: 'walk', description: '走路游荡' },
    { id: 'lick_paw', description: '舔毛' },
    { id: 'mouth_open', description: '张嘴吃文件' },
    { id: 'question', description: '疑问反馈' },
  ],
}

function rect(x, y, width, height, fill, opacity = 1) {
  return `<rect x="${Math.round(x)}" y="${Math.round(y)}" width="${Math.round(width)}" height="${Math.round(height)}" fill="${fill}" opacity="${opacity}"/>`
}

function dots(points, fill) {
  return points.map(([x, y, size = 3]) => rect(x, y, size, size, fill)).join('')
}

function phase(frameIndex, amount = 1) {
  return Math.sin((frameIndex / framesPerAction) * Math.PI * 2) * amount
}

function triangular(frameIndex, peak = 5) {
  return peak - Math.abs(peak - frameIndex)
}

function buildShadow(y = 80, width = 54) {
  return rect(20, y, width, 5, '#201c2b', 0.2)
}

function buildQuestionBubble(frameIndex) {
  const bob = frameIndex % 2
  return [
    rect(62, 8 - bob, 20, 15, '#2b2636'),
    rect(64, 6 - bob, 16, 4, '#2b2636'),
    rect(64, 23 - bob, 16, 4, '#2b2636'),
    rect(66, 10 - bob, 12, 11, '#fff0bd'),
    rect(70, 11 - bob, 5, 3, '#5b527d'),
    rect(74, 14 - bob, 4, 4, '#5b527d'),
    rect(72, 20 - bob, 4, 3, '#5b527d'),
  ].join('')
}

function buildFileSnack(frameIndex) {
  const drift = Math.max(0, 10 - frameIndex)
  return [
    rect(72 - drift, 56, 13, 15, '#2b2636'),
    rect(74 - drift, 58, 9, 11, '#f7f2d4'),
    rect(80 - drift, 58, 3, 3, '#b8d8ff'),
    rect(76 - drift, 62, 5, 2, '#7f6b50'),
    rect(76 - drift, 66, 6, 2, '#7f6b50'),
  ].join('')
}

function drawDog(action, frameIndex) {
  const walkLift = action === 'walk' ? Math.round(phase(frameIndex, 2)) : 0
  const walkStep = action === 'walk' ? (frameIndex % 2 === 0 ? 4 : -3) : 0
  const sitting = action === 'sit_tail'
  const bodyY = sitting ? 54 : 49 + (action === 'walk' && frameIndex % 2 ? 1 : 0)
  const bodyH = sitting ? 22 : 19
  const headY = sitting ? 32 : 31 + walkLift
  const tailSwing = action === 'sit_tail' ? Math.round(phase(frameIndex, 6)) : action === 'walk' ? Math.round(phase(frameIndex, 3)) : 0
  const mouthOpen = action === 'mouth_open' ? Math.max(2, triangular(frameIndex, 5) * 2) : 0
  const tilt = action === 'question' ? (frameIndex % 2 === 0 ? -2 : 2) : 0

  return [
    buildShadow(80, sitting ? 48 : 56),
    rect(18, bodyY - 2, 43, bodyH + 4, '#2b2636'),
    rect(20, bodyY, 39, bodyH, '#c99b5e'),
    rect(23, bodyY + 5, 32, 6, '#efcf8b'),
    rect(51 + tilt, headY - 2, 24, 24, '#2b2636'),
    rect(53 + tilt, headY, 20, 20, '#d9b77d'),
    rect(50 + tilt, headY - 8, 12, 13, '#2b2636'),
    rect(53 + tilt, headY - 5, 8, 10, '#8d5d41'),
    rect(64 + tilt, headY + 7, 4, 4, '#211b24'),
    rect(71 + tilt, headY + 12, 8 + mouthOpen, 5 + Math.floor(mouthOpen / 2), '#2b2636'),
    rect(72 + tilt, headY + 13, 6 + mouthOpen, 3, '#d9b77d'),
    rect(78 + tilt, headY + 18, 4, 3 + Math.floor(mouthOpen / 2), '#f26b6b'),
    rect(9, bodyY - 7 - tailSwing, 15, 8, '#2b2636'),
    rect(10, bodyY - 5 - tailSwing, 12, 4, '#d9b77d'),
    sitting
      ? [
          rect(26, bodyY + 15, 11, 13, '#2b2636'),
          rect(28, bodyY + 17, 9, 9, '#b98558'),
          rect(43, bodyY + 16, 12, 12, '#2b2636'),
          rect(45, bodyY + 18, 9, 8, '#b98558'),
        ].join('')
      : [
          rect(25 + walkStep, bodyY + 15, 8, 14, '#2b2636'),
          rect(27 + walkStep, bodyY + 17, 6, 10, '#b98558'),
          rect(46 - walkStep, bodyY + 15, 8, 14, '#2b2636'),
          rect(48 - walkStep, bodyY + 17, 6, 10, '#b98558'),
        ].join(''),
    dots(
      [
        [37, bodyY + 2, 3],
        [43, bodyY + 3, 2],
        [31, bodyY + 8, 2],
      ],
      '#a86f45'
    ),
    action === 'mouth_open' ? buildFileSnack(frameIndex) : '',
    action === 'question' ? buildQuestionBubble(frameIndex) : '',
  ].join('')
}

function drawCat(action, frameIndex) {
  const walkLift = action === 'walk' ? Math.round(phase(frameIndex, 2)) : 0
  const walkStep = action === 'walk' ? (frameIndex % 2 === 0 ? 4 : -3) : 0
  const lick = action === 'lick_paw' ? Math.max(0, triangular(frameIndex, 5)) : 0
  const bodyY = action === 'lick_paw' ? 52 : 50 + (action === 'walk' && frameIndex % 2 ? 1 : 0)
  const headY = action === 'lick_paw' ? 31 : 30 + walkLift
  const tailCurl = action === 'lick_paw' ? Math.round(phase(frameIndex, 4)) : Math.round(phase(frameIndex, 2))
  const mouthOpen = action === 'mouth_open' ? Math.max(2, triangular(frameIndex, 5) * 2) : 0
  const tilt = action === 'question' ? (frameIndex % 2 === 0 ? -2 : 2) : 0

  return [
    buildShadow(80, 54),
    rect(18, bodyY - 2, 40, 21, '#2b2636'),
    rect(20, bodyY, 36, 17, '#9aa3ad'),
    rect(24, bodyY + 5, 28, 5, '#d8dde4'),
    rect(50 + tilt, headY - 2, 25, 24, '#2b2636'),
    rect(52 + tilt, headY, 21, 20, '#b8c0c9'),
    rect(51 + tilt, headY - 10, 9, 13, '#2b2636'),
    rect(53 + tilt, headY - 6, 5, 8, '#f0a9b7'),
    rect(65 + tilt, headY - 10, 9, 13, '#2b2636'),
    rect(67 + tilt, headY - 6, 5, 8, '#f0a9b7'),
    rect(63 + tilt, headY + 9, 4, 4, '#211b24'),
    rect(71 + tilt, headY + 13, 7 + mouthOpen, 5 + Math.floor(mouthOpen / 2), '#2b2636'),
    rect(72 + tilt, headY + 14, 5 + mouthOpen, 3, '#b8c0c9'),
    action === 'lick_paw'
      ? [
          rect(65 + tilt, headY + 18, 5 + lick, 4, '#f26b8f'),
          rect(55, bodyY + 13 - lick / 2, 8, 9, '#2b2636'),
          rect(56, bodyY + 14 - lick / 2, 6, 7, '#d8dde4'),
        ].join('')
      : '',
    rect(9, bodyY - 6 + tailCurl, 8, 23, '#2b2636'),
    rect(11, bodyY - 4 + tailCurl, 4, 19, '#9aa3ad'),
    rect(25 + walkStep, bodyY + 14, 7, 14, '#2b2636'),
    rect(27 + walkStep, bodyY + 16, 5, 10, '#87919c'),
    rect(44 - walkStep, bodyY + 14, 7, 14, '#2b2636'),
    rect(46 - walkStep, bodyY + 16, 5, 10, '#87919c'),
    dots(
      [
        [34, bodyY + 2, 2],
        [40, bodyY + 3, 2],
        [47, bodyY + 2, 2],
      ],
      '#707884'
    ),
    action === 'mouth_open' ? buildFileSnack(frameIndex) : '',
    action === 'question' ? buildQuestionBubble(frameIndex) : '',
  ].join('')
}

function buildSheet(kind) {
  const draw = kind === 'dog' ? drawDog : drawCat
  const actions = petActions[kind]
  const width = frameSize * framesPerAction
  const height = frameSize * actions.length
  const frames = []

  const rows = actions
    .map(({ id }, rowIndex) =>
      Array.from({ length: framesPerAction }, (_, frameIndex) => {
        const globalIndex = rowIndex * framesPerAction + frameIndex
        frames.push({
          index: globalIndex,
          action: id,
          x: frameIndex * frameSize,
          y: rowIndex * frameSize,
          width: frameSize,
          height: frameSize,
          durationMs: id === 'question' ? 160 : 120,
        })
        return `<g transform="translate(${frameIndex * frameSize} ${rowIndex * frameSize})">${draw(id, frameIndex)}</g>`
      }).join('')
    )
    .join('')

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`,
    rows,
    '</svg>',
  ].join('')

  const meta = {
    kind,
    frameSize: { width: frameSize, height: frameSize },
    framesPerAction,
    image: 'sprite.svg',
    actions: Object.fromEntries(
      actions.map(({ id, description }, index) => [
        id,
        {
          from: index * framesPerAction,
          to: index * framesPerAction + framesPerAction - 1,
          frameCount: framesPerAction,
          loop: true,
          description,
        },
      ])
    ),
    frames,
  }

  return { svg, meta }
}

for (const kind of Object.keys(petActions)) {
  const dir = path.join(outputRoot, kind)
  await mkdir(dir, { recursive: true })
  const { svg, meta } = buildSheet(kind)
  await writeFile(path.join(dir, 'sprite.svg'), svg, 'utf8')
  await writeFile(path.join(dir, 'sprite.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8')
}

console.log(`Generated pet sprites in ${outputRoot}`)
