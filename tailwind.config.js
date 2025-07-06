extend: {
  padding: {
    'safe-top': 'env(safe-area-inset-top)',
    'safe-right': 'env(safe-area-inset-right)',
    'safe-bottom': 'env(safe-area-inset-bottom)',
    'safe-left': 'env(safe-area-inset-left)',
  },
  margin: {
    'safe-top': 'env(safe-area-inset-top)',
    'safe-right': 'env(safe-area-inset-right)',
    'safe-bottom': 'env(safe-area-inset-bottom)',
    'safe-left': 'env(safe-area-inset-left)',
  },
  height: {
    'screen-safe': 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
  },
  minHeight: {
    'screen-safe': 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
  },
  colors: {
    border: "hsl(var(--border))",
    input: "hsl(var(--input))",
  },
}, 