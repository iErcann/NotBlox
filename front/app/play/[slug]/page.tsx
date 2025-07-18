// app/play/[slug]/page.tsx
import gameData from '../../../public/gameData.json'
import { GameInfo } from '@/types'
import GameContent from '@/components/GameContent'

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const games = gameData as GameInfo[]

  return games.map((game) => ({
    slug: game.slug,
  }))
}

function getGamesBySlug(slug: string): GameInfo {
  const game = gameData.find((game) => game.slug === slug)
  if (!game) {
    throw new Error(`Game with slug "${slug}" not found`)
  }
  return game
}

// https://nextjs.org/docs/app/building-your-application/upgrading/version-15#params--searchparams
type Params = Promise<{ slug: string }>

export default async function GamePage({ params }: { params: Params }) {
  const { slug } = await params
  const gameInfo = getGamesBySlug(slug)

  return <GameContent gameInfo={gameInfo} />
}
