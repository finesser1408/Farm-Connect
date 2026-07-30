// src/pages/About.tsx
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect } from "react";

export default function About() {
  // FAQ toggle
  const toggleFaq = (button: HTMLButtonElement) => {
    const item = button.parentElement;
    if (item) {
      const isOpen = item.classList.toggle("open");
      button.setAttribute("aria-expanded", String(isOpen));
    }
  };

  // Newsletter subscription
  const subscribeNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.querySelector('input[type="email"]') as HTMLInputElement;
    const msg = document.getElementById("nl-msg");
    const email = input?.value?.trim() || "";
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!email) {
      if (msg) msg.textContent = "Please enter your email address.";
      return;
    }
    if (!valid) {
      if (msg) msg.textContent = "Please enter a valid email address.";
      return;
    }
    if (msg) {
      msg.textContent = "🎉 Thank you for subscribing! Welcome to the community.";
      msg.style.color = "#2e7a32";
    }
    input.value = "";
  };

  // Contact form
  const submitContact = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.querySelector('#cf-name') as HTMLInputElement)?.value?.trim() || "";
    const email = (form.querySelector('#cf-email') as HTMLInputElement)?.value?.trim() || "";
    const message = (form.querySelector('#cf-message') as HTMLTextAreaElement)?.value?.trim() || "";
    const msg = document.getElementById("cf-msg");
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!name || !email || !message) {
      if (msg) { msg.style.color = "#e65100"; msg.textContent = "Please fill in all fields."; }
      return;
    }
    if (!validEmail) {
      if (msg) { msg.style.color = "#e65100"; msg.textContent = "Please enter a valid email address."; }
      return;
    }
    if (msg) {
      msg.style.color = "#2e7a32";
      msg.textContent = "✅ Message sent! We'll get back to you within 24 hours.";
    }
    (form.querySelector('#cf-name') as HTMLInputElement).value = "";
    (form.querySelector('#cf-email') as HTMLInputElement).value = "";
    (form.querySelector('#cf-message') as HTMLTextAreaElement).value = "";
  };

  // Scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".animate").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Animated counters
  useEffect(() => {
    const animateCounter = (el: HTMLElement, target: number, suffix: string) => {
      let start = 0;
      const duration = 1800;
      const step = (timestamp: number) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(eased * target);
        el.textContent = value >= 1000 ? (value / 1000).toFixed(0) + "K+" : value + suffix;
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const statObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const target = parseInt(el.dataset.target || "0");
            const suffix = el.dataset.target === "100" ? "%" : "+";
            animateCounter(el, target, suffix);
            statObserver.unobserve(el);
          }
        });
      },
      { threshold: 0.4 }
    );
    document.querySelectorAll(".stat-number").forEach((el) => statObserver.observe(el));
    return () => statObserver.disconnect();
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <style>{`
          :root {
            --green-50: #f0faf0;
            --green-100: #d4edda;
            --green-200: #a8d9b3;
            --green-400: #4caf50;
            --green-500: #3d9440;
            --green-600: #2e7a32;
            --green-700: #1e5220;
            --green-800: #133516;
            --amber-400: #f9a825;
            --amber-500: #e65100;
            --gray-50: #fafafa;
            --gray-100: #f5f5f5;
            --gray-200: #eeeeee;
            --gray-400: #9e9e9e;
            --gray-600: #616161;
            --gray-800: #212121;
            --white: #ffffff;
            --shadow-sm: 0 1px 4px rgba(0,0,0,0.08);
            --shadow-md: 0 4px 16px rgba(0,0,0,0.10);
            --shadow-lg: 0 8px 32px rgba(0,0,0,0.12);
            --radius-sm: 6px;
            --radius-md: 10px;
            --radius-lg: 16px;
            --transition: 0.25s ease;
            --font: 'Segoe UI', Arial, Helvetica, sans-serif;
          }
          .container { max-width: 1100px; margin: 0 auto; padding: 0 20px; }
          .section { padding: 72px 0; }
          .section-title { font-size: clamp(1.6rem, 3vw, 2.2rem); font-weight: 700; color: var(--green-700); margin-bottom: 12px; }
          .section-sub { font-size: 1.05rem; color: var(--gray-600); max-width: 560px; margin-bottom: 48px; }
          .badge { display: inline-block; background: var(--green-50); color: var(--green-600); font-size: 0.78rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 14px; border-radius: 99px; border: 1px solid var(--green-200); margin-bottom: 14px; }
          .btn { display: inline-block; padding: 14px 32px; border-radius: var(--radius-md); font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: all var(--transition); border: 2px solid transparent; text-decoration: none; }
          .btn-primary { background: var(--green-400); color: var(--white); }
          .btn-primary:hover { background: var(--green-600); transform: translateY(-2px); box-shadow: var(--shadow-md); }
          .btn-outline { background: transparent; color: var(--green-400); border-color: var(--green-400); }
          .btn-outline:hover { background: var(--green-400); color: var(--white); transform: translateY(-2px); }
          .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
          .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; }
          .card { background: var(--white); border-radius: var(--radius-lg); padding: 28px 24px; box-shadow: var(--shadow-sm); border: 1px solid var(--gray-200); transition: box-shadow var(--transition), transform var(--transition); }
          .card:hover { box-shadow: var(--shadow-md); transform: translateY(-3px); }
          .hero { background: linear-gradient(135deg, rgba(30,82,32,0.88) 0%, rgba(19,53,22,0.82) 100%), url('https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1400&q=80') center/cover no-repeat; color: var(--white); padding: 120px 20px; text-align: center; }
          .hero-badge { background: rgba(255,255,255,0.18); color: var(--white); border-color: rgba(255,255,255,0.35); }
          .hero h1 { font-size: clamp(2.2rem, 5vw, 3.6rem); font-weight: 800; line-height: 1.18; margin-bottom: 20px; text-shadow: 0 2px 8px rgba(0,0,0,0.2); }
          .hero p { font-size: clamp(1rem, 2vw, 1.22rem); max-width: 580px; margin: 0 auto 36px; opacity: 0.9; }
          .hero-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
          .hero-stats { display: flex; gap: 40px; justify-content: center; margin-top: 56px; flex-wrap: wrap; }
          .hero-stat { text-align: center; }
          .hero-stat strong { display: block; font-size: 2rem; font-weight: 800; }
          .hero-stat span { font-size: 0.85rem; opacity: 0.8; }
          .mission { background: var(--white); }
          .mission-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 28px; }
          .mission-card { text-align: center; padding: 32px 20px; border-radius: var(--radius-lg); background: var(--green-50); border: 1px solid var(--green-100); transition: all var(--transition); }
          .mission-card:hover { background: var(--green-400); color: var(--white); transform: translateY(-4px); }
          .mission-card:hover .mission-icon { background: rgba(255,255,255,0.2); }
          .mission-card:hover .mission-title { color: var(--white); }
          .mission-card:hover .mission-text { color: rgba(255,255,255,0.85); }
          .mission-icon { width: 60px; height: 60px; background: var(--green-100); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; margin: 0 auto 16px; transition: background var(--transition); }
          .mission-title { font-size: 1rem; font-weight: 700; color: var(--green-700); margin-bottom: 8px; transition: color var(--transition); }
          .mission-text { font-size: 0.88rem; color: var(--gray-600); line-height: 1.6; transition: color var(--transition); }
          .gallery { background: var(--gray-100); }
          .gallery-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
          .gallery-item { border-radius: var(--radius-md); overflow: hidden; aspect-ratio: 4/3; position: relative; cursor: pointer; }
          .gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; }
          .gallery-item:hover img { transform: scale(1.07); }
          .gallery-caption { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.6)); color: var(--white); padding: 24px 14px 12px; font-size: 0.85rem; font-weight: 600; transform: translateY(100%); transition: transform var(--transition); }
          .gallery-item:hover .gallery-caption { transform: translateY(0); }
          .offer { background: var(--white); }
          .offer-card { text-align: center; }
          .offer-icon { font-size: 2.4rem; margin-bottom: 14px; }
          .why { background: var(--green-700); color: var(--white); }
          .why .section-title { color: var(--white); }
          .why .section-sub { color: rgba(255,255,255,0.75); }
          .why-card { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); border-radius: var(--radius-lg); padding: 24px 20px; transition: all var(--transition); }
          .why-card:hover { background: rgba(255,255,255,0.18); transform: translateY(-3px); }
          .why-icon { width: 48px; height: 48px; background: rgba(255,255,255,0.15); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; margin-bottom: 14px; }
          .why-card h3 { font-size: 0.95rem; font-weight: 700; margin-bottom: 6px; }
          .why-card p { font-size: 0.85rem; opacity: 0.8; line-height: 1.55; }
          .stats { background: var(--white); padding: 72px 0; }
          .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 32px; }
          .stat-card { text-align: center; padding: 36px 20px; background: var(--green-50); border-radius: var(--radius-lg); border: 1px solid var(--green-100); }
          .stat-number { font-size: clamp(2.2rem, 4vw, 3rem); font-weight: 800; color: var(--green-500); line-height: 1; margin-bottom: 8px; }
          .stat-label { font-size: 0.9rem; color: var(--gray-600); font-weight: 500; }
          .testimonials { background: var(--gray-100); }
          .testimonial-stars { color: var(--amber-400); font-size: 1.1rem; margin-bottom: 14px; }
          .testimonial-text { font-size: 0.95rem; color: var(--gray-600); line-height: 1.7; margin-bottom: 20px; font-style: italic; }
          .testimonial-author { display: flex; align-items: center; gap: 12px; }
          .author-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--green-100); display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 700; color: var(--green-700); flex-shrink: 0; }
          .author-name { font-size: 0.9rem; font-weight: 700; color: var(--gray-800); }
          .author-role { font-size: 0.78rem; color: var(--gray-400); }
          .faq { background: var(--white); }
          .faq-list { max-width: 720px; margin: 0 auto; }
          .faq-item { border-bottom: 1px solid var(--gray-200); }
          .faq-question { width: 100%; text-align: left; background: none; border: none; padding: 20px 0; font-size: 0.97rem; font-weight: 600; color: var(--gray-800); cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 12px; transition: color var(--transition); font-family: var(--font); }
          .faq-question:hover { color: var(--green-600); }
          .faq-icon { flex-shrink: 0; font-size: 1.4rem; color: var(--green-500); font-weight: 300; transition: transform var(--transition); }
          .faq-answer { max-height: 0; overflow: hidden; transition: max-height 0.35s ease, padding 0.25s ease; }
          .faq-answer p { padding-bottom: 18px; font-size: 0.92rem; color: var(--gray-600); line-height: 1.7; }
          .faq-item.open .faq-answer { max-height: 300px; }
          .faq-item.open .faq-icon { transform: rotate(45deg); }
          .newsletter { background: linear-gradient(135deg, var(--green-400) 0%, var(--green-700) 100%); color: var(--white); padding: 72px 20px; text-align: center; }
          .newsletter h2 { font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 800; margin-bottom: 10px; }
          .newsletter p { font-size: 1rem; opacity: 0.9; margin-bottom: 32px; }
          .newsletter-form { display: flex; gap: 12px; max-width: 480px; margin: 0 auto; flex-wrap: wrap; justify-content: center; }
          .newsletter-form input { flex: 1; min-width: 220px; padding: 14px 20px; border-radius: var(--radius-md); border: 2px solid transparent; font-size: 0.95rem; outline: none; font-family: var(--font); transition: border-color var(--transition); }
          .newsletter-form input:focus { border-color: var(--amber-400); }
          .newsletter-form .btn { flex-shrink: 0; background: var(--white); color: var(--green-700); font-weight: 700; }
          .newsletter-form .btn:hover { background: var(--green-50); }
          .newsletter-msg { margin-top: 14px; font-size: 0.88rem; min-height: 1.4em; }
          .contact { background: var(--gray-100); }
          .contact-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
          @media (max-width: 680px) { .contact-inner { grid-template-columns: 1fr; } }
          .contact-info h3 { font-size: 1.1rem; font-weight: 700; color: var(--green-700); margin-bottom: 20px; }
          .contact-item { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 18px; }
          .contact-item-icon { width: 40px; height: 40px; background: var(--green-50); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; border: 1px solid var(--green-100); }
          .contact-item-text a { color: var(--green-600); transition: color var(--transition); }
          .contact-item-text a:hover { color: var(--green-800); text-decoration: underline; }
          .contact-item-text strong { display: block; font-size: 0.82rem; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
          .social-links { display: flex; gap: 10px; margin-top: 24px; }
          .social-btn { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; transition: all var(--transition); border: 1px solid var(--gray-200); background: var(--white); text-decoration: none; color: var(--gray-600); }
          .social-btn:hover { background: var(--green-400); color: var(--white); border-color: var(--green-400); transform: translateY(-2px); }
          .contact-form-wrap { background: var(--white); border-radius: var(--radius-lg); padding: 28px; box-shadow: var(--shadow-sm); border: 1px solid var(--gray-200); }
          .form-group { margin-bottom: 16px; }
          .form-group label { display: block; font-size: 0.82rem; font-weight: 600; color: var(--gray-600); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
          .form-group input, .form-group textarea { width: 100%; padding: 11px 14px; border: 1.5px solid var(--gray-200); border-radius: var(--radius-sm); font-size: 0.92rem; font-family: var(--font); outline: none; transition: border-color var(--transition); background: var(--white); color: var(--gray-800); }
          .form-group input:focus, .form-group textarea:focus { border-color: var(--green-400); }
          .form-group textarea { resize: vertical; min-height: 100px; }
          .map-section iframe { display: block; width: 100%; height: 360px; border: none; }
          .cta-section { background: linear-gradient(135deg, var(--green-50) 0%, var(--green-100) 100%); padding: 96px 20px; text-align: center; }
          .cta-section h2 { font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 800; color: var(--green-700); margin-bottom: 16px; }
          .cta-section p { font-size: 1.05rem; color: var(--gray-600); max-width: 500px; margin: 0 auto 36px; }
          .cta-decorative { font-size: 4rem; margin-bottom: 20px; }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
          .animate { opacity: 0; }
          .animate.visible { animation: fadeUp 0.6s ease forwards; }
        `}</style>

        {/* Hero */}
        <header className="hero" id="hero">
          <div className="badge hero-badge">🌾 Locally Sourced, Freshly Delivered</div>
          <h1>Farm Fresh Hub</h1>
          <p>Connecting local farmers with fresh, healthy communities — from the soil to your table.</p>
          <div className="hero-actions">
            <a href="/marketplace" className="btn btn-primary">Browse Products</a>
            <a href="#about" className="btn btn-outline" style={{ color: "white", borderColor: "rgba(255,255,255,0.6)" }}>Learn More</a>
          </div>
          <div className="hero-stats">
            <div className="hero-stat"><strong>50+</strong><span>Local Farmers</span></div>
            <div className="hero-stat"><strong>2,000+</strong><span>Weekly Deliveries</span></div>
            <div className="hero-stat"><strong>10,000+</strong><span>Happy Customers</span></div>
          </div>
        </header>

        {/* About */}
        <section className="section" id="about" style={{ background: "var(--white)" }}>
          <div className="container">
            <div className="badge">About Us</div>
            <h2 className="section-title">Who We Are</h2>
            <p className="section-sub">Farm Fresh Hub is a community-driven platform that bridges the gap between local farmers and families seeking genuinely fresh, nutritious produce. Founded on a love for sustainable agriculture, we believe great food starts at the source.</p>
            <div className="grid-2">
              <div className="card animate">
                <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🌿</div>
                <h3 style={{ color: "var(--green-700)", fontSize: "1rem", fontWeight: 700, marginBottom: "8px" }}>Our Story</h3>
                <p style={{ fontSize: "0.9rem", color: "var(--gray-600)" }}>Started in 2018 by a small group of passionate farmers and food advocates, we've grown into a trusted marketplace serving thousands of households every week — all while keeping our roots firmly in the local community.</p>
              </div>
              <div className="card animate" style={{ animationDelay: "0.1s" }}>
                <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🤝</div>
                <h3 style={{ color: "var(--green-700)", fontSize: "1rem", fontWeight: 700, marginBottom: "8px" }}>Our Values</h3>
                <p style={{ fontSize: "0.9rem", color: "var(--gray-600)" }}>Transparency, sustainability, and fairness guide everything we do. Farmers receive fair compensation, customers receive honest produce, and our planet benefits from reduced food miles and eco-conscious practices.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="section mission" id="mission">
          <div className="container">
            <div className="badge">Our Mission</div>
            <h2 className="section-title">What Drives Us</h2>
            <p className="section-sub">Every decision we make is guided by four core commitments to our farmers, customers, and the wider world.</p>
            <div className="mission-grid">
              <div className="mission-card animate">
                <div className="mission-icon">👨‍🌾</div>
                <div className="mission-title">Support Local Farmers</div>
                <div className="mission-text">Ensuring fair wages and direct market access for family farms within 150 km of your door.</div>
              </div>
              <div className="mission-card animate" style={{ animationDelay: "0.1s" }}>
                <div className="mission-icon">💚</div>
                <div className="mission-title">Affordable Fresh Produce</div>
                <div className="mission-text">Cutting out middlemen so fresh, healthy food stays within reach for every family.</div>
              </div>
              <div className="mission-card animate" style={{ animationDelay: "0.2s" }}>
                <div className="mission-icon">🌍</div>
                <div className="mission-title">Sustainable Agriculture</div>
                <div className="mission-text">Promoting organic practices, minimal packaging, and carbon-aware delivery routes.</div>
              </div>
              <div className="mission-card animate" style={{ animationDelay: "0.3s" }}>
                <div className="mission-icon">🏘️</div>
                <div className="mission-title">Strengthen Communities</div>
                <div className="mission-text">Building real relationships between neighbours, farmers, and local food culture.</div>
              </div>
            </div>
          </div>
        </section>

        {/* Gallery */}
        <section className="section gallery">
          <div className="container">
            <div className="badge">From Our Farms</div>
            <h2 className="section-title">The Journey from Farm to Table</h2>
            <p className="section-sub">A glimpse into the landscapes and hands behind every order.</p>
            <div className="gallery-grid">
              <div className="gallery-item animate">
                <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=75" alt="Fresh vegetables" loading="lazy" />
                <div className="gallery-caption">Fresh Vegetables</div>
              </div>
              <div className="gallery-item animate" style={{ animationDelay: "0.1s" }}>
                <img src="https://images.stockcake.com/public/a/4/7/a47b4392-872b-4e5e-a522-a916d7832939_large/sustainable-harvest-collaboration-stockcake.jpg" alt="Farmers harvesting" loading="lazy" />
                <div className="gallery-caption">Harvest Season</div>
              </div>
              <div className="gallery-item animate" style={{ animationDelay: "0.2s" }}>
                <img src="https://images.unsplash.com/photo-1533062618053-d51e617307ec?w=600&q=75" alt="Organic produce" loading="lazy" />
                <div className="gallery-caption">Organic Produce</div>
              </div>
              <div className="gallery-item animate" style={{ animationDelay: "0.3s" }}>
                <img src="https://images.unsplash.com/photo-1500076656116-558758c991c1?w=600&q=75" alt="Farm landscape" loading="lazy" />
                <div className="gallery-caption">Farm Landscapes</div>
              </div>
            </div>
          </div>
        </section>

        {/* Products / Offer */}
        <section className="section offer" id="products">
          <div className="container">
            <div className="badge">What We Offer</div>
            <h2 className="section-title">Fresh From the Source</h2>
            <p className="section-sub">Carefully curated categories of the finest local produce, delivered to your door.</p>
            <div className="grid-3">
              <div className="card offer-card animate">
                <div className="offer-icon">🥬</div>
                <h3>Vegetables & Fruits</h3>
                <p>Seasonal selection hand-picked at peak ripeness from certified local farms.</p>
              </div>
              <div className="card offer-card animate" style={{ animationDelay: "0.1s" }}>
                <div className="offer-icon">🥚</div>
                <h3>Organic Eggs & Dairy</h3>
                <p>Free-range eggs, artisan cheese, and fresh milk from pasture-raised animals.</p>
              </div>
              <div className="card offer-card animate" style={{ animationDelay: "0.2s" }}>
                <div className="offer-icon">🍞</div>
                <h3>Bread & Baked Goods</h3>
                <p>Sourdough, whole-grain loaves, and pastries baked fresh each morning.</p>
              </div>
              <div className="card offer-card animate" style={{ animationDelay: "0.3s" }}>
                <div className="offer-icon">🍯</div>
                <h3>Honey & Jams</h3>
                <p>Raw wildflower honey and slow-cooked preserves with no added preservatives.</p>
              </div>
              <div className="card offer-card animate" style={{ animationDelay: "0.4s" }}>
                <div className="offer-icon">🌿</div>
                <h3>Fresh Herbs</h3>
                <p>Basil, rosemary, mint, and more — potted or cut — for the kitchen and garden.</p>
              </div>
              <div className="card offer-card animate" style={{ animationDelay: "0.5s" }}>
                <div className="offer-icon">🫙</div>
                <h3>Pantry Staples</h3>
                <p>Locally milled flours, cold-pressed oils, and artisan condiments from nearby producers.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Us */}
        <section className="section why">
          <div className="container">
            <div className="badge" style={{ background: "rgba(255,255,255,0.15)", color: "white", borderColor: "rgba(255,255,255,0.3)" }}>Why Choose Us</div>
            <h2 className="section-title">The Farm Fresh Difference</h2>
            <p className="section-sub">Six reasons our community keeps coming back every week.</p>
            <div className="grid-3">
              <div className="why-card animate">
                <div className="why-icon">✅</div>
                <h3>100% Fresh, Never Frozen</h3>
                <p>Every product is delivered within 24 hours of harvest. No cold storage, no compromises.</p>
              </div>
              <div className="why-card animate" style={{ animationDelay: "0.1s" }}>
                <div className="why-icon">🚚</div>
                <h3>Free Delivery Over $50</h3>
                <p>Qualifying orders delivered free to your door, with same-day slots available in most areas.</p>
              </div>
              <div className="why-card animate" style={{ animationDelay: "0.2s" }}>
                <div className="why-icon">👨‍🌾</div>
                <h3>Support Family Farms</h3>
                <p>80 cents of every dollar goes directly to the farmer — not to corporate middlemen.</p>
              </div>
              <div className="why-card animate" style={{ animationDelay: "0.3s" }}>
                <div className="why-icon">♻️</div>
                <h3>Eco-Friendly Packaging</h3>
                <p>All packaging is compostable, recyclable, or reusable. Zero single-use plastic.</p>
              </div>
              <div className="why-card animate" style={{ animationDelay: "0.4s" }}>
                <div className="why-icon">💵</div>
                <h3>Affordable Pricing</h3>
                <p>Fresh and local doesn't have to mean expensive. We keep our margins lean for you.</p>
              </div>
              <div className="why-card animate" style={{ animationDelay: "0.5s" }}>
                <div className="why-icon">⭐</div>
                <h3>Quality Assurance</h3>
                <p>Every batch is inspected before dispatch. Not happy? We'll replace it, no questions asked.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="stats">
          <div className="container">
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <div className="badge">Impact</div>
              <h2 className="section-title" style={{ margin: "0 auto" }}>Our Numbers Speak for Themselves</h2>
            </div>
            <div className="stats-grid">
              <div className="stat-card animate"><div className="stat-number" data-target="50">0</div><div className="stat-label">Local Farmers Supported</div></div>
              <div className="stat-card animate" style={{ animationDelay: "0.1s" }}><div className="stat-number" data-target="2000">0</div><div className="stat-label">Weekly Deliveries</div></div>
              <div className="stat-card animate" style={{ animationDelay: "0.2s" }}><div className="stat-number" data-target="10000">0</div><div className="stat-label">Happy Customers</div></div>
              <div className="stat-card animate" style={{ animationDelay: "0.3s" }}><div className="stat-number" data-target="100">0</div><div className="stat-label">% Locally Sourced</div></div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="section testimonials">
          <div className="container">
            <div style={{ textAlign: "center" }}>
              <div className="badge">Testimonials</div>
              <h2 className="section-title">What Our Customers Say</h2>
              <p className="section-sub" style={{ margin: "0 auto 48px" }}>Real words from real members of our community.</p>
            </div>
            <div className="grid-3">
              <div className="card testimonial-card animate">
                <div className="testimonial-stars">★★★★★</div>
                <p className="testimonial-text">"I switched to Farm Fresh Hub six months ago and I genuinely cannot go back to supermarket produce. The tomatoes taste like actual tomatoes again!"</p>
                <div className="testimonial-author">
                  <div className="author-avatar">TN</div>
                  <div><div className="author-name">Thandiwe Ndlovu</div><div className="author-role">Home Cook, Harare</div></div>
                </div>
              </div>
              <div className="card testimonial-card animate" style={{ animationDelay: "0.1s" }}>
                <div className="testimonial-stars">★★★★★</div>
                <p className="testimonial-text">"As a restaurant owner, freshness is everything. Farm Fresh Hub delivers consistently excellent produce on time, every time. My kitchen team loves it."</p>
                <div className="testimonial-author">
                  <div className="author-avatar">KM</div>
                  <div><div className="author-name">Kofi Mensah</div><div className="author-role">Restaurant Owner</div></div>
                </div>
              </div>
              <div className="card testimonial-card animate" style={{ animationDelay: "0.2s" }}>
                <div className="testimonial-stars">★★★★★</div>
                <p className="testimonial-text">"Knowing that my groceries support local farmers makes every meal feel more meaningful. The quality and service are both outstanding."</p>
                <div className="testimonial-author">
                  <div className="author-avatar">AM</div>
                  <div><div className="author-name">Aisha Mwamba</div><div className="author-role">Nutritionist</div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section faq">
          <div className="container">
            <div style={{ textAlign: "center" }}>
              <div className="badge">FAQ</div>
              <h2 className="section-title">Frequently Asked Questions</h2>
              <p className="section-sub" style={{ margin: "0 auto 40px" }}>Everything you need to know before your first order.</p>
            </div>
            <div className="faq-list">
              <div className="faq-item">
                <button className="faq-question" onClick={(e) => toggleFaq(e.currentTarget)}>
                  Where do your products come from?
                  <span className="faq-icon">+</span>
                </button>
                <div className="faq-answer"><p>All our produce comes from a vetted network of family farms located within 150 km of your delivery area. We visit each farm personally and conduct regular quality audits to ensure standards are upheld.</p></div>
              </div>
              <div className="faq-item">
                <button className="faq-question" onClick={(e) => toggleFaq(e.currentTarget)}>
                  Do you offer delivery, and how does it work?
                  <span className="faq-icon">+</span>
                </button>
                <div className="faq-answer"><p>Yes! We deliver Monday through Saturday. Orders placed before 8 pm are dispatched the following morning. Free delivery applies to all orders over $50; a flat fee of $5 applies to smaller orders. You'll receive a tracking link when your box is on its way.</p></div>
              </div>
              <div className="faq-item">
                <button className="faq-question" onClick={(e) => toggleFaq(e.currentTarget)}>
                  How often do you restock?
                  <span className="faq-icon">+</span>
                </button>
                <div className="faq-answer"><p>Our inventory is updated daily as farmers deliver fresh batches every morning. Seasonal items may sell out quickly — we recommend subscribing to our newsletter to get notified about restocks and new arrivals.</p></div>
              </div>
              <div className="faq-item">
                <button className="faq-question" onClick={(e) => toggleFaq(e.currentTarget)}>
                  Are your products organic?
                  <span className="faq-icon">+</span>
                </button>
                <div className="faq-answer"><p>Many of our partner farms are certified organic. Products with an organic certification are clearly labelled on our website. All farms, whether or not certified, follow sustainable, low-chemical growing practices that we verify in person.</p></div>
              </div>
              <div className="faq-item">
                <button className="faq-question" onClick={(e) => toggleFaq(e.currentTarget)}>
                  What if I'm not happy with my order?
                  <span className="faq-icon">+</span>
                </button>
                <div className="faq-answer"><p>Your satisfaction is our priority. If anything in your order doesn't meet expectations, contact us within 24 hours of delivery and we'll issue a full replacement or refund — no questions asked.</p></div>
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <section className="newsletter">
          <div className="badge" style={{ background: "rgba(255,255,255,0.18)", color: "white", borderColor: "rgba(255,255,255,0.3)" }}>Stay in the Loop</div>
          <h2>Get Weekly Harvest Updates</h2>
          <p>Be the first to know about seasonal specials, new farmers, and exclusive subscriber-only discounts.</p>
          <form className="newsletter-form" onSubmit={subscribeNewsletter}>
            <input type="email" placeholder="Your email address" aria-label="Email address" required />
            <button type="submit" className="btn">Subscribe</button>
          </form>
          <p className="newsletter-msg" id="nl-msg"></p>
        </section>

        {/* Contact */}
        <section className="section contact" id="contact">
          <div className="container">
            <div className="badge">Contact Us</div>
            <h2 className="section-title">Get in Touch</h2>
            <p className="section-sub">We'd love to hear from you — whether you're a customer, a farmer, or just curious.</p>
            <div className="contact-inner">
              <div className="contact-info">
                <h3>Contact Information</h3>
                <div className="contact-item">
                  <div className="contact-item-icon">📧</div>
                  <div className="contact-item-text"><strong>Email</strong><a href="mailto:hello@farmfreshhub.com">hello@farmfreshhub.com</a></div>
                </div>
                <div className="contact-item">
                  <div className="contact-item-icon">📞</div>
                  <div className="contact-item-text"><strong>Phone</strong><a href="tel:0771234567">077 123 4567</a></div>
                </div>
                <div className="contact-item">
                  <div className="contact-item-icon">📍</div>
                  <div className="contact-item-text"><strong>Address</strong><span>123 Farm Road, Freshville</span></div>
                </div>
                <div className="contact-item">
                  <div className="contact-item-icon">🕐</div>
                  <div className="contact-item-text"><strong>Hours</strong><span>Mon–Sat, 7 am – 6 pm</span></div>
                </div>
                <div className="social-links">
                  <a href="#" className="social-btn">f</a>
                  <a href="#" className="social-btn" style={{ fontStyle: "italic" }}>in</a>
                  <a href="#" className="social-btn">W</a>
                </div>
              </div>
              <div className="contact-form-wrap">
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--green-700)", marginBottom: "20px" }}>Send Us a Message</h3>
                <form onSubmit={submitContact}>
                  <div className="form-group">
                    <label htmlFor="cf-name">Name</label>
                    <input type="text" id="cf-name" placeholder="Your full name" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cf-email">Email</label>
                    <input type="email" id="cf-email" placeholder="your@email.com" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cf-message">Message</label>
                    <textarea id="cf-message" placeholder="How can we help you?" required></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Send Message</button>
                  <p id="cf-msg" style={{ marginTop: "10px", fontSize: "0.85rem", color: "var(--green-600)" }}></p>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Map */}
        <div className="map-section">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3800.0!2d31.0522!3d-17.8252!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTfCsDQ5JzMwLjciUyAzMcKwMDMnMDguMCJF!5e0!3m2!1sen!2szw!4v1600000000000!5m2!1sen!2szw"
            title="Farm Fresh Hub location map"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>

        {/* CTA */}
        <section className="cta-section">
          <div className="cta-decorative">🛒</div>
          <h2>Shop Fresh Produce Today</h2>
          <p>Join thousands of families already enjoying farm-direct freshness delivered straight to their doors.</p>
          <a href="/marketplace" className="btn btn-primary" style={{ fontSize: "1.05rem", padding: "16px 40px" }}>Browse Products</a>
        </section>
      </main>

      <Footer />
    </div>
  );
}
          