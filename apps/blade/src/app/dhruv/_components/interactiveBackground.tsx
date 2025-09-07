import { useRef, useEffect } from "react"

interface particleType {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  originalSize: number
  pulsePhase: number
}

export default function InteractiveBackground(){
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const mouseRef = useRef({ x: 0, y: 0 })
  const particlesRef = useRef<particleType[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
		if(!canvas) return;

    const ctx = canvas.getContext("2d")
		if(!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const createParticles = () => {
      const particles = []
      const particleCount = Math.min(60, Math.floor((canvas.width * canvas.height) / 12000))

      for (let i = 0; i < particleCount; i++) {
        const size = Math.random() * 2 + 1
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 1.9,
          vy: (Math.random() - 0.5) * 1.9,
          size,
          originalSize: size,
          opacity: Math.random() * 0.4 + 0.3,
          pulsePhase: Math.random() * Math.PI * 2,
        })
      }
      particlesRef.current = particles
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particlesRef.current.forEach((particle, index) => {
        particle.pulsePhase += 0.02

        const dx = mouseRef.current.x - particle.x
        const dy = mouseRef.current.y - particle.y
        const distanceToMouse = Math.sqrt(dx * dx + dy * dy)

        if (distanceToMouse < 150) {
          const force = (150 - distanceToMouse) / 150
          const angle = Math.atan2(dy, dx)

          particle.vx += Math.cos(angle) * force * 0.05
          particle.vy += Math.sin(angle) * force * 0.05

          particle.size = particle.originalSize * (1 + force * 0.8)
          particle.opacity = Math.min(0.9, particle.opacity + force * 0.3)
        } else {
          particle.size = particle.originalSize * (1 + Math.sin(particle.pulsePhase) * 0.1)
          particle.opacity = Math.max(0.2, particle.opacity - 0.01)
        }

        particle.x += particle.vx
        particle.y += particle.vy
        particle.vx *= 0.99
        particle.vy *= 0.99

        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0

        const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size * 3)
        gradient.addColorStop(0, `rgba(34, 197, 94, ${particle.opacity})`)
        gradient.addColorStop(0.5, `rgba(34, 197, 94, ${particle.opacity * 0.3})`)
        gradient.addColorStop(1, `rgba(34, 197, 94, 0)`)

        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()

        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(34, 197, 94, ${Math.min(1, particle.opacity * 1.5)})`
        ctx.fill()

        particlesRef.current.slice(index + 1).forEach((otherParticle) => {
          const dx = particle.x - otherParticle.x
          const dy = particle.y - otherParticle.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          const maxDistance = 150

          if (distance < maxDistance) {
            const particle1ToMouse = Math.sqrt(
              (mouseRef.current.x - particle.x) ** 2 + (mouseRef.current.y - particle.y) ** 2,
            )
            const particle2ToMouse = Math.sqrt(
              (mouseRef.current.x - otherParticle.x) ** 2 + (mouseRef.current.y - otherParticle.y) ** 2,
            )

            const nearMouse = Math.min(particle1ToMouse, particle2ToMouse) < 150
            const baseOpacity = 0.15 * (1 - distance / maxDistance)
            const opacity = nearMouse ? baseOpacity * 3 : baseOpacity

            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(otherParticle.x, otherParticle.y)
            ctx.strokeStyle = `rgba(34, 197, 94, ${opacity})`
            ctx.lineWidth = nearMouse ? 1.5 : 0.5
            ctx.stroke()
          }
        })
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = e.clientX - rect.left
      mouseRef.current.y = e.clientY - rect.top
    }

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000
      mouseRef.current.y = -1000
    }

    resizeCanvas()
    createParticles()
    animate()

    window.addEventListener("resize", () => {
      resizeCanvas()
      createParticles()
    })
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      window.removeEventListener("resize", resizeCanvas)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ background: "transparent" }} />
}
