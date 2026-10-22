import { motion } from 'framer-motion';
import './About.css';

const About = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="about-page"
    >
      {/* 1. HERO SECTION */}
      <section className="about-hero">
        <div className="about-hero-container">
          <motion.div 
            className="about-hero-content"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="about-eyebrow">OUR STORY</span>
            <h1 className="about-hero-title">
              Sweetness, Just the Way Nature Made It.
            </h1>
            <p className="about-hero-subtitle">
              At FRUTLLE, we believe that delicious food doesn’t need added sugar to taste wonderfully sweet.
            </p>
          </motion.div>
          <motion.div 
            className="about-hero-image-wrapper"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <img 
              src="/frutlle_about_hero_1791191399029.jpg" 
              alt="Premium FRUTLLE fruit spreads and fresh ingredients" 
              className="about-hero-image"
            />
          </motion.div>
        </div>
      </section>

      {/* 2. BRAND STORY SECTION */}
      <section className="about-story">
        <div className="about-container">
          <div className="about-story-grid">
            <motion.div 
              className="about-story-text"
              initial={{ y: 40, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="about-section-title">Where Our Story Began</h2>
              <div className="about-story-paragraphs">
                <p>
                  Our journey began with a simple idea: to create fruit spreads and jams that celebrate the natural sweetness of fruit — without adding refined or artificial sugars.
                </p>
                <p>
                  We wanted to bring something different to the table: honest ingredients, vibrant fruit flavours, and sweetness that comes naturally.
                </p>
              </div>
            </motion.div>
            <motion.div 
              className="about-story-image-wrapper"
              initial={{ scale: 0.95, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              <img 
                src="/frutlle_story_spread_1791191422865.jpg" 
                alt="Vibrant fruit jam spread on artisanal bread" 
                className="about-story-image"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. THE FRUTLLE PHILOSOPHY */}
      <section className="about-philosophy">
        <motion.div 
          className="about-container about-philosophy-content"
          initial={{ y: 40, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="about-decorative-line"></span>
          <h2 className="about-philosophy-title">Let the Fruit Speak.</h2>
          <p className="about-philosophy-text">
            Every FRUTLLE product is thoughtfully crafted to let the true character of the fruit shine through. Instead of relying on added sugars, we use carefully selected natural sweeteners to create a delicious balance of flavour and sweetness.
          </p>
        </motion.div>
      </section>

      {/* 4. NATURALLY SIMPLE */}
      <section className="about-simple">
        <div className="about-container">
          <div className="about-simple-grid">
            <motion.div 
              className="about-simple-image-wrapper"
              initial={{ x: -40, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <img 
                src="/frutlle_raw_fruit_1791191445385.jpg" 
                alt="Fresh raw berries and peaches" 
                className="about-simple-image"
              />
            </motion.div>
            <motion.div 
              className="about-simple-text"
              initial={{ x: 40, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="about-simple-heading">
                Real Fruit.<br />
                Carefully Chosen Ingredients.<br />
                No Added Sugar.
              </h2>
              <p className="about-simple-description">
                We believe in keeping things uncomplicated: real fruit, carefully chosen ingredients, and no added sugar.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5. CLOSING BRAND STATEMENT */}
      <section className="about-closing">
        <motion.div 
          className="about-closing-content"
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="about-closing-statement">
            “Because when nature already gives us something this delicious, why add more?”
          </h2>
          <div className="about-closing-brand">
            <h3 className="about-closing-logo">FRUTLLE</h3>
            <span className="about-closing-tagline">Fruitfully Natural</span>
          </div>
        </motion.div>
      </section>
    </motion.div>
  );
};

export default About;
