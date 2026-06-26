// Compress + convert any image URL (object URL, Unsplash, data URL) to a base64 JPEG string
// (without the data: prefix) for sending to AI APIs.
export async function imageUrlToBase64(url: string, maxWidth = 1280, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.naturalWidth)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)

      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas context unavailable')); return }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve(dataUrl.split(',')[1]) // strip "data:image/jpeg;base64," prefix
    }

    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}
