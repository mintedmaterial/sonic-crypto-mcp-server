"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

// All PNG links from your FloatingIcons - prioritized with local images first for reliability
const logoPngs = [
  // Local images (more reliable)
  "/images/openocean-icon.png",
  "/images/paintswap.png",
  
  // DexScreener logos (generally reliable)
  "https://dexscreener.com/favicon.png",
  "https://dd.dexscreener.com/ds-data/dexes/sonic-market.png",
  "https://dd.dexscreener.com/ds-data/dexes/sonic-swap.png",
  "https://dd.dexscreener.com/ds-data/dexes/metropolis.png",
  "https://dd.dexscreener.com/ds-data/dexes/equalizer.png",
  "https://dd.dexscreener.com/ds-data/dexes/shadow-exchange.png",
  "https://dd.dexscreener.com/ds-data/dexes/wagmi.png",
  "https://dd.dexscreener.com/ds-data/dexes/beets.png",
  "https://dd.dexscreener.com/ds-data/dexes/fat-finger.png",
  "https://dd.dexscreener.com/ds-data/dexes/spookyswap.png",
  "https://dd.dexscreener.com/ds-data/dexes/defive.png",
  "https://dd.dexscreener.com/ds-data/dexes/zkswap.png",
  
  // Token logos
  "https://dd.dexscreener.com/ds-data/tokens/sonic/0xe51ee9868c1f0d6cd968a8b8c8376dc2991bfe44.png?key=50f8b4",
  "https://dd.dexscreener.com/ds-data/tokens/sonic/0x9fdbc3f8abc05fa8f3ad3c17d2f806c1230c4564.png?size=lg&key=c9601a",
  "https://dd.dexscreener.com/ds-data/tokens/sonic/0xb098afc30fce67f1926e735db6fdadfe433e61db.png?key=430ae8",
  
  // PaintSwap NFT images (may be slower)
  "https://media-paint.paintswap.finance/0x8500d84b203775fc8b418148223872b35c43b050-146-1734986837_thumb.png",
  "https://media-paint.paintswap.finance/0xc83f364827b9f0d7b27a9c48b2419e4a14e72f78-146-1735942291_thumb.png",
  "https://media-paint.paintswap.finance/0x5d5bde4b25e43b32d6571bc630f0a6b11216b490-146-1754139071_thumb.png",
  "https://media-paint.paintswap.finance/0xf20bd8b3a20a6d9884121d7a6e37a95a810183e2-146-1737630183_thumb.png",
  "https://media-paint.paintswap.finance/0x6754e351b719a7119e67bb84cffa2d9949887ea5-146-1738877229_thumb.png",
  "https://media-paint.paintswap.finance/0x17dc8a808cedbc46e33df745d2f7ea9f896668d2-146-1750864839_thumb.png",
  "https://media-paint.paintswap.finance/0x6e3af0e31f48e878d89125c76de37fcdb539d57a-146-1741290862_thumb.png",
  "https://media-paint.paintswap.finance/0x3c02968a8b851ed2bebb27f421a328ee1de2939f-146-1745938037_thumb.png",
  "https://media-paint.paintswap.finance/0x6872967f1baae03fdbbed840088486e9a7c10e40-146-1735032920_thumb.png",
  "https://media-paint.paintswap.finance/0x83c27147f0aa26b153de120f600d0238ef7a4ebb-146-1740333134_thumb.png",
  "https://media-paint.paintswap.finance/0x0dd93c18b9c4247265fafe1c99cec247186a2e03_thumb_v3.png",
]

// Fallback: Create simple colored squares if images fail
const createFallbackImage = (color: string, text: string) => {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 32, 32)
    ctx.fillStyle = 'white'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(text, 16, 20)
  }
  const img = new Image()
  img.src = canvas.toDataURL()
  return img
}

const fallbackImages = [
  createFallbackImage('#3B82F6', 'S'),  // Sonic blue
  createFallbackImage('#8B5CF6', 'D'),  // DeFi purple  
  createFallbackImage('#10B981', 'N'),  // NFT green
  createFallbackImage('#F59E0B', 'T'),  // Token orange
]

interface Drop {
  x: number
  y: number
  speed: number
  size: number
  img: HTMLImageElement
  z: "behind" | "above"
}

function getRandomLogoImage(images: HTMLImageElement[], loadedIndices: Set<number>) {
  const loadedImages = images.filter((_, index) => loadedIndices.has(index) && images[index].complete)
  if (loadedImages.length === 0) return null
  return loadedImages[Math.floor(Math.random() * loadedImages.length)]
}

function createDrop(width: number, height: number, images: HTMLImageElement[], loadedIndices: Set<number>): Drop | null {
  const img = getRandomLogoImage(images, loadedIndices)
  if (!img) return null
  
  return {
    x: Math.random() * width,
    y: Math.random() * -height * 2, // Start higher for natural entry
    speed: Math.random() * 2 + 1,
    size: Math.random() * 40 + 20, // Slightly larger for better visibility
    img,
    z: Math.random() < 0.85 ? "behind" : "above", // More behind, fewer in front
  }
}

function useLogoRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const dropsRef = useRef<Drop[]>([])
  const imagesRef = useRef<HTMLImageElement[]>([])
  const animationRef = useRef<number>(0)
  const loadedImagesRef = useRef<Set<number>>(new Set())
  const rainStartTimeRef = useRef<number>(0)

  // Load images progressively for slow starting rain effect
  useEffect(() => {
    const imgs: HTMLImageElement[] = []
    let loadedCount = 0
    
    // Add fallback images first (always available)
    fallbackImages.forEach((fallbackImg, i) => {
      imgs.push(fallbackImg)
      loadedImagesRef.current.add(imgs.length - 1)
      loadedCount++
    })
    
    console.log(`🎨 Added ${fallbackImages.length} fallback images`)
    
    // Load external images
    logoPngs.forEach((src, i) => {
      const img = new window.Image()
      const imgIndex = imgs.length
      
      img.onload = () => {
        loadedImagesRef.current.add(imgIndex)
        loadedCount++
        console.log(`✅ Loaded image ${loadedCount}/${logoPngs.length + fallbackImages.length}: ${src.split('/').pop()}`)
        
        // Start rain after fallbacks + a few external images load
        if (loadedCount >= fallbackImages.length + 2 && !rainStartTimeRef.current) {
          rainStartTimeRef.current = Date.now()
          initializeDrops()
          console.log(`🌧️ Starting rain with ${loadedCount} loaded images`)
        }
      }
      
      img.onerror = (e) => {
        console.warn(`❌ Failed to load image: ${src}`)
        // Don't add failed images to the loaded set
      }
      
      // Set CORS and source
      if (src.startsWith('http')) {
        img.crossOrigin = "anonymous"
      }
      img.src = src
      imgs.push(img)
    })
    
    imagesRef.current = imgs
    
    // Fallback: Start rain after 2 seconds even if no external images load
    setTimeout(() => {
      if (!rainStartTimeRef.current && loadedImagesRef.current.size >= fallbackImages.length) {
        rainStartTimeRef.current = Date.now()
        initializeDrops()
        console.log(`🌧️ Starting rain with fallback timeout (${loadedImagesRef.current.size} images)`)
      }
    }, 2000)
    
    // eslint-disable-next-line
  }, [])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const width = window.innerWidth
        const height = window.innerHeight
        canvasRef.current.width = width
        canvasRef.current.height = height
        setDimensions({ width, height })
        initializeDrops()
      }
    }
    window.addEventListener("resize", handleResize)
    handleResize()
    return () => window.removeEventListener("resize", handleResize)
    // eslint-disable-next-line
  }, [])

  // Initialize drops with slow starting rain effect
  function initializeDrops() {
    if (loadedImagesRef.current.size === 0) return
    const width = window.innerWidth
    const height = window.innerHeight
    
    // Start with fewer drops, gradually increase
    const maxDrops = Math.floor((width * height) / 2000) // Reduced density for better performance
    const initialDrops = Math.min(3, maxDrops) // Start with just 3 drops
    const drops: Drop[] = []
    
    for (let i = 0; i < initialDrops; i++) {
      const drop = createDrop(width, height, imagesRef.current, loadedImagesRef.current)
      if (drop) {
        // Stagger the initial drops
        drop.y = -height - (i * 200)
        drops.push(drop)
      }
    }
    dropsRef.current = drops
    
    // Gradually add more drops over time
    let currentDropCount = initialDrops
    const addDropInterval = setInterval(() => {
      if (currentDropCount >= maxDrops || loadedImagesRef.current.size === 0) {
        clearInterval(addDropInterval)
        return
      }
      
      const newDrop = createDrop(width, height, imagesRef.current, loadedImagesRef.current)
      if (newDrop) {
        dropsRef.current.push(newDrop)
        currentDropCount++
      }
    }, 800) // Add a new drop every 800ms for slow buildup
    
    console.log(`🌧️ Started rain with ${initialDrops} drops, will grow to ${maxDrops}`)
  }

  // Animation loop
  useEffect(() => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    function drawDrops(z: "behind" | "above") {
      dropsRef.current.forEach((drop) => {
        if (drop.z !== z) return
        if (drop.img && drop.img.complete) {
          // Enhanced visibility with better alpha values
          ctx.globalAlpha = z === "behind" ? 0.3 : 0.7
          
          // Add slight shadow effect for better visibility
          if (z === "above") {
            ctx.shadowColor = "rgba(0,0,0,0.3)"
            ctx.shadowBlur = 4
            ctx.shadowOffsetX = 2
            ctx.shadowOffsetY = 2
          }
          
          ctx.drawImage(drop.img, drop.x, drop.y, drop.size, drop.size)
          
          // Reset shadow
          if (z === "above") {
            ctx.shadowColor = "transparent"
            ctx.shadowBlur = 0
            ctx.shadowOffsetX = 0
            ctx.shadowOffsetY = 0
          }
        }
      })
      ctx.globalAlpha = 1
    }

    function animate() {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height)
      
      // Draw behind drops first
      drawDrops("behind")
      
      // Draw above drops (fewer, more visible)
      drawDrops("above")
      
      // Update drop positions
      dropsRef.current.forEach((drop, i) => {
        drop.y += drop.speed
        
        // Reset drop when it goes off screen
        if (drop.y > dimensions.height + drop.size) {
          const newDrop = createDrop(dimensions.width, dimensions.height, imagesRef.current, loadedImagesRef.current)
          if (newDrop) {
            dropsRef.current[i] = newDrop
          } else {
            // Remove drop if no images available
            dropsRef.current.splice(i, 1)
          }
        }
      })
      
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(animationRef.current)
    // eslint-disable-next-line
  }, [dimensions])

  return canvasRef
}

