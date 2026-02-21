import 'dotenv/config'
import { resolve } from 'path'
import { pathToFileURL } from 'url'
import { startGameLoop } from './index.js'

// This isn't a true "sandbox", not secured if player's can create their own scripts.
// isolation could be done with this : https://github.com/sebastianwessel/quickjs maybe.
async function loadGameLogic() {
  const gameScript = process.env.GAME_SCRIPT ?? 'defaultScript.js'
  const codePath = resolve(import.meta.dirname, 'scripts', gameScript)
  if (!process.env.GAME_SCRIPT) console.log('No GAME_SCRIPT provided, using default script')
  console.log(`Loading game logic from ${codePath}`)
  await import(pathToFileURL(codePath).href)
}

loadGameLogic()
  .then(() => startGameLoop())
  .catch((err) => console.error(err))
