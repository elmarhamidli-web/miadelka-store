import confetti from 'canvas-confetti'

const COLORS = ['#ff9bb8', '#ffc8dd', '#bde0fe', '#c8b6ff', '#a8e6cf', '#ffd97d']

/** Light, playful confetti burst — fired when a product is added to the cart. */
export function celebrate(origin?: { x: number; y: number }) {
  const base = {
    spread: 70,
    startVelocity: 32,
    gravity: 0.9,
    scalar: 0.9,
    ticks: 160,
    colors: COLORS,
    disableForReducedMotion: true,
  }

  const x = origin ? origin.x / window.innerWidth : 0.85
  const y = origin ? origin.y / window.innerHeight : 0.12

  confetti({ ...base, particleCount: 60, origin: { x, y } })
  window.setTimeout(
    () => confetti({ ...base, particleCount: 30, scalar: 0.7, origin: { x, y } }),
    140,
  )
}
