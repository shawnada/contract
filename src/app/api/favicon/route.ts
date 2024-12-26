import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    const faviconPath = join(process.cwd(), 'public', 'favicon.ico')
    const faviconData = readFileSync(faviconPath)

    return new Response(faviconData, {
      headers: {
        'Content-Type': 'image/x-icon',
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (error) {
    console.error('Favicon error:', error)
    // 如果 favicon 不存在，返回 204 而不是 500
    return new Response(null, { status: 204 })
  }
}
