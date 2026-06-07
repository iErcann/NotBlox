export interface GameInfo {
  title: string
  slug: string
  imageUrl: string
  images?: { url: string; width: number; height: number; alt: string; type: string }[]
  metaDescription: string
  markdown: string
}
