"use client";

import type React from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Menu,
  X,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Globe,
  Send,
  Gem,
  Hammer,
  HeartHandshake,
  Sparkles,
} from "lucide-react";

const services = [
  "New Tombstone Sales",
  "Tombstone Maintenance",
  "Granite Kitchen Tops",
  "Quartz Kitchen Tops",
  "Cut to Size Granite",
  "Ledgers",
];

const catalogueItems = [
  {
    title: "New Tombstone Sales",
    image: "/new-tombstone-sales.jpg",
    description:
      "Custom granite tombstones and memorials crafted with care, dignity, and lasting quality.",
    type: "page",
    href: "/tombstones",
  },
  {
    title: "Tombstone Maintenance",
    image: "/tombstone-maintenance.jpg",
    description:
      "Cleaning, restoration, lettering touch-ups, and repairs for existing tombstones.",
    type: "inquiry",
  },
  {
    title: "Granite Kitchen Tops",
    image: "/granite-kitchen-tops.jpg",
    description:
      "Premium granite countertops available in a wide range of colours and finishes.",
    type: "inquiry",
  },
  {
    title: "Quartz Kitchen Tops",
    image: "/quartz-kitchen-tops.jpg",
    description:
      "Modern quartz kitchen surfaces available in elegant colours and durable finishes.",
    type: "inquiry",
  },
  {
    title: "Cut to Size Granite",
    image: "/cut-to-size-granite.jpg",
    description:
      "Custom granite cutting and polishing for kitchens, bathrooms, staircases, and projects.",
    type: "inquiry",
  },
  {
    title: "Ledgers",
    image: "/ledgers.jpg",
    description:
      "Premium granite ledgers crafted for durability, elegance, and a lasting memorial tribute.",
    type: "inquiry",
  },
];

const whatsappNumber = "27731633836";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    service: "New Tombstone Sales",
    message: "",
  });

  function updateForm(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function selectService(service: string) {
    setForm({ ...form, service });
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  }

  async function submitQuote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);

    try {
      const response = await fetch("/api/send-quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(
          "Sorry, your quote request could not be sent. Please try again or contact us on WhatsApp."
        );
        return;
      }

      alert("Thank you. Your quote request has been sent successfully.");

      setForm({
        name: "",
        phone: "",
        email: "",
        service: "New Tombstone Sales",
        message: "",
      });
    } catch {
      alert(
        "Sorry, your quote request could not be sent. Please try again or contact us on WhatsApp."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main style={page}>
      <header style={header}>
        <a href="#home" style={brand}>
          <img
            src="/poloko-tombstones-logo.png"
            alt="Poloko Tombstones logo"
            style={headerLogo}
          />
          <div>
            <div style={brandTitle}>POLOKO</div>
            <div style={brandSubTitle}>TOMBSTONES</div>
          </div>
        </a>

        <nav style={desktopNav}>
          <a href="#services" style={navLink}>Services</a>
          <a href="#catalogue" style={navLink}>Catalogue</a>
          <a href="#about" style={navLink}>About</a>
          <a href="#contact" style={navLink}>Contact</a>
        </nav>

        <button style={menuButton} onClick={() => setMenuOpen(true)}>
          <Menu size={24} />
        </button>
      </header>

      {menuOpen && (
        <div style={menuPanel}>
          <button style={closeButton} onClick={() => setMenuOpen(false)}>
            <X size={28} />
          </button>

          {["Home", "Services", "Catalogue", "About", "Contact"].map((item) => (
            <a
              key={item}
              href={`#${item === "Home" ? "home" : item.toLowerCase()}`}
              style={menuLink}
              onClick={() => setMenuOpen(false)}
            >
              {item}
            </a>
          ))}
        </div>
      )}

      <section id="home" style={heroSection}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={heroContent}
        >
          <img
            src="/poloko-tombstones-logo.png"
            alt="Poloko Tombstones logo"
            style={heroLogo}
          />

          <p style={smallLabel}>SOUTH AFRICA</p>
          <h1 style={heroTitle}>Poloko Tombstones</h1>
          <p style={tagline}>A legacy carved in stone.</p>

          <GoldDivider />

          <div style={statsGrid}>
            <div style={statCard}>
              <strong style={statNumber}>100%</strong>
              <span style={statText}>Granite Quality</span>
            </div>

            <div style={statCard}>
              <strong style={statNumber}>Custom</strong>
              <span style={statText}>Memorial Designs</span>
            </div>

            <div style={statCard}>
              <strong style={statNumber}>Premium</strong>
              <span style={statText}>Stone Products</span>
            </div>
          </div>
        </motion.div>
      </section>

      <section id="difference" style={differenceSectionLight}>
        <div style={sectionIntroCenter}>
          <p style={smallLabel}>WHY CHOOSE US</p>
          <h2 style={sectionTitle}>
            The Poloko <span style={goldItalic}>Difference</span>
          </h2>
          <GoldDivider />
        </div>

        <div style={differenceGrid}>
          <div style={differenceCard}>
            <Gem size={26} />
            <h3 style={differenceTitle}>Premium Granite</h3>
            <p style={differenceText}>
              Quality granite for lasting memorials and stone products.
            </p>
          </div>

          <div style={differenceCard}>
            <Sparkles size={26} />
            <h3 style={differenceTitle}>Custom Work</h3>
            <p style={differenceText}>
              Each piece is made according to your design and inscription needs.
            </p>
          </div>

          <div style={differenceCard}>
            <HeartHandshake size={26} />
            <h3 style={differenceTitle}>Family Care</h3>
            <p style={differenceText}>
              Families are guided with respect and care through every step.
            </p>
          </div>

          <div style={differenceCard}>
            <Hammer size={26} />
            <h3 style={differenceTitle}>Professional Craftsmanship</h3>
            <p style={differenceText}>
              Our work is handled with care, precision, and pride.
            </p>
          </div>
        </div>
      </section>

      <section id="services" style={servicesSection}>
        <div style={sectionIntroCenter}>
          <p style={smallLabel}>OUR SERVICES</p>
          <h2 style={sectionTitle}>
            Select a <span style={goldItalic}>Service</span>
          </h2>
          <GoldDivider />
        </div>

        <div style={serviceButtonGrid}>
          {services.map((service, index) => (
            <button
              key={service}
              style={index === 0 ? activeServiceButton : serviceButton}
              onClick={() => selectService(service)}
            >
              {service}
            </button>
          ))}
        </div>
      </section>

      <section id="catalogue" style={creamSection}>
        <div style={sectionIntroCenter}>
          <p style={smallLabel}>DIGITAL CATALOGUE</p>
          <h2 style={sectionTitle}>
            Premium Stone <span style={goldItalic}>Products</span>
          </h2>
          <GoldDivider />
          <p style={sectionDescription}>
            Browse our tombstone, granite, quartz, ledger, and maintenance services.
          </p>
        </div>

        <div style={catalogueGrid}>
          {catalogueItems.map((item) => (
            <article key={item.title} style={catalogueCard}>
              <img src={item.image} alt={item.title} style={catalogueImage} />

              <div style={catalogueCardBody}>
                <h3 style={cardTitle}>{item.title}</h3>
                <p style={cardText}>{item.description}</p>

                {item.type === "page" ? (
                  <a href={item.href} style={catalogueButton}>
                    View Tombstones
                  </a>
                ) : (
                  <button
                    style={catalogueButton}
                    onClick={() => selectService(item.title)}
                  >
                    Send Inquiry
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="about" style={aboutSection}>
        <div style={portraitImageFrame}>
          <img
            src="/hero.jpg"
            alt="Poloko Tombstones granite craftsmanship"
            style={portraitImage}
          />
        </div>

        <div style={aboutTextBox}>
          <p style={smallLabel}>OUR STORY</p>

          <h2 style={sectionTitle}>
            Crafted with <span style={goldItalic}>Purpose</span>
          </h2>

          <GoldDivider align="left" />

          <p style={introStoryText}>
            Poloko Tombstones was built on a simple belief: every life deserves
            to be remembered with dignity, beauty, and permanence, carved in stone.
          </p>

          <p style={bodyText}>
            Poloko Tombstones is a newly established company with branches in
            Ganyesa and Garankuwa, built on more than 20 years of hands-on
            experience in granite, tombstone, and stone craftsmanship.
          </p>

          <p style={bodyText}>
            Beyond memorials, we are proud suppliers of premium commercial granite,
            from kitchen countertops and vanity tops to staircases and window sills,
            bringing the same standard of excellence to every stone we cut and polish.
          </p>

          <div style={storyGrid}>
            <div style={storyCard}>
              <span style={storySymbol}>✦</span>
              <strong style={storyTitle}>In-House Excellence</strong>
              <p style={storyText}>
                Cutting, polishing, and sandblasting handled with care.
              </p>
            </div>

            <div style={storyCard}>
              <span style={storySymbol}>◈</span>
              <strong style={storyTitle}>Master Craftsmanship</strong>
              <p style={storyText}>
                Stone-working expertise built through more than two decades.
              </p>
            </div>

            <div style={storyCard}>
              <span style={storySymbol}>❖</span>
              <strong style={storyTitle}>Family & Trade</strong>
              <p style={storyText}>
                Serving families, funeral parlours, and property clients.
              </p>
            </div>

            <div style={storyCard}>
              <span style={storySymbol}>◆</span>
              <strong style={storyTitle}>Custom Work</strong>
              <p style={storyText}>
                Every piece tailored to your vision and practical needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" style={contactSection}>
        <div style={contactInfo}>
          <p style={smallLabel}>GET IN TOUCH</p>

          <h2 style={sectionTitle}>
            Request a <span style={goldItalic}>Quote</span>
          </h2>

          <GoldDivider align="left" />

          <p style={introStoryText}>
            Let us help you create a memorial or granite product made with care,
            dignity, and precision.
          </p>

          <div style={contactCards}>
            <div style={contactCard}>
              <MapPin size={20} />
              <div>
                <h3 style={contactTitle}>Garankuwa</h3>
                <p style={contactText}>750 Zone 7</p>
                <a href="tel:+27823915772" style={contactLink}>082 391 5772</a>
                <a href="tel:+27731633836" style={contactLink}>073 163 3836</a>
                <a href="+27636644824" style={contactLink}>063 664 4824</a>
              </div>
            </div>

            <div style={contactCard}>
              <MapPin size={20} />
              <div>
                <h3 style={contactTitle}>Ganyesa</h3>
                <p style={contactText}>Phohung Section</p>
                <a href="tel:+27823915772" style={contactLink}>082 391 5772</a>
                <a href="tel:+27839280868" style={contactLink}>083 928 0868</a>
                <a href="tel:+27727363463" style={contactLink}>072 736 3463</a>
              </div>
            </div>

            <div style={contactCard}>
              <Globe size={20} />
              <div>
                <h3 style={contactTitle}>Online</h3>
                <a
                  href="https://www.polokotombstones.co.za"
                  target="_blank"
                  style={contactLink}
                >
                  www.polokotombstones.co.za
                </a>
                <a href="mailto:info@polokotombstones.co.za" style={contactLink}>
                  info@polokotombstones.co.za
                </a>
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  style={contactLink}
                >
                  WhatsApp: 073 163 3836
                </a>
              </div>
            </div>
          </div>
        </div>

        <form style={quoteForm} onSubmit={submitQuote}>
          <p style={formSmallLabel}>REQUEST A QUOTE</p>

          <label style={formLabel}>Full Name</label>
          <input
            name="name"
            value={form.name}
            onChange={updateForm}
            required
            style={input}
          />

          <label style={formLabel}>Phone / WhatsApp</label>
          <input
            name="phone"
            value={form.phone}
            onChange={updateForm}
            required
            style={input}
          />

          <label style={formLabel}>Email Address</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={updateForm}
            style={input}
          />

          <label style={formLabel}>Product of Interest</label>
          <select
            name="service"
            value={form.service}
            onChange={updateForm}
            style={input}
          >
            {services.map((service) => (
              <option key={service}>{service}</option>
            ))}
          </select>

          <label style={formLabel}>Message / Requirements</label>
          <textarea
            name="message"
            value={form.message}
            onChange={updateForm}
            rows={5}
            required
            style={textarea}
          />

          <button type="submit" style={submitButton} disabled={sending}>
            <Send size={17} />
            {sending ? "Sending..." : "Send Quote Request"}
          </button>
        </form>
      </section>

      <footer style={footer}>
        <div>
          <strong>POLOKO TOMBSTONES</strong>
          <p style={footerText}>A legacy carved in stone.</p>
        </div>

        <div style={footerLinks}>
          <a href="tel:+27731633836" style={footerLink}>
            <Phone size={15} /> 073 163 3836
          </a>
          <a href="mailto:info@polokotombstones.co.za" style={footerLink}>
            <Mail size={15} /> info@polokotombstones.co.za
          </a>
        </div>

        <p style={footerText}>© 2026 Poloko Tombstones. All rights reserved.</p>
      </footer>

      <a
        href={`https://wa.me/${whatsappNumber}`}
        target="_blank"
        style={floatingWhatsApp}
        aria-label="Chat with Poloko Tombstones on WhatsApp"
      >
        <MessageCircle size={26} />
      </a>
    </main>
  );
}

function GoldDivider({ align = "center" }: { align?: "center" | "left" }) {
  return (
    <div
      style={{
        ...goldDivider,
        justifyContent: align === "left" ? "flex-start" : "center",
      }}
    >
      <span style={dividerLine}></span>
      <span style={dividerDiamond}>◆</span>
      <span style={dividerLine}></span>
    </div>
  );
}

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "#F4EFE6",
  color: "#17130E",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const header: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 30,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 7%",
  background: "rgba(20,17,13,0.92)",
  backdropFilter: "blur(16px)",
  borderBottom: "1px solid rgba(200,169,106,0.24)",
};

const brand: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  textDecoration: "none",
  color: "#FFF4DC",
};

const headerLogo: React.CSSProperties = {
  width: "34px",
  height: "34px",
  objectFit: "contain",
};

const brandTitle: React.CSSProperties = {
  fontSize: "13px",
  letterSpacing: "4px",
  fontWeight: 700,
};

const brandSubTitle: React.CSSProperties = {
  fontSize: "8px",
  letterSpacing: "4px",
  color: "#C8A96A",
  marginTop: "2px",
};

const desktopNav: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "24px",
};

const navLink: React.CSSProperties = {
  color: "#FFF4DC",
  textDecoration: "none",
  fontSize: "12px",
  fontWeight: 700,
};

const menuButton: React.CSSProperties = {
  background: "rgba(247,238,220,0.12)",
  border: "1px solid rgba(247,238,220,0.35)",
  color: "#F7EEDC",
  width: "42px",
  height: "42px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const menuPanel: React.CSSProperties = {
  position: "fixed",
  top: 0,
  right: 0,
  width: "min(340px, 88vw)",
  height: "100vh",
  background: "#14110D",
  zIndex: 80,
  padding: "80px 30px",
  display: "flex",
  flexDirection: "column",
  gap: "22px",
  boxShadow: "-20px 0 60px rgba(0,0,0,0.35)",
};

const closeButton: React.CSSProperties = {
  position: "absolute",
  top: "24px",
  right: "24px",
  background: "transparent",
  color: "#FFF4DC",
  border: "none",
  cursor: "pointer",
};

const menuLink: React.CSSProperties = {
  color: "#FFF4DC",
  textDecoration: "none",
  fontSize: "24px",
};

const heroSection: React.CSSProperties = {
  minHeight: "78vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "96px 7% 48px",
  background:
    "radial-gradient(circle at top, rgba(200,169,106,0.18), transparent 38%), linear-gradient(135deg, #17130E 0%, #262015 44%, #F4EFE6 44%, #FFF9EF 100%)",
};

const heroContent: React.CSSProperties = {
  width: "min(820px, 100%)",
  textAlign: "center",
  background: "rgba(255,249,239,0.94)",
  border: "1px solid rgba(200,169,106,0.45)",
  borderRadius: "28px",
  padding: "36px 28px",
  boxShadow: "0 25px 65px rgba(35,27,18,0.18)",
};

const heroLogo: React.CSSProperties = {
  width: "min(175px, 58vw)",
  height: "auto",
  objectFit: "contain",
  margin: "0 auto 12px",
  display: "block",
};

const smallLabel: React.CSSProperties = {
  color: "#9B7434",
  letterSpacing: "7px",
  fontSize: "10px",
  fontWeight: 700,
  textTransform: "uppercase",
  margin: "0 0 12px",
};

const heroTitle: React.CSSProperties = {
  fontSize: "clamp(36px, 6vw, 64px)",
  lineHeight: 1,
  margin: 0,
  color: "#17130E",
  fontWeight: 500,
};

const tagline: React.CSSProperties = {
  fontSize: "clamp(18px, 2.4vw, 26px)",
  color: "#7A5A28",
  margin: "14px 0 0",
  fontStyle: "italic",
};

const goldDivider: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  margin: "18px 0 22px",
};

const dividerLine: React.CSSProperties = {
  width: "90px",
  height: "1px",
  background: "#C8A96A",
};

const dividerDiamond: React.CSSProperties = {
  color: "#C08A18",
  fontSize: "12px",
};

const statsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "12px",
  marginTop: "24px",
};