export default function BackgroundPaths({
  title = "Background Paths",
  onEnter,
}: {
  title?: string
  onEnter?: () => void
}) {
  const canvasRef = useLogoRain()
  const words = title.split(" ")

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-neutral-950">
      {/* Rainfall canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
        aria-label="Logo rainfall animation"
      />

      {/* Ghosting/foreground content */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-transparent pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 md:px-6 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold mb-8 tracking-tighter">
            {words.map((word, wordIndex) => (
              <span key={wordIndex} className="inline-block mr-4 last:mr-0">
                {word.split("").map((letter, letterIndex) => (
                  <motion.span
                    key={`${wordIndex}-${letterIndex}`}
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      delay: wordIndex * 0.1 + letterIndex * 0.03,
                      type: "spring",
                      stiffness: 150,
                      damping: 25,
                    }}
                    className="inline-block text-transparent bg-clip-text 
                                        bg-gradient-to-r from-white to-white/80"
                  >
                    {letter}
                  </motion.span>
                ))}
              </span>
            ))}
          </h1>

          <div
            className="inline-block group relative bg-gradient-to-b from-white/10 to-white/5 
                        p-px rounded-2xl backdrop-blur-lg 
                        overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            <Button
              variant="ghost"
              onClick={onEnter}
              className="rounded-[1.15rem] px-8 py-6 text-lg font-semibold backdrop-blur-md 
                            bg-white/10 hover:bg-white/20 
                            text-white transition-all duration-300 
                            group-hover:-translate-y-0.5 border border-white/20
                            hover:shadow-md hover:shadow-white/10"
            >
              <span className="opacity-90 group-hover:opacity-100 transition-opacity">Enter serviceflow.com</span>
              <span
                className="ml-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-1.5 
                                transition-all duration-300"
              >
                →
              </span>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}