export function PWAHead() {
  return (
    <>
      {/* Font Preloading - Critical for PWA performance */}
      <link 
        rel="preload" 
        href="/fonts/ploni-regular-aaa.otf" 
        as="font" 
        type="font/otf" 
        crossOrigin="anonymous"
      />
      <link 
        rel="preload" 
        href="/fonts/ploni-light-aaa.otf" 
        as="font" 
        type="font/otf" 
        crossOrigin="anonymous"
      />
      <link 
        rel="preload" 
        href="/fonts/ploni-ultralight-aaa.otf" 
        as="font" 
        type="font/otf" 
        crossOrigin="anonymous"
      />
      
      {/* PWA Meta Tags */}
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-touch-fullscreen" content="yes" />
      <meta name="apple-mobile-web-app-title" content="תור רם-אל" />
      <meta name="application-name" content="תור רם-אל" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      
      {/* Standard Apple Touch Icons */}
      <link rel="apple-touch-icon" href="/icons/touch-icon-iphone-retina.png" />
      <link rel="apple-touch-icon" sizes="120x120" href="/icons/touch-icon-iphone.png" />
      <link rel="apple-touch-icon" sizes="152x152" href="/icons/touch-icon-ipad.png" />
      <link rel="apple-touch-icon" sizes="167x167" href="/icons/touch-icon-ipad-retina.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/icons/touch-icon-iphone-retina.png" />
      
      {/* Precomposed versions for older iOS */}
      <link rel="apple-touch-icon-precomposed" href="/icons/touch-icon-iphone-retina.png" />
      <link rel="apple-touch-icon-precomposed" sizes="120x120" href="/icons/touch-icon-iphone.png" />
      <link rel="apple-touch-icon-precomposed" sizes="152x152" href="/icons/touch-icon-ipad.png" />
      <link rel="apple-touch-icon-precomposed" sizes="167x167" href="/icons/touch-icon-ipad-retina.png" />
      <link rel="apple-touch-icon-precomposed" sizes="180x180" href="/icons/touch-icon-iphone-retina.png" />
      
      {/* iOS Splash Screens */}
      <link
        rel="apple-touch-startup-image"
        href="/icons/apple-splash-640-1136.png"
        media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
      />
      <link
        rel="apple-touch-startup-image"
        href="/icons/apple-splash-750-1334.png"
        media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
      />
      <link
        rel="apple-touch-startup-image"
        href="/icons/apple-splash-1242-2208.png"
        media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
      />
      <link
        rel="apple-touch-startup-image"
        href="/icons/apple-splash-1125-2436.png"
        media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
      />
      <link
        rel="apple-touch-startup-image"
        href="/icons/apple-splash-1536-2048.png"
        media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
      />
      <link
        rel="apple-touch-startup-image"
        href="/icons/apple-splash-1668-2224.png"
        media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
      />
      <link
        rel="apple-touch-startup-image"
        href="/icons/apple-splash-2048-2732.png"
        media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
      />
      
      {/* PWA Standard Meta Tags */}
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon.ico" />
      <link rel="mask-icon" href="/icon.svg" color="#6366f1" />
      <link rel="manifest" href="/manifest.json" />
      <meta name="msapplication-TileColor" content="#6366f1" />
      <meta name="msapplication-config" content="/browserconfig.xml" />
      
      {/* Prevent automatic telephone number detection */}
      <meta name="format-detection" content="telephone=no" />
      
      {/* Additional PWA meta tags */}
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="mobile-web-app-status-bar-style" content="black-translucent" />
    </>
  )
} 