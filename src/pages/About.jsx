import { motion } from 'framer-motion';
import heroImg from '../assets/images/jam_hero.jpg';

const About = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <section className="container section">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-4xl)', alignItems: 'center' }}>
          
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="heading-xl" style={{ marginBottom: 'var(--space-lg)' }}>Our Story</h1>
            <p style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)' }}>
              It started in 1995 with a single copper pot and a basket of freshly picked strawberries.
            </p>
            <p style={{ color: 'var(--color-text)', marginBottom: 'var(--space-md)' }}>
              At FRUTLLE, we believe that the best flavors come from the simplest ingredients. That's why we partner exclusively with local organic farms to source fruits at their absolute peak of ripeness. 
            </p>
            <p style={{ color: 'var(--color-text)', marginBottom: 'var(--space-lg)' }}>
              We never use artificial preservatives, colors, or high-fructose corn syrup. Just pure fruit, natural cane sugar, and a touch of lemon juice to naturally set our preserves. Every jar is handcrafted in small batches to ensure the highest quality and perfect taste.
            </p>
            
            <div style={{ display: 'flex', gap: 'var(--space-2xl)', marginTop: 'var(--space-2xl)' }}>
              <div>
                <h3 className="heading-lg" style={{ color: 'var(--color-primary)', marginBottom: '0.25rem' }}>25+</h3>
                <p style={{ textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.1em' }}>Years of Craft</p>
              </div>
              <div>
                <h3 className="heading-lg" style={{ color: 'var(--color-primary)', marginBottom: '0.25rem' }}>100%</h3>
                <p style={{ textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.1em' }}>Organic</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ x: 50, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}
          >
            <img src={heroImg} alt="Making jam" style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: '500px' }} />
          </motion.div>
          
        </div>
      </section>

      <section style={{ backgroundColor: 'var(--color-secondary)', padding: 'var(--space-4xl) 0' }}>
        <div className="container text-center">
          <h2 className="heading-lg" style={{ marginBottom: 'var(--space-3xl)' }}>Our Process</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-2xl)' }}>
            <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
              <div style={{ width: '80px', height: '80px', backgroundColor: 'var(--color-white)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-lg)', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>1</div>
              <h3>Harvest</h3>
              <p style={{ color: 'var(--color-text)' }}>Hand-picked at peak ripeness from local farms.</p>
            </motion.div>
            
            <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
              <div style={{ width: '80px', height: '80px', backgroundColor: 'var(--color-white)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-lg)', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>2</div>
              <h3>Preparation</h3>
              <p style={{ color: 'var(--color-text)' }}>Washed and cut by hand to ensure perfect texture.</p>
            </motion.div>

            <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
              <div style={{ width: '80px', height: '80px', backgroundColor: 'var(--color-white)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-lg)', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>3</div>
              <h3>Slow Cooking</h3>
              <p style={{ color: 'var(--color-text)' }}>Simmered in copper pots in small batches.</p>
            </motion.div>
            
            <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }}>
              <div style={{ width: '80px', height: '80px', backgroundColor: 'var(--color-white)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-lg)', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>4</div>
              <h3>Sealing</h3>
              <p style={{ color: 'var(--color-text)' }}>Jarred hot and sealed to lock in the freshness.</p>
            </motion.div>
          </div>
        </div>
      </section>
    </motion.div>
  );
};

export default About;