const statCard: React.CSSProperties = {
  background: "#FFF9EF",
  color: "#17130E",
  borderRadius: "18px",
  padding: "18px 14px",
  border: "1px solid rgba(200,169,106,0.55)",
  boxShadow: "0 12px 30px rgba(38,29,20,0.07)",
};

const statNumber: React.CSSProperties = {
  display: "block",
  color: "#9B7434",
  fontSize: "22px",
  marginBottom: "6px",
  fontStyle: "italic",
};

const statText: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  letterSpacing: "4px",
  textTransform: "uppercase",
};

const differenceSectionLight: React.CSSProperties = {
  padding: "42px 7% 58px",
  background: "#FFF9EF",
};

const servicesSection: React.CSSProperties = {
  padding: "58px 7% 42px",
  background: "#FFF9EF",
};

const creamSection: React.CSSProperties = {
  padding: "64px 7%",
  background: "#F4EFE6",
};

const sectionIntroCenter: React.CSSProperties = {
  textAlign: "center",
  maxWidth: "800px",
  margin: "0 auto 30px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "clamp(30px, 4.2vw, 48px)",
  lineHeight: 1.08,
  margin: "8px 0 0",
  fontWeight: 600,
  color: "#050505",
};

const goldItalic: React.CSSProperties = {
  color: "#C08A18",
  fontStyle: "italic",
  fontWeight: 500,
};

