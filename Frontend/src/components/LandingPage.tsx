import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Database, Shield, Search } from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen mesh-gradient overflow-hidden font-sans transition-colors duration-300"
         style={{ color: 'var(--text-primary)' }}>
      <div className="absolute inset-0 noise-bg mix-blend-overlay"></div>

      {/* HEADER */}
      <header className="absolute top-0 w-full z-50 px-6 md:px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg"
               style={{ background: 'var(--badge-bg)', color: 'var(--badge-text)' }}>
            <span className="font-display font-bold tracking-tighter text-sm">AG</span>
          </div>
          <span className="font-display font-semibold tracking-wide text-sm">
            AERIS
          </span>
        </div>

        <div className="flex items-center gap-6">
          <Link 
            to="/login" 
            className="text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)' }}
          >
            Sign in
          </Link>
          <Link 
            to="/register" 
            className="rounded-full px-5 py-2 text-sm font-medium shadow-md transition-all active:scale-95"
            style={{ background: 'var(--badge-bg)', color: 'var(--badge-text)' }}
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative min-h-screen flex flex-col justify-center items-center px-6 md:px-12 text-center z-10 pt-20">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl mx-auto space-y-8 flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 glass-card text-xs font-medium tracking-wide mb-4"
               style={{ color: 'var(--text-secondary)' }}>
            <SparkleIcon />
            <span>Introducing AERIS Grounded Core</span>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[100px] font-semibold tracking-tighter leading-[1.05]"
              style={{ color: 'var(--text-primary)' }}>
            Corporate <span style={{ color: 'var(--text-muted)' }}>Intelligence,</span><br />
            Perfectly Grounded.
          </h1>

          <p className="text-lg md:text-xl font-light max-w-2xl leading-relaxed"
             style={{ color: 'var(--text-secondary)' }}>
            Upload your secure documents and interact with them using zero-hallucination, citation-grounded AI built for enterprise.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full sm:w-auto">
            <Link 
              to="/register" 
              className="group flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
              style={{ background: 'var(--badge-bg)', color: 'var(--badge-text)', boxShadow: '0 0 40px var(--glass-shadow)' }}
            >
              <span>Start Building</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link 
              to="/login" 
              className="flex items-center justify-center rounded-full glass-card px-8 py-4 text-sm font-medium transition-all duration-300"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--glass-bg)' }}
            >
              <span>Sign In</span>
            </Link>
          </div>
        </motion.div>

        {/* FLOATING GLASS MOCKUP */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-5xl mx-4 sm:mx-0 mt-20 md:mt-32 glass-card rounded-t-3xl p-6 md:p-8 flex flex-col gap-6 max-w-[calc(100%-2rem)] sm:max-w-5xl"
          style={{ borderBottom: 'none', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
        >
          <div className="flex items-center gap-2 border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="w-3 h-3 rounded-full" style={{ background: 'var(--bg-elevated)' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: 'var(--bg-elevated)' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: 'var(--bg-elevated)' }} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left pb-10">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                <Database className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
              </div>
              <h3 className="font-semibold text-lg tracking-tight">Secure Partitioning</h3>
              <p className="text-sm leading-relaxed font-light" style={{ color: 'var(--text-secondary)' }}>
                Instantly convert raw files into structured knowledge segments. Data never leaves your secure environment.
              </p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                <Shield className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
              </div>
              <h3 className="font-semibold text-lg tracking-tight">Zero-Hallucination</h3>
              <p className="text-sm leading-relaxed font-light" style={{ color: 'var(--text-secondary)' }}>
                AERIS strictly restricts output to verified facts sourced directly from your documents.
              </p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                <Search className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
              </div>
              <h3 className="font-semibold text-lg tracking-tight">Live Citation Traces</h3>
              <p className="text-sm leading-relaxed font-light" style={{ color: 'var(--text-secondary)' }}>
                See precisely which document segments informed every AI response, with full audit trails.
              </p>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  );
}
