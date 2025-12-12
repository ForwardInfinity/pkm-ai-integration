"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Brain, Zap, GitGraph, Sparkles, Layers, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function FadeIn({ 
  children, 
  delay = 0, 
  className 
}: { 
  children: React.ReactNode; 
  delay?: number; 
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-1000 ease-out transform",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        className
      )}
    >
      {children}
    </div>
  );
}

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1d1d1f] font-sans selection:bg-black/10">
      {/* Navigation */}
      <nav 
        className={cn(
          "fixed top-0 w-full z-50 transition-all duration-300 border-b",
          scrolled 
            ? "bg-white/80 backdrop-blur-md border-black/5 py-3" 
            : "bg-transparent border-transparent py-5"
        )}
      >
        <div className="max-w-5xl mx-auto px-6 flex justify-between items-center">
          <div className="font-semibold text-lg tracking-tight flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-black" />
            Refinery
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-black/60">
            <Link href="/login" className="hover:text-black transition-colors">Log in</Link>
            <Link 
              href="/login" 
              className="px-4 py-1.5 bg-black text-white rounded-full hover:bg-black/80 transition-all text-xs"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
        <div className="max-w-3xl mx-auto text-center space-y-8 relative z-10">
          <FadeIn delay={100}>
            <h1 className="text-5xl md:text-7xl font-semibold tracking-tighter leading-[1.1]">
              Knowledge grows through <br/>
              <span className="text-black/40">conjecture & refutation.</span>
            </h1>
          </FadeIn>
          
          <FadeIn delay={300}>
            <p className="text-xl md:text-2xl text-black/60 font-light max-w-2xl mx-auto leading-relaxed">
              Refinery is a note-taking system designed for evolutionary epistemology. 
              Refine your ideas through conflict detection and semantic surfacing.
            </p>
          </FadeIn>

          <FadeIn delay={500} className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link href="/login">
              <Button size="lg" className="rounded-full px-8 h-12 text-base bg-black hover:bg-black/80 shadow-lg shadow-black/5">
                Start Thinking
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <a href="#philosophy" className="text-sm font-medium text-black/50 hover:text-black transition-colors flex items-center gap-1 group">
              Learn the philosophy
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </FadeIn>
        </div>
        
        {/* Subtle Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-gray-200/40 to-transparent rounded-full blur-3xl -z-10 opacity-60" />
      </section>

      {/* Interface Preview */}
      <section className="px-6 pb-32">
        <FadeIn delay={600}>
          <div className="max-w-5xl mx-auto rounded-xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-black/5 bg-white relative aspect-[16/10] md:aspect-[16/9]">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/5 pointer-events-none z-10" />
            
            {/* Mock UI */}
            <div className="flex h-full text-xs text-black/80">
              {/* Sidebar */}
              <div className="w-64 border-r border-black/5 bg-gray-50/50 p-4 hidden md:flex flex-col gap-4">
                <div className="flex gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                  <div className="w-3 h-3 rounded-full bg-green-400/80" />
                </div>
                <div className="space-y-1">
                  <div className="px-2 py-1.5 bg-black/5 rounded-md font-medium">Evolutionary Theory</div>
                  <div className="px-2 py-1.5 text-black/40">Quantum Mechanics</div>
                  <div className="px-2 py-1.5 text-black/40">Architecture Notes</div>
                </div>
                <div className="mt-auto p-3 bg-white rounded-lg border border-black/5 shadow-sm">
                  <div className="font-medium mb-1">Conflict Detected</div>
                  <div className="text-black/40 leading-snug">Note "Determinism" conflicts with "Free Will Axioms".</div>
                </div>
              </div>
              
              {/* Main Content */}
              <div className="flex-1 p-8 md:p-12 overflow-hidden bg-white">
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-semibold tracking-tight">The Growth of Knowledge</h2>
                    <div className="flex gap-2 text-black/30">
                      <span>Dec 12, 2025</span> • <span>Philosophy</span>
                    </div>
                  </div>
                  <p className="text-lg leading-relaxed text-black/70">
                    Knowledge does not start from certain foundations. It starts from <span className="bg-yellow-100/50 px-1 rounded">conjecture</span>. We guess. And then we criticize our guesses. This is the only way we learn anything about the world.
                  </p>
                  <div className="pl-4 border-l-2 border-black/10 py-1 my-6 space-y-2">
                    <p className="text-black/50 italic">AI Criticism:</p>
                    <p className="text-sm text-black/60">
                      Consider addressing the role of background knowledge. While we start with conjectures, those conjectures are often informed by existing problems in our current worldview.
                    </p>
                  </div>
                  <p className="text-lg leading-relaxed text-black/70">
                    Therefore, a note-taking system should not just be a repository of facts, but a <span className="font-medium text-black">crucible for ideas</span> where conflicts are surfaced rather than hidden.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Philosophy Section */}
      <section id="philosophy" className="py-24 bg-white border-t border-black/5">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <FadeIn>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6">
                Optimized for <br/>
                <span className="text-black/40">Deutschian explanations.</span>
              </h2>
              <div className="space-y-6 text-lg text-black/60 leading-relaxed">
                <p>
                  Most tools treat knowledge as static blocks to be stacked. Refinery treats knowledge as a living web of explanations.
                </p>
                <p>
                  We prioritize the surfacing of contradictions. A contradiction is not a failure; it is the seed of a new, better explanation.
                </p>
                <div className="pt-4">
                  <Link href="/login" className="text-black font-medium border-b border-black/20 hover:border-black pb-0.5 transition-all">
                    Start refining your worldview
                  </Link>
                </div>
              </div>
            </FadeIn>
            
            <FadeIn delay={200} className="grid grid-cols-2 gap-4">
              <div className="aspect-square bg-gray-50 rounded-2xl p-6 flex flex-col justify-between border border-black/5">
                <Brain className="w-8 h-8 opacity-40" />
                <div>
                  <h3 className="font-medium mb-1">Conjecture</h3>
                  <p className="text-sm text-black/50">Propose bold new ideas without fear of error.</p>
                </div>
              </div>
              <div className="aspect-square bg-gray-50 rounded-2xl p-6 flex flex-col justify-between border border-black/5 translate-y-8">
                <GitGraph className="w-8 h-8 opacity-40" />
                <div>
                  <h3 className="font-medium mb-1">Criticism</h3>
                  <p className="text-sm text-black/50">AI agents actively challenge your assumptions.</p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-20">
            <h2 className="text-3xl font-semibold tracking-tight mb-4">Tools for thought.</h2>
            <p className="text-black/50 text-lg">Built to extend your cognitive reach.</p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8">
            <FadeIn delay={0} className="group">
              <div className="bg-white rounded-2xl p-8 border border-black/5 shadow-sm hover:shadow-md transition-all duration-300 h-full">
                <div className="w-12 h-12 bg-black/5 rounded-xl flex items-center justify-center mb-6 group-hover:bg-black group-hover:text-white transition-colors">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Conflict Detection</h3>
                <p className="text-black/60 leading-relaxed">
                  The system automatically identifies when a new note contradicts an existing one, forcing resolution and growth.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={100} className="group">
              <div className="bg-white rounded-2xl p-8 border border-black/5 shadow-sm hover:shadow-md transition-all duration-300 h-full">
                <div className="w-12 h-12 bg-black/5 rounded-xl flex items-center justify-center mb-6 group-hover:bg-black group-hover:text-white transition-colors">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Semantic Surfacing</h3>
                <p className="text-black/60 leading-relaxed">
                  Notes are vector-embedded. Relevant past ideas resurface exactly when they are needed for your current train of thought.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={200} className="group">
              <div className="bg-white rounded-2xl p-8 border border-black/5 shadow-sm hover:shadow-md transition-all duration-300 h-full">
                <div className="w-12 h-12 bg-black/5 rounded-xl flex items-center justify-center mb-6 group-hover:bg-black group-hover:text-white transition-colors">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Evolutionary Graph</h3>
                <p className="text-black/60 leading-relaxed">
                  Visualize the lineage of your ideas. See how arguments have mutated and improved over time.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 bg-black text-white px-6 text-center">
        <FadeIn>
          <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
              Ready to refine your thinking?
            </h2>
            <p className="text-white/60 text-xl font-light">
              Join the thinkers who are building better explanations.
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <Link href="/login">
                <Button size="lg" variant="secondary" className="rounded-full px-8 h-14 text-lg">
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 px-6 border-t border-black/5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-black/40">
          <p>© 2025 Refinery. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-black transition-colors">Privacy</a>
            <a href="#" className="hover:text-black transition-colors">Terms</a>
            <a href="#" className="hover:text-black transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
