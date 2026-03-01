import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, TrendingUp, Wallet, Zap, Shield, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/card';
import CountUp from 'react-countup';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-dark overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/5 to-transparent" />
      </div>

      {/* Floating ticker bar */}
      <div className="relative border-b border-white/5 bg-black/20 backdrop-blur-sm">
        <div className="overflow-hidden py-2">
          <div className="flex space-x-8 ticker-scroll whitespace-nowrap">
            {['THYAO +2.45%', 'GARAN -1.23%', 'ASELS +3.67%', 'BIST100 +0.89%', 'USDTRY +0.12%', 'GOLD +0.56%'].map((item, i) => (
              <span key={i} className={`text-sm font-mono ${item.includes('+') ? 'text-success' : 'text-danger'}`}>
                {item}
              </span>
            ))}
            {['THYAO +2.45%', 'GARAN -1.23%', 'ASELS +3.67%', 'BIST100 +0.89%', 'USDTRY +0.12%', 'GOLD +0.56%'].map((item, i) => (
              <span key={`dup-${i}`} className={`text-sm font-mono ${item.includes('+') ? 'text-success' : 'text-danger'}`}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Keşke Alsaydım</span>
          </Link>

          <div className="flex items-center space-x-4">
            <Link to="/login">
              <Button variant="ghost" className="text-white/80 hover:text-white">
                Giriş Yap
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="gradient">
                Ücretsiz Başla
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-4 pt-20 pb-32">
        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div variants={fadeInUp} className="mb-6">
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Zap className="w-4 h-4 mr-2" />
              Yatırım Fırsatlarını Keşfet
            </span>
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight"
          >
            Keşke O Hisseyi{' '}
            <span className="text-gradient">Alsaydın?</span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-xl text-white/60 mb-12 max-w-2xl mx-auto"
          >
            Kaçırdığın fırsatları keşfet, portföyünü takip et ve daha akıllı yatırım kararları al.
            Geçmişteki seçimlerini analiz et, geleceğe daha hazırlıklı ol.
          </motion.p>

          {/* Animated numbers */}
          <motion.div
            variants={fadeInUp}
            className="flex justify-center gap-8 mb-12"
          >
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-success">
                +₺<CountUp end={152340} separator="." duration={2.5} />
              </div>
              <p className="text-white/40 text-sm mt-1">Ortalama kazanç farkı</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-danger">
                -₺<CountUp end={87650} separator="." duration={2.5} />
              </div>
              <p className="text-white/40 text-sm mt-1">Kaçırılan fırsat</p>
            </div>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/register">
              <Button size="xl" variant="gradient" className="w-full sm:w-auto">
                Ücretsiz Başla
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button size="xl" variant="outline" className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10">
              Demo İzle
            </Button>
          </motion.div>
        </motion.div>

        {/* Mockup Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="relative mt-20 max-w-5xl mx-auto"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-surface-dark via-transparent to-transparent z-10" />
          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl transform perspective-1000 rotate-x-2">
            <div className="bg-surface p-4 border-b border-white/10">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
            </div>
            <div className="bg-surface-light p-8">
              <div className="grid grid-cols-3 gap-4">
                <GlassCard className="p-6 col-span-2">
                  <div className="h-4 w-32 bg-white/10 rounded mb-4" />
                  <div className="h-40 bg-gradient-to-r from-success/20 to-primary/20 rounded-lg" />
                </GlassCard>
                <GlassCard className="p-6">
                  <div className="h-4 w-24 bg-white/10 rounded mb-4" />
                  <div className="space-y-3">
                    <div className="h-8 bg-success/20 rounded" />
                    <div className="h-8 bg-danger/20 rounded" />
                    <div className="h-8 bg-primary/20 rounded" />
                  </div>
                </GlassCard>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-24 border-t border-white/5">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Güçlü Özellikler
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Yatırım kararlarınızı güçlendirmek için ihtiyacınız olan tüm araçlar
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: BarChart3,
                title: 'Karşılaştır',
                description: 'İki farklı yatırım seçeneğini karşılaştır ve hangi fırsatları kaçırdığını gör.',
                gradient: 'from-primary to-purple-500'
              },
              {
                icon: Wallet,
                title: 'Takip Et',
                description: 'Portföyünü anlık takip et, performansını ölç ve hedeflerine ulaş.',
                gradient: 'from-secondary to-emerald-500'
              },
              {
                icon: TrendingUp,
                title: 'Analiz Et',
                description: 'Detaylı analizler ve metriklerle daha bilinçli yatırım kararları al.',
                gradient: 'from-orange-500 to-red-500'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className="p-8 h-full hover:border-white/20 transition-colors">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                  <p className="text-white/60">{feature.description}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-24 bg-gradient-to-b from-transparent to-surface">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { value: 10000, suffix: '+', label: 'Aktif Kullanıcı' },
              { value: 1000000, suffix: '+', label: 'Karşılaştırma' },
              { value: 500, suffix: '+', label: 'Hisse Senedi' },
              { value: 99.9, suffix: '%', label: 'Uptime' }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                  <CountUp end={stat.value} separator="." duration={2} suffix={stat.suffix} />
                </div>
                <p className="text-white/40">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="relative z-10 py-24 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-40">
            {[Shield, Globe, Zap].map((Icon, index) => (
              <div key={index} className="flex items-center gap-3 text-white/60">
                <Icon className="w-6 h-6" />
                <span className="text-sm font-medium">
                  {index === 0 && 'Güvenli Altyapı'}
                  {index === 1 && 'Global Veriler'}
                  {index === 2 && 'Anlık Güncellemeler'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-4">
          <GlassCard className="p-12 md:p-16 text-center gradient-border">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Hemen Başla, Fırsatları Kaçırma!
            </h2>
            <p className="text-white/60 mb-8 max-w-xl mx-auto">
              Ücretsiz hesap oluştur ve yatırım karşılaştırmalarına hemen başla.
              Kredi kartı gerektirmez.
            </p>
            <Link to="/register">
              <Button size="xl" variant="gradient">
                Ücretsiz Hesap Oluştur
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </GlassCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Keşke Alsaydım</span>
            </div>
            <p className="text-white/40 text-sm">
              © 2026 Keşke Alsaydım. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