const sectionDescription: React.CSSProperties = {
  fontSize: "17px",
  lineHeight: 1.75,
  color: "#7A5A28",
  fontStyle: "italic",
  maxWidth: "720px",
  margin: "0 auto",
};

const differenceGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
};

const differenceCard: React.CSSProperties = {
  border: "1px solid #D8C29B",
  padding: "22px",
  background: "#FFF9EF",
  color: "#C08A18",
  boxShadow: "0 14px 35px rgba(38,29,20,0.07)",
};

const differenceTitle: React.CSSProperties = {
  color: "#17130E",
  fontSize: "21px",
  margin: "14px 0 10px",
};

const differenceText: React.CSSProperties = {
  color: "#6C5A45",
  lineHeight: 1.65,
  fontStyle: "italic",
  margin: 0,
};

const serviceButtonGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "12px 18px",
  maxWidth: "980px",
  margin: "0 auto",
};

const serviceButton: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #D8C29B",
  color: "#5C3C12",
  padding: "13px 18px",
  letterSpacing: "5px",
  textTransform: "uppercase",
  fontSize: "12px",
  cursor: "pointer",
};

const activeServiceButton: React.CSSProperties = {
  ...serviceButton,
  background: "#14110D",
  color: "#C8A96A",
  transform: "skewX(-8deg)",
};

const catalogueGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "16px",
};

const catalogueCard: React.CSSProperties = {
  background: "#FFF9EF",
  border: "1px solid #D8C29B",
  borderRadius: "20px",
  overflow: "hidden",
  boxShadow: "0 14px 35px rgba(38,29,20,0.07)",
};

const catalogueImage: React.CSSProperties = {
  width: "100%",
  height: "210px",
  objectFit: "cover",
  display: "block",
};

const catalogueCardBody: React.CSSProperties = {
  padding: "20px",
};

const cardTitle: React.CSSProperties = {
  fontSize: "22px",
  lineHeight: 1.15,
  margin: "0 0 10px",
  color: "#050505",
};

const cardText: React.CSSProperties = {
  color: "#6C5A45",
  lineHeight: 1.65,
  margin: 0,
  fontStyle: "italic",
};

const catalogueButton: React.CSSProperties = {
  display: "inline-block",
  marginTop: "18px",
  background: "#14110D",
  border: "1px solid #C8A96A",
  color: "#C8A96A",
  padding: "10px 15px",
  letterSpacing: "3px",
  textTransform: "uppercase",
  cursor: "pointer",
  textDecoration: "none",
  fontSize: "12px",
};

const aboutSection: React.CSSProperties = {
  padding: "64px 7%",
  background: "#FFF9EF",
  display: "grid",
  gridTemplateColumns: "minmax(260px, 0.85fr) minmax(320px, 1.15fr)",
  gap: "38px",
  alignItems: "center",
};

