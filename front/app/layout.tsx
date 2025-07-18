import '@/styles/globals.css'

export default function RootLayout({
  // Layouts must accept a children prop.
  // This will be populated with nested layouts or pages
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <meta property="og:type" content="website" />
      <meta property="og:title" content="3D Game on 𝕏 (Notblox.online)" />
      <meta property="og:description" content="3D Multiplayer Game - click to interact!" />
      <meta
        property="og:url"
        content="https://notblox-git-twitter-fullscreen-iercann-s-team.vercel.app/"
      />
      <meta property="og:image" content="https://www.notblox.online/PreviewTestGame.webp" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="3D Multiplayer Game" />
      <meta
        property="og:image:secure_url"
        content="https://www.notblox.online/PreviewTestGame.webp"
      />
      <meta property="og:image:type" content="image/webp" />
      <meta property="og:site_name" content="NotBlox" />
      <meta property="og:locale" content="en_US" />
      {/* <meta property="og:video" content="https://grokgames.vercel.app/demo.webm" />
      <meta property="og:video:type" content="video/webm" />
      <meta property="og:video:width" content="640" />
      <meta property="og:video:height" content="360" />
      <meta property="og:video:duration" content="10" />
      <meta property="og:video:tag" content="3D" />
      <meta property="og:video:tag" content="Interactive" />
      <meta property="og:video:tag" content="Three.js" /> */}

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="player" />
      <meta name="twitter:site" content="@iercan" />
      <meta name="twitter:title" content="3D Multiplayer Game on 𝕏 (iercan_)" />
      <meta name="twitter:description" content="3D Multiplayer Game - click to interact!" />
      <meta
        name="twitter:url"
        content="https://notblox-git-twitter-fullscreen-iercann-s-team.vercel.app/"
      />
      <meta name="twitter:image" content="/thumb.jpg" />
      <meta name="twitter:image:width" content="643" />
      <meta name="twitter:image:height" content="643" />
      <meta name="twitter:image:alt" content="3D Multiplayer Demo" />
      <meta
        name="twitter:player"
        content="https://notblox-git-twitter-fullscreen-iercann-s-team.vercel.app/"
      />
      <meta name="twitter:player:width" content="480" />
      <meta name="twitter:player:height" content="480" />
      <meta name="twitter:app:name:iphone" content="iErcan" />
      <meta name="twitter:app:name:ipad" content="iErcan" />
      <meta name="twitter:app:name:googleplay" content="iErcan" />
      <meta name="twitter:creator" content="@iErcan" />

      <body className="bg-gray-50">
        <main>{children}</main>
      </body>
    </html>
  )
}
