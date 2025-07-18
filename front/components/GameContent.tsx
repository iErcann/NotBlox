'use client'

import { useEffect, useState } from 'react'
import GamePlayer from '@/components/GamePlayer'
import { GameInfo } from '@/types'

export default function GameContent({ gameInfo }: { gameInfo: GameInfo }) {
  const [playerName, setPlayerName] = useState<string>('')

  useEffect(() => {
    const savedName = localStorage.getItem('playerName')
    if (savedName) {
      setPlayerName(savedName)
    }
  }, [])

  return <GamePlayer {...gameInfo} playerName={playerName} />
}
