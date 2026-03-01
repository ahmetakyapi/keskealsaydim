import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Wallet,
  Zap,
  Shield,
  Globe,
  ChevronDown,
  Sparkles,
  Target,
  PieChart,
  ArrowUpRight,
  Play,
  Check,
  Star,
  Users,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/card';
import CountUp from 'react-countup';
import { cn } from '@/lib/utils';

// Floating Orb Component
const FloatingOrb = ({
  size,
  color,
  delay,
  duration,
  initialX,
  initialY
}: {
  size: number;
  color: string;
  delay: number;
  duration: number;
  initialX: string;
  initialY: string;
}) => (
  <motion.div
    className={cn("absolute rounded-full blur-3xl", color)}
    style={{ width: size, height: size, left: initialX, top: initialY }}
    animate={{
      x: [0, 100, -50, 80, 0],
      y: [0, -80, 60, -40, 0],
      scale: [1, 1.2, 0.9, 1.1, 1],
      opacity: [0.3, 0.5, 0.3, 0.6, 0.3],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

// Animated Stock Line
const AnimatedStockLine = () => {
  const pathRef = useRef<SVGPathElement>(null);

  return (
    <svg className="w-full h-32" viewBox="0 0 400 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6C63FF" />
          <stop offset="50%" stopColor="#00D4AA" />
          <stop offset="100%" stopColor="#6C63FF" />
        </linearGradient>
        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00D4AA" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#00D4AA" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d="M0,80 Q50,60 100,50 T200,30 T300,45 T400,20"
        fill="none"
        stroke="url(#lineGradient)"
        strokeWidth="3"
        ref={pathRef}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
      />
      <motion.path
        d="M0,80 Q50,60 100,50 T200,30 T300,45 T400,20 L400,100 L0,100 Z"
        fill="url(#areaGradient)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
      />
    </svg>
  );
};

// Ticker Item with animation
const TickerItem = ({ symbol, change, delay }: { symbol: string; change: number; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="flex items-center gap-2 px-4"
  >
    <span className="text-white/80 font-mono text-sm">{symbol}</span>
    <span className={cn(
      "flex items-center gap-1 text-sm font-semibold",
      change > 0 ? "text-success" : "text-danger"
    )}>
      {change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {change > 0 ? '+' : ''}{change.toFixed(2)}%
    </span>
  </motion.div>
);

// 3D Card Component
const Card3D = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setRotateX((y - centerY) / 20);
    setRotateY((centerX - x) / 20);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      className={cn("relative", className)}
      style={{
        transformStyle: "preserve-3d",
        perspective: 1000,
      }}
      animate={{
        rotateX,
        rotateY,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  );
};

// Feature Card with 3D effect
const FeatureCard = ({
  icon: Icon,
  title,
  description,
  gradient,
  delay
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
  delay: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50, rotateX: -15 }}
      animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
    >
      <Card3D>
        <GlassCard className="p-8 h-full hover:border-white/20 transition-all duration-300 group overflow-hidden">
          {/* Background glow */}
          <div className={cn(
            "absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500",
            gradient.includes('primary') ? 'bg-primary' : gradient.includes('secondary') ? 'bg-secondary' : 'bg-orange-500'
          )} />

          <motion.div
            className={cn("w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-6 relative", gradient)}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Icon className="w-8 h-8 text-white" />
            <motion.div
              className="absolute inset-0 rounded-2xl bg-white/20"
              initial={{ scale: 0 }}
              whileHover={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          </motion.div>

          <h3 className="text-xl font-bold text-white mb-3 group-hover:text-gradient transition-all">
            {title}
          </h3>
          <p className="text-white/60 leading-relaxed">{description}</p>

          {/* Arrow indicator */}
          <motion.div
            className="mt-6 flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
            initial={{ x: -10 }}
            whileHover={{ x: 0 }}
          >
            <span className="text-sm font-medium">Daha fazla</span>
            <ArrowRight className="w-4 h-4" />
          </motion.div>
        </GlassCard>
      </Card3D>
    </motion.div>
  );
};

// Testimonial Card
const TestimonialCard = ({
  name,
  role,
  content,
  avatar,
  delay
}: {
  name: string;
  role: string;
  content: string;
  avatar: string;
  delay: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, delay }}
    >
      <GlassCard className="p-6 h-full">
        <div className="flex gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          ))}
        </div>
        <p className="text-white/80 mb-6 leading-relaxed">"{content}"</p>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
            {avatar}
          </div>
          <div>
            <p className="font-semibold text-white">{name}</p>
            <p className="text-white/40 text-sm">{role}</p>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};

// Pricing Card
const PricingCard = ({
  title,
  price,
  features,
  popular,
  delay
}: {
  title: string;
  price: string;
  features: string[];
  popular?: boolean;
  delay: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className={cn("relative", popular && "scale-105 z-10")}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold px-4 py-1 rounded-full">
            EN POPÜLER
          </span>
        </div>
      )}
      <GlassCard className={cn(
        "p-8 h-full",
        popular && "border-primary/50 bg-primary/5"
      )}>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <div className="mb-6">
          <span className="text-4xl font-bold text-white">{price}</span>
          {price !== 'Ücretsiz' && <span className="text-white/40">/ay</span>}
        </div>
        <ul className="space-y-3 mb-8">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-3 text-white/80">
              <Check className="w-5 h-5 text-success" />
              {feature}
            </li>
          ))}
        </ul>
        <Button
          variant={popular ? "gradient" : "outline"}
          className={cn("w-full", !popular && "border-white/20 text-white")}
        >
          {popular ? 'Hemen Başla' : 'Seç'}
        </Button>
      </GlassCard>
    </motion.div>
  );
};

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  useInView(heroRef, { once: false });

  const y = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.3], [1, 0.9]);

  const springY = useSpring(y, { stiffness: 100, damping: 30 });

  const tickerData = [
    { symbol: 'THYAO', change: 2.45 },
    { symbol: 'GARAN', change: -1.23 },
    { symbol: 'ASELS', change: 3.67 },
    { symbol: 'BIST100', change: 0.89 },
    { symbol: 'EREGL', change: -0.45 },
    { symbol: 'SISE', change: 1.82 },
    { symbol: 'TCELL', change: -0.67 },
    { symbol: 'FROTO', change: 4.21 },
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-surface-dark overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <FloatingOrb size={600} color="bg-primary/20" delay={0} duration={20} initialX="-10%" initialY="10%" />
        <FloatingOrb size={400} color="bg-secondary/20" delay={2} duration={25} initialX="70%" initialY="60%" />
        <FloatingOrb size={300} color="bg-purple-500/15" delay={4} duration={18} initialX="50%" initialY="20%" />
        <FloatingOrb size={500} color="bg-pink-500/10" delay={1} duration={22} initialX="80%" initialY="-10%" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '100px 100px'
          }}
        />
      </div>

      {/* Floating Ticker Bar */}
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-20 border-b border-white/5 bg-black/40 backdrop-blur-md"
      >
        <div className="overflow-hidden py-3">
          <motion.div
            className="flex whitespace-nowrap"
            animate={{ x: [0, -1000] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          >
            {[...tickerData, ...tickerData, ...tickerData].map((item, i) => (
              <TickerItem key={i} symbol={item.symbol} change={item.change} delay={i * 0.05} />
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative z-20 container mx-auto px-4 py-6"
      >
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <motion.div
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30"
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <TrendingUp className="w-6 h-6 text-white" />
            </motion.div>
            <span className="text-xl font-bold text-white group-hover:text-gradient transition-all">
              Keşke Alsaydım
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-white/60 hover:text-white transition-colors">Özellikler</a>
            <a href="#pricing" className="text-white/60 hover:text-white transition-colors">Fiyatlar</a>
            <a href="#testimonials" className="text-white/60 hover:text-white transition-colors">Yorumlar</a>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/login">
              <Button variant="ghost" className="text-white/80 hover:text-white">
                Giriş Yap
              </Button>
            </Link>
            <Link to="/register">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="gradient" className="shadow-lg shadow-primary/30">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Ücretsiz Başla
                </Button>
              </motion.div>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative z-10 container mx-auto px-4 pt-16 pb-32">
        <motion.div style={{ y: springY, opacity, scale }} className="relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.15 } }
              }}
            >
              <motion.div
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="mb-6"
              >
                <span className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 text-primary text-sm font-medium">
                  <Zap className="w-4 h-4 mr-2" />
                  Yatırım Kararlarını Güçlendir
                  <motion.span
                    className="ml-2 w-2 h-2 rounded-full bg-success"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </span>
              </motion.div>

              <motion.h1
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.1]"
              >
                Keşke O Hisseyi{' '}
                <span className="relative">
                  <span className="text-gradient">Alsaydın?</span>
                  <motion.svg
                    className="absolute -bottom-2 left-0 w-full"
                    viewBox="0 0 200 10"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: 1 }}
                  >
                    <motion.path
                      d="M0,5 Q50,0 100,5 T200,5"
                      fill="none"
                      stroke="url(#underlineGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="underlineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6C63FF" />
                        <stop offset="100%" stopColor="#00D4AA" />
                      </linearGradient>
                    </defs>
                  </motion.svg>
                </span>
              </motion.h1>

              <motion.p
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="text-xl text-white/60 mb-8 max-w-lg leading-relaxed"
              >
                Kaçırdığın fırsatları keşfet, portföyünü takip et ve{' '}
                <span className="text-white font-semibold">daha akıllı yatırım kararları</span> al.
              </motion.p>

              {/* Stats Row */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="flex gap-8 mb-10"
              >
                <div>
                  <div className="text-3xl font-bold text-success flex items-center gap-2">
                    <ArrowUpRight className="w-6 h-6" />
                    <CountUp end={24.5} decimals={1} suffix="%" duration={2} />
                  </div>
                  <p className="text-white/40 text-sm">Ort. Kazanç</p>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <div className="text-3xl font-bold text-white flex items-center gap-2">
                    <Users className="w-6 h-6 text-primary" />
                    <CountUp end={10} suffix="K+" duration={2} />
                  </div>
                  <p className="text-white/40 text-sm">Aktif Kullanıcı</p>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <div className="text-3xl font-bold text-white flex items-center gap-2">
                    <Activity className="w-6 h-6 text-secondary" />
                    <CountUp end={1} suffix="M+" duration={2} />
                  </div>
                  <p className="text-white/40 text-sm">Karşılaştırma</p>
                </div>
              </motion.div>

              {/* CTA Buttons */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link to="/register">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button size="xl" variant="gradient" className="w-full sm:w-auto shadow-xl shadow-primary/30">
                      Ücretsiz Başla
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </motion.div>
                </Link>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="xl" variant="outline" className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10">
                    <Play className="w-5 h-5 mr-2" />
                    Demo İzle
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Right Content - Interactive Preview */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="relative"
            >
              {/* Main Card */}
              <Card3D className="relative z-10">
                <GlassCard className="p-8 border-white/10">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-white/40 text-sm mb-1">Portföy Değeri</p>
                      <p className="text-3xl font-bold text-white">
                        ₺<CountUp end={156750} separator="." duration={2} />
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-success/20 px-3 py-1.5 rounded-full">
                      <TrendingUp className="w-4 h-4 text-success" />
                      <span className="text-success font-semibold">+12.5%</span>
                    </div>
                  </div>

                  {/* Animated Chart */}
                  <AnimatedStockLine />

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    {[
                      { label: 'Bugün', value: '+₺2,340', color: 'text-success' },
                      { label: 'Bu Hafta', value: '+₺8,120', color: 'text-success' },
                      { label: 'Bu Ay', value: '+₺15,450', color: 'text-success' },
                    ].map((stat, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.5 + i * 0.1 }}
                        className="text-center p-3 rounded-xl bg-white/5"
                      >
                        <p className="text-white/40 text-xs mb-1">{stat.label}</p>
                        <p className={cn("font-bold", stat.color)}>{stat.value}</p>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>
              </Card3D>

              {/* Floating Elements */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1, type: "spring" }}
                className="absolute -top-6 -right-6 z-20"
              >
                <GlassCard className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">THYAO +5.2%</p>
                    <p className="text-white/40 text-xs">Az önce</p>
                  </div>
                </GlassCard>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2, type: "spring" }}
                className="absolute -bottom-4 -left-8 z-20"
              >
                <GlassCard className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">Hedef: ₺200K</p>
                    <p className="text-white/40 text-xs">78% tamamlandı</p>
                  </div>
                </GlassCard>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex flex-col items-center gap-2 text-white/40"
          >
            <span className="text-sm">Keşfet</span>
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-32">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <span className="text-primary text-sm font-semibold tracking-wider uppercase mb-4 block">
              Özellikler
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Yatırım Kararlarını{' '}
              <span className="text-gradient">Güçlendir</span>
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-lg">
              En gelişmiş araçlarla portföyünü yönet, fırsatları yakala ve
              geçmiş kararlarını analiz et.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={BarChart3}
              title="Akıllı Karşılaştırma"
              description="İki farklı yatırım seçeneğini karşılaştır ve kaçırdığın fırsatları görselleştir. AI destekli analizlerle daha bilinçli kararlar al."
              gradient="from-primary to-purple-500"
              delay={0}
            />
            <FeatureCard
              icon={Wallet}
              title="Portföy Takibi"
              description="Tüm yatırımlarını tek bir yerden takip et. Anlık değerleme, kar/zarar analizi ve hedef takibi ile portföyünü optimize et."
              gradient="from-secondary to-emerald-500"
              delay={0.1}
            />
            <FeatureCard
              icon={PieChart}
              title="Detaylı Analizler"
              description="Sektör dağılımı, risk analizi ve performans metrikleri ile yatırımlarını derinlemesine analiz et."
              gradient="from-orange-500 to-red-500"
              delay={0.2}
            />
            <FeatureCard
              icon={Target}
              title="Hedef Belirleme"
              description="Finansal hedeflerini belirle ve ilerlemenizi takip et. Otomatik bildirimlerle hedeflerine ulaş."
              gradient="from-pink-500 to-rose-500"
              delay={0.3}
            />
            <FeatureCard
              icon={Shield}
              title="Güvenli Altyapı"
              description="Banka düzeyinde güvenlik ile verilerini koru. SSL şifreleme ve iki faktörlü kimlik doğrulama."
              gradient="from-cyan-500 to-blue-500"
              delay={0.4}
            />
            <FeatureCard
              icon={Globe}
              title="Global Veriler"
              description="BIST, NYSE, NASDAQ ve daha fazlası. Dünya genelindeki piyasaları tek platformdan takip et."
              gradient="from-indigo-500 to-violet-500"
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-10 py-32 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <span className="text-primary text-sm font-semibold tracking-wider uppercase mb-4 block">
              Nasıl Çalışır
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              3 Adımda <span className="text-gradient">Başla</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-24 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-primary via-secondary to-primary" />

            {[
              { step: '01', title: 'Hesap Oluştur', description: 'Ücretsiz hesabını saniyeler içinde oluştur', icon: Users },
              { step: '02', title: 'Hisse Seç', description: 'Karşılaştırmak istediğin hisseleri belirle', icon: BarChart3 },
              { step: '03', title: 'Analiz Et', description: 'Kaçırdığın fırsatları ve potansiyeli gör', icon: Sparkles },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="text-center relative"
              >
                <motion.div
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary mx-auto mb-6 flex items-center justify-center relative z-10"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <item.icon className="w-8 h-8 text-white" />
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-surface-dark border-2 border-primary flex items-center justify-center text-white text-sm font-bold">
                    {item.step}
                  </span>
                </motion.div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-white/60">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="relative z-10 py-32">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <span className="text-primary text-sm font-semibold tracking-wider uppercase mb-4 block">
              Kullanıcı Yorumları
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Kullanıcılarımız <span className="text-gradient">Ne Diyor?</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard
              name="Ahmet Yılmaz"
              role="Bireysel Yatırımcı"
              content="Keşke Alsaydım sayesinde yatırım kararlarımı daha bilinçli alıyorum. Kaçırdığım fırsatları görmek acı verici ama öğretici!"
              avatar="AY"
              delay={0}
            />
            <TestimonialCard
              name="Zeynep Kaya"
              role="Finans Uzmanı"
              content="Portföy takibi için mükemmel bir araç. Özellikle karşılaştırma özelliği, müşterilerime sunumlar yaparken çok işime yarıyor."
              avatar="ZK"
              delay={0.1}
            />
            <TestimonialCard
              name="Mehmet Demir"
              role="Yazılım Mühendisi"
              content="Arayüz çok kullanıcı dostu ve modern. Yatırım yapmaya yeni başlayanlar için bile anlaşılması kolay."
              avatar="MD"
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 py-32 bg-gradient-to-b from-transparent to-surface">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <span className="text-primary text-sm font-semibold tracking-wider uppercase mb-4 block">
              Fiyatlandırma
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Sana Uygun <span className="text-gradient">Planı Seç</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              title="Başlangıç"
              price="Ücretsiz"
              features={[
                '5 karşılaştırma/gün',
                'Temel portföy takibi',
                'Email desteği',
              ]}
              delay={0}
            />
            <PricingCard
              title="Pro"
              price="₺99"
              features={[
                'Sınırsız karşılaştırma',
                'Gelişmiş analizler',
                'Fiyat alarmları',
                'Öncelikli destek',
                'API erişimi',
              ]}
              popular
              delay={0.1}
            />
            <PricingCard
              title="Kurumsal"
              price="₺499"
              features={[
                'Tüm Pro özellikleri',
                'Çoklu kullanıcı',
                'Özel raporlama',
                'Dedicated destek',
                'SLA garantisi',
              ]}
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 py-32">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <GlassCard className="p-12 md:p-20 text-center relative overflow-hidden">
              {/* Background Effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/30 rounded-full blur-3xl" />

              <div className="relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary mx-auto mb-8 flex items-center justify-center"
                >
                  <Sparkles className="w-10 h-10 text-white" />
                </motion.div>

                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                  Hemen Başla,{' '}
                  <span className="text-gradient">Fırsatları Kaçırma!</span>
                </h2>
                <p className="text-white/60 mb-10 max-w-xl mx-auto text-lg">
                  Ücretsiz hesap oluştur ve yatırım karşılaştırmalarına hemen başla.
                  Kredi kartı gerektirmez.
                </p>

                <Link to="/register">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-block"
                  >
                    <Button size="xl" variant="gradient" className="shadow-2xl shadow-primary/40">
                      <Sparkles className="w-5 h-5 mr-2" />
                      Ücretsiz Hesap Oluştur
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </motion.div>
                </Link>

                <p className="text-white/40 text-sm mt-6">
                  10,000+ yatırımcı zaten aramıza katıldı
                </p>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <Link to="/" className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Keşke Alsaydım</span>
              </Link>
              <p className="text-white/40 text-sm leading-relaxed">
                Yatırım kararlarınızı güçlendiren akıllı platform.
                Kaçırdığınız fırsatları keşfedin, geleceğe hazırlıklı olun.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Ürün</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-white/40 hover:text-white transition-colors">Özellikler</a></li>
                <li><a href="#" className="text-white/40 hover:text-white transition-colors">Fiyatlandırma</a></li>
                <li><a href="#" className="text-white/40 hover:text-white transition-colors">API</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Şirket</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-white/40 hover:text-white transition-colors">Hakkımızda</a></li>
                <li><a href="#" className="text-white/40 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-white/40 hover:text-white transition-colors">Kariyer</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Destek</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-white/40 hover:text-white transition-colors">Yardım Merkezi</a></li>
                <li><a href="#" className="text-white/40 hover:text-white transition-colors">İletişim</a></li>
                <li><a href="#" className="text-white/40 hover:text-white transition-colors">Gizlilik</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/40 text-sm">
              © 2026 Keşke Alsaydım. Tüm hakları saklıdır.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-white/40 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <a href="#" className="text-white/40 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <a href="#" className="text-white/40 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