const portraitImageFrame: React.CSSProperties = {
  width: "min(350px, 88vw)",
  height: "500px",
  borderRadius: "180px 180px 24px 24px",
  overflow: "hidden",
  border: "1px solid rgba(200,169,106,0.55)",
  boxShadow: "0 25px 60px rgba(35,27,18,0.16)",
  justifySelf: "center",
};

const portraitImage: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const aboutTextBox: React.CSSProperties = {
  maxWidth: "760px",
};

const bodyText: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: 1.75,
  color: "#4D3F33",
  margin: "0 0 14px",
};

const introStoryText: React.CSSProperties = {
  ...bodyText,
  fontSize: "18px",
  color: "#7A5A28",
  fontStyle: "italic",
};

const storyGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "12px",
  marginTop: "22px",
};

const storyCard: React.CSSProperties = {
  border: "1px solid #D8C29B",
  background: "#FFF9EF",
  borderRadius: "16px",
  padding: "15px",
  color: "#5C5145",
  lineHeight: 1.55,
};

const storySymbol: React.CSSProperties = {
  display: "block",
  color: "#C08A18",
  fontSize: "18px",
  marginBottom: "8px",
};

const storyTitle: React.CSSProperties = {
  display: "block",
  letterSpacing: "3px",
  textTransform: "uppercase",
  color: "#17130E",
  fontSize: "11px",
  marginBottom: "6px",
};

const storyText: React.CSSProperties = {
  margin: 0,
};

const contactSection: React.CSSProperties = {
  padding: "64px 7%",
  background: "#FFF9EF",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "34px",
  alignItems: "start",
};

const contactInfo: React.CSSProperties = {
  minWidth: 0,
};

const contactCards: React.CSSProperties = {
  display: "grid",
  gap: "12px",
  marginTop: "22px",
};

const contactCard: React.CSSProperties = {
  background: "#FFF9EF",
  border: "1px solid #D8C29B",
  padding: "18px",
  display: "flex",
  gap: "14px",
  color: "#9B7434",
};

const contactTitle: React.CSSProperties = {
  color: "#17130E",
  margin: "0 0 6px",
  fontSize: "20px",
};

const contactText: React.CSSProperties = {
  color: "#5C5145",
  margin: "0 0 6px",
};

const contactLink: React.CSSProperties = {
  display: "block",
  color: "#5C3C12",
  margin: "6px 0",
  fontWeight: 700,
  textDecoration: "none",
};

const quoteForm: React.CSSProperties = {
  background: "#FFF9EF",
  color: "#17130E",
  padding: "26px",
  border: "1px solid #D8C29B",
  boxShadow: "0 20px 50px rgba(35,27,18,0.09)",
};

const formSmallLabel: React.CSSProperties = {
  ...smallLabel,
  marginBottom: "22px",
};

const formLabel: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 700,
  marginBottom: "7px",
  marginTop: "14px",
  color: "#9B7434",
  letterSpacing: "4px",
  textTransform: "uppercase",
};

const input: React.CSSProperties = {
  width: "100%",
  border: "1px solid #D8C29B",
  background: "#FFFFFF",
  color: "#17130E",
  padding: "12px 14px",
  outline: "none",
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: "15px",
};

const textarea: React.CSSProperties = {
  ...input,
  resize: "vertical",
};

const submitButton: React.CSSProperties = {
  width: "100%",
  marginTop: "20px",
  border: "none",
  padding: "14px 20px",
  background: "#14110D",
  color: "#C8A96A",
  letterSpacing: "4px",
  textTransform: "uppercase",
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
};

const footer: React.CSSProperties = {
  background: "#0E0C09",
  color: "#FFF4DC",
  padding: "26px 7%",
  display: "flex",
  justifyContent: "space-between",
  gap: "18px",
  flexWrap: "wrap",
};

const footerText: React.CSSProperties = {
  color: "#C7B99A",
  margin: "5px 0",
};

const footerLinks: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const footerLink: React.CSSProperties = {
  color: "#C8A96A",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
};

const floatingWhatsApp: React.CSSProperties = {
  position: "fixed",
  right: "22px",
  bottom: "22px",
  zIndex: 60,
  background: "#25D366",
  color: "#082010",
  width: "58px",
  height: "58px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 15px 35px rgba(0,0,0,0.28)",
};