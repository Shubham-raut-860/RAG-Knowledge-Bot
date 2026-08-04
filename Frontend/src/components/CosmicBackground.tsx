import { motion } from 'motion/react';

export default function CosmicBackground() {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden bg-[#050505] select-none pointer-events-none">
      {/* Aurora Radial Overlay */}
      <div className="absolute inset-0 bg-radial-[circle_at_center,rgba(16,24,48,0.25)_0%,#050505_100%]" />

      {/* Floating Blobs */}
      <motion.div
        animate={{
          x: [0, 40, -20, 0],
          y: [0, -50, 30, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/20 blur-[120px] animate-pulse-slow mix-blend-screen"
      />

      <motion.div
        animate={{
          x: [0, -60, 40, 0],
          y: [0, 40, -50, 0],
          scale: [1, 0.85, 1.1, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -bottom-[20%] right-0 w-[60%] h-[60%] rounded-full bg-cyan-500/15 blur-[150px] mix-blend-screen"
      />

      <motion.div
        animate={{
          x: [0, 30, -30, 0],
          y: [0, 30, -30, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[30%] left-[20%] w-[350px] h-[350px] rounded-full bg-emerald-400/15 blur-[100px] mix-blend-screen"
      />

      {/* Grid subtle mesh texture */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(ellipse at center, rgba(255,255,255,0.15) 0%, transparent 80%), 
                            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), 
                            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 24px 24px, 24px 24px'
        }}
      />
    </div>
  );
}
