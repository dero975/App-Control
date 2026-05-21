import { homeIconCornerRadius, homeIconEditorSize, type GradientMode } from './projectImageConstants'
import { loadDataUrlImage } from './projectImageFileUtils'

export type HomeIconRenderOptions = {
  backgroundColor: string
  borderColor: string
  borderEnabled: boolean
  borderWidth: number
  gradientColor: string
  gradientEnabled: boolean
  gradientMode: GradientMode
  logoDataUrl: string
  logoScale: number
}

export function deriveBorderColor(hexColor: string) {
  const normalizedColor = hexColor.trim().replace('#', '')
  if (!/^[\da-f]{6}$/i.test(normalizedColor)) return '#2f6f42'

  const red = Number.parseInt(normalizedColor.slice(0, 2), 16)
  const green = Number.parseInt(normalizedColor.slice(2, 4), 16)
  const blue = Number.parseInt(normalizedColor.slice(4, 6), 16)
  const darkened = [red, green, blue].map((channel) => Math.max(0, Math.round(channel * 0.46)))

  return `#${darkened.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

export async function renderHomeIconBlob(options: HomeIconRenderOptions) {
  const canvas = document.createElement('canvas')
  canvas.width = homeIconEditorSize
  canvas.height = homeIconEditorSize
  await drawHomeIcon(canvas, options)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
        return
      }

      reject(new Error('Esportazione icona non riuscita'))
    }, 'image/png')
  })
}

export async function drawHomeIcon(canvas: HTMLCanvasElement | null, options: HomeIconRenderOptions) {
  if (!canvas) return

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas non disponibile')

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.save()
  createRoundedRectPath(context, 0, 0, canvas.width, canvas.height, homeIconCornerRadius)
  context.clip()

  context.fillStyle = options.gradientEnabled
    ? createHomeIconGradient(context, canvas.width, canvas.height, options)
    : options.backgroundColor

  context.fillRect(0, 0, canvas.width, canvas.height)

  if (options.logoDataUrl) {
    const logo = await loadDataUrlImage(options.logoDataUrl)
    const maxLogoSize = canvas.width * (options.logoScale / 100)
    const scale = Math.min(maxLogoSize / logo.naturalWidth, maxLogoSize / logo.naturalHeight)
    const logoWidth = logo.naturalWidth * scale
    const logoHeight = logo.naturalHeight * scale
    context.drawImage(logo, (canvas.width - logoWidth) / 2, (canvas.height - logoHeight) / 2, logoWidth, logoHeight)
  }

  context.restore()

  if (options.borderEnabled) {
    drawRoundedBorderRing(context, canvas.width, canvas.height, options.borderWidth, homeIconCornerRadius, options.borderColor)
  }
}

function createHomeIconGradient(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: Pick<HomeIconRenderOptions, 'backgroundColor' | 'gradientColor' | 'gradientMode'>,
) {
  if (options.gradientMode === 'radial') {
    const radialGradient = context.createRadialGradient(width * 0.35, height * 0.25, 0, width * 0.5, height * 0.58, width * 0.82)
    radialGradient.addColorStop(0, options.backgroundColor)
    radialGradient.addColorStop(1, options.gradientColor)
    return radialGradient
  }

  if (options.gradientMode === 'soft') {
    const softGradient = context.createLinearGradient(width * 0.18, height * 0.08, width * 0.86, height * 0.94)
    softGradient.addColorStop(0, mixHexColors(options.backgroundColor, '#ffffff', 0.35))
    softGradient.addColorStop(0.48, options.backgroundColor)
    softGradient.addColorStop(1, options.gradientColor)
    return softGradient
  }

  const linearGradient = context.createLinearGradient(0, 0, width, height)
  linearGradient.addColorStop(0, options.backgroundColor)
  linearGradient.addColorStop(1, options.gradientColor)
  return linearGradient
}

function mixHexColors(firstColor: string, secondColor: string, amount: number) {
  const first = parseHexColor(firstColor)
  const second = parseHexColor(secondColor)
  if (!first || !second) return firstColor

  const mixed = first.map((channel, index) => Math.round(channel * (1 - amount) + second[index] * amount))
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function parseHexColor(hexColor: string) {
  const normalizedColor = hexColor.trim().replace('#', '')
  if (!/^[\da-f]{6}$/i.test(normalizedColor)) return null

  return [
    Number.parseInt(normalizedColor.slice(0, 2), 16),
    Number.parseInt(normalizedColor.slice(2, 4), 16),
    Number.parseInt(normalizedColor.slice(4, 6), 16),
  ]
}

function createRoundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath()
  addRoundedRectPath(context, x, y, width, height, radius)
}

function addRoundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2)
  context.moveTo(x + safeRadius, y)
  context.lineTo(x + width - safeRadius, y)
  context.arcTo(x + width, y, x + width, y + safeRadius, safeRadius)
  context.lineTo(x + width, y + height - safeRadius)
  context.arcTo(x + width, y + height, x + width - safeRadius, y + height, safeRadius)
  context.lineTo(x + safeRadius, y + height)
  context.arcTo(x, y + height, x, y + height - safeRadius, safeRadius)
  context.lineTo(x, y + safeRadius)
  context.arcTo(x, y, x + safeRadius, y, safeRadius)
  context.closePath()
}

function drawRoundedBorderRing(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  borderWidth: number,
  radius: number,
  color: string,
) {
  const safeBorderWidth = Math.max(1, Math.min(borderWidth, width / 2, height / 2))
  const innerWidth = Math.max(1, width - safeBorderWidth * 2)
  const innerHeight = Math.max(1, height - safeBorderWidth * 2)

  context.save()
  context.beginPath()
  addRoundedRectPath(context, 0, 0, width, height, radius)
  addRoundedRectPath(context, safeBorderWidth, safeBorderWidth, innerWidth, innerHeight, Math.max(0, radius - safeBorderWidth))
  context.fillStyle = color
  context.fill('evenodd')
  context.restore()
}
