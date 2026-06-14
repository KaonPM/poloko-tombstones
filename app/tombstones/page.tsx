"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

type Product = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  price: string | null;
  image_url: string | null;
  is_featured: boolean | null;
  product_code: string | null;
  display_order: number | null;
  created_at: string | null;
};

type SortOption = "featured" | "price-high" | "price-low" | "newest";

export default function TombstonesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const catalogueRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      if (sortBy === "price-high") {
        return getPriceValue(b.price) - getPriceValue(a.price);
      }

      if (sortBy === "price-low") {
        return getPriceValue(a.price) - getPriceValue(b.price);
      }

      if (sortBy === "newest") {
        return (
          new Date(b.created_at || "").getTime() -
          new Date(a.created_at || "").getTime()
        );
      }

      const featuredA = a.is_featured ? 1 : 0;
      const featuredB = b.is_featured ? 1 : 0;

      if (featuredA !== featuredB) return featuredB - featuredA;

      const orderA = a.display_order ?? 9999;
      const orderB = b.display_order ?? 9999;

      if (orderA !== orderB) return orderA - orderB;

      return (
        new Date(b.created_at || "").getTime() -
        new Date(a.created_at || "").getTime()
      );
    });
  }, [products, sortBy]);

  const catalogueProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const featuredA = a.is_featured ? 1 : 0;
      const featuredB = b.is_featured ? 1 : 0;

      if (featuredA !== featuredB) return featuredB - featuredA;

      const orderA = a.display_order ?? 9999;
      const orderB = b.display_order ?? 9999;

      if (orderA !== orderB) return orderA - orderB;

      return (
        new Date(b.created_at || "").getTime() -
        new Date(a.created_at || "").getTime()
      );
    });
  }, [products]);

  const productPages = chunkProducts(catalogueProducts, 6);

  function openProduct(product: Product) {
    setSelectedProduct(product);
    setZoom(1);
  }

  function closeProduct() {
    setSelectedProduct(null);
    setZoom(1);
  }

  async function fetchProducts() {
    const { data, error } = await supabase
      .from("tombstone_products")
      .select(
        "id,title,category,description,price,image_url,is_featured,product_code,display_order,created_at"
      )
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (!error) setProducts(data || []);
    setLoading(false);
  }

  async function downloadCatalogue() {
    if (!catalogueRef.current || catalogueProducts.length === 0) return;

    setDownloading(true);

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pages = Array.from(
        catalogueRef.current.querySelectorAll("[data-pdf-page='true']")
      ) as HTMLElement[];

      for (let index = 0; index < pages.length; index++) {
        const canvas = await html2canvas(pages[index], {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#F4EFE6",
        });

        const imageData = canvas.toDataURL("image/jpeg", 0.95);

        if (index > 0) pdf.addPage();

        pdf.addImage(imageData, "JPEG", 0, 0, 210, 297);
      }

      pdf.save("Poloko-Tombstones-Catalogue.pdf");
    } catch (error) {
      console.error("Catalogue download failed:", error);
      alert("Catalogue could not be downloaded. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main style={page}>
      <section style={hero}>
        <p style={smallLabel}>POLOKO TOMBSTONES</p>
        <h1 style={title}>
          Tombstone <span style={goldItalic}>Catalogue</span>
        </h1>
        <p style={subtitle}>
          Browse our tombstone range and request a personalised quote.
        </p>

        <div style={toolbar}>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortOption)}
            style={select}
          >
            <option value="featured">Featured</option>
            <option value="price-high">Price: High to Low</option>
            <option value="price-low">Price: Low to High</option>
            <option value="newest">Newest First</option>
          </select>

          <button
            type="button"
            onClick={downloadCatalogue}
            disabled={downloading || loading || catalogueProducts.length === 0}
            style={{
              ...downloadButton,
              opacity:
                downloading || loading || catalogueProducts.length === 0 ? 0.6 : 1,
              cursor:
                downloading || loading || catalogueProducts.length === 0
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {downloading ? "Preparing Catalogue..." : "Download Catalogue"}
          </button>
        </div>
      </section>

      {loading ? (
        <p style={loadingText}>Loading catalogue...</p>
      ) : sortedProducts.length === 0 ? (
        <p style={loadingText}>No products have been added yet.</p>
      ) : (
        <section style={grid}>
          {sortedProducts.map((product) => (
            <article key={product.id} style={card}>
              {product.image_url ? (
                <button
                  type="button"
                  onClick={() => openProduct(product)}
                  style={imageButton}
                >
                  <img src={product.image_url} alt={product.title} style={image} />
                </button>
              ) : (
                <div style={imagePlaceholder}>No Image</div>
              )}

              <div style={content}>
                <p style={category}>
                  {product.is_featured ? "Featured · " : ""}
                  {product.category}
                </p>
                <h2 style={cardTitle}>{product.title}</h2>
                <p style={price}>{product.price || "Quote Required"}</p>
                <p style={description}>{product.description}</p>

                <Link
                  href={`/#contact?product=${encodeURIComponent(product.title)}`}
                  style={button}
                >
                  Request Quote
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}

      {selectedProduct ? (
        <div style={modalOverlay} onClick={closeProduct}>
          <div style={modalCard} onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={closeProduct} style={closeButton}>
              ×
            </button>

            {selectedProduct.image_url ? (
              <>
                <div style={zoomControls}>
                  <button
                    type="button"
                    onClick={() => setZoom((value) => Math.min(value + 0.2, 2))}
                    style={zoomButton}
                  >
                    Zoom In
                  </button>

                  <button
                    type="button"
                    onClick={() => setZoom((value) => Math.max(value - 0.2, 1))}
                    style={zoomButton}
                  >
                    Zoom Out
                  </button>

                  <button type="button" onClick={() => setZoom(1)} style={zoomButton}>
                    Reset
                  </button>
                </div>

                <div style={modalImageWrap}>
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.title}
                    style={{
                      ...modalImage,
                      transform: `scale(${zoom})`,
                    }}
                  />
                </div>
              </>
            ) : null}

            <div style={modalContent}>
              <p style={category}>{selectedProduct.category}</p>
              <h2 style={modalTitle}>{selectedProduct.title}</h2>
              <p style={price}>{selectedProduct.price || "Quote Required"}</p>
              <p style={description}>{selectedProduct.description}</p>

              <Link
                href={`/#contact?product=${encodeURIComponent(selectedProduct.title)}`}
                style={button}
              >
                Request Quote
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div ref={catalogueRef} style={pdfWrapper}>
        <PdfCoverPage />
        <PdfServicesPage />

        {productPages.map((pageProducts, index) => (
          <PdfProductPage
            key={index}
            pageNumber={index + 1}
            totalPages={productPages.length}
            products={pageProducts}
          />
        ))}

        <PdfContactPage />
      </div>

      <div style={backWrapper}>
        <Link href="/" style={backButton}>
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}

function PdfCoverPage() {
  return (
    <div data-pdf-page="true" style={pdfPageLight}>
      <div style={pdfCoverFrame}>
        <div style={pdfLogoBox}>
          <img
            src="/poloko-tombstones-logo.png"
            alt="Poloko Tombstones"
            style={pdfLogo}
          />
        </div>

        <div style={pdfCoverCenter}>
          <p style={pdfCoverSmall}>Premium Granite Memorials</p>
          <h1 style={pdfCoverTitleLight}>Tombstone Catalogue</h1>
          <p style={pdfCoverSubtitleLight}>A Legacy Carved in Stone</p>

          <div style={pdfPrintPromiseGrid}>
            <div style={pdfPrintPromiseBox}>
              Expert Installation Anywhere in South Africa
            </div>
            <div style={pdfPrintPromiseBox}>Premium Granite Tombstones</div>
            <div style={pdfPrintPromiseBox}>Custom Memorial Designs</div>
            <div style={pdfPrintPromiseBox}>Professional Engraving</div>
          </div>
        </div>
      </div>

      <div style={pdfFooterLight}>
        <span>www.polokotombstones.co.za</span>
        <span>WhatsApp: 073 163 3836</span>
      </div>
    </div>
  );
}

function PdfServicesPage() {
  return (
    <div data-pdf-page="true" style={pdfPageLight}>
      <p style={pdfSmallGold}>POLOKO TOMBSTONES</p>
      <h2 style={pdfSectionTitle}>What We Offer</h2>

      <div style={pdfServicesGrid}>
        {[
          "New Tombstones",
          "Tombstone Repairs",
          "Custom Designs",
          "Engraving",
          "Granite Kitchen Tops",
          "Quartz Kitchen Tops",
          "Cut-to-Size Granite",
          "Ledgers",
        ].map((service) => (
          <div key={service} style={pdfServiceItemLight}>
            {service}
          </div>
        ))}
      </div>

      <div style={pdfGoldBanner}>EXPERT INSTALLATION ANYWHERE IN SOUTH AFRICA</div>

      <div style={pdfFooterLight}>
        <span>20+ Years Granite Experience</span>
        <span>www.polokotombstones.co.za</span>
      </div>
    </div>
  );
}

function PdfProductPage({
  products,
  pageNumber,
  totalPages,
}: {
  products: Product[];
  pageNumber: number;
  totalPages: number;
}) {
  const isLastProductPage = pageNumber === totalPages;

  return (
    <div data-pdf-page="true" style={pdfPageLight}>
      <div style={pdfProductHeader}>
        <div>
          <p style={pdfSmallGold}>POLOKO COLLECTION</p>
          <h2 style={pdfProductPageTitle}>
            {pageNumber === 1 ? "Featured Tombstones" : "Tombstone Designs"}
          </h2>
        </div>

        <div style={pdfInstallBadge}>
          EXPERT INSTALLATION ANYWHERE IN SOUTH AFRICA
        </div>
      </div>

      <div style={pdfProductGrid}>
        {products.map((product) => (
          <div key={product.id} style={pdfProductCard}>
            <div style={pdfProductImageBox}>
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  crossOrigin="anonymous"
                  style={pdfProductImage}
                />
              ) : (
                <div style={pdfNoImage}>No Image</div>
              )}
            </div>

            <div style={pdfProductContent}>
              <p style={pdfProductCategory}>
                {product.is_featured ? "Featured · " : ""}
                {product.category}
              </p>
              <h3 style={pdfProductTitle}>{product.title}</h3>
              <p style={pdfProductCode}>
                Code: {product.product_code || "Available on request"}
              </p>
              <p style={pdfProductPrice}>{product.price || "Quote Required"}</p>
            </div>
          </div>
        ))}
      </div>

      {isLastProductPage && products.length < 6 ? (
        <div style={pdfWhyChooseSection}>
          <h3 style={pdfWhyChooseTitle}>Why Families Choose Poloko Tombstones</h3>

          <div style={pdfWhyChooseGrid}>
            <div style={pdfWhyChooseCard}>✓ 20+ Years Granite Experience</div>
            <div style={pdfWhyChooseCard}>✓ Premium Granite Materials</div>
            <div style={pdfWhyChooseCard}>✓ Custom Memorial Designs</div>
            <div style={pdfWhyChooseCard}>✓ Professional Engraving</div>
            <div style={pdfWhyChooseCard}>✓ Repairs & Restoration</div>
            <div style={pdfWhyChooseCard}>✓ Nationwide Installation</div>
          </div>

          <div style={pdfStoryBox}>
            <h4 style={pdfStoryHeading}>A Legacy Carved In Stone</h4>
            <p style={pdfStoryText}>
              Poloko Tombstones combines granite craftsmanship with modern
              memorial design. Every monument is created with dignity, precision
              and lasting quality.
            </p>
          </div>
        </div>
      ) : null}

      <div style={pdfPageFooter}>
        <span>Poloko Tombstones</span>
        <span>Page {pageNumber}</span>
      </div>
    </div>
  );
}

function PdfContactPage() {
  return (
    <div data-pdf-page="true" style={pdfPageLight}>
      <p style={pdfSmallGold}>CONTACT US</p>
      <h2 style={pdfSectionTitle}>Let's Create a Lasting Memorial</h2>

      <div style={pdfContactGrid}>
        <div style={pdfContactBoxLight}>
          <h3>Garankuwa Branch</h3>
          <p>750 Zone 7</p>
          <p>082 391 5772</p>
          <p>073 163 3836</p>
          <p>063 664 4824</p>
        </div>

        <div style={pdfContactBoxLight}>
          <h3>Ganyesa Branch</h3>
          <p>Phohung Section</p>
          <p>082 391 5772</p>
          <p>083 928 0868</p>
          <p>072 736 3463</p>
        </div>
      </div>

      <div style={pdfQrSection}>
        <img
          src="/website-qr.png"
          alt="Poloko Tombstones Website QR"
          style={pdfQrImage}
        />

        <p style={pdfQrText}>
          Scan to browse our complete online catalogue, view additional designs
          and request a quote.
        </p>
      </div>

      <div style={pdfGoldBanner}>EXPERT INSTALLATION ANYWHERE IN SOUTH AFRICA</div>

      <div style={pdfFooterLight}>
        <span>www.polokotombstones.co.za</span>
        <span>info@polokotombstones.co.za</span>
      </div>
    </div>
  );
}

function chunkProducts(products: Product[], size: number) {
  const chunks: Product[][] = [];

  for (let i = 0; i < products.length; i += size) {
    chunks.push(products.slice(i, i + size));
  }

  return chunks;
}

function getPriceValue(price: string | null) {
  if (!price) return 0;

  const cleaned = price.replace(/[^\d.]/g, "");
  const value = Number(cleaned);

  return Number.isNaN(value) ? 0 : value;
}

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "#F4EFE6",
  color: "#17130E",
  padding: "86px 7% 60px",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const hero: React.CSSProperties = {
  textAlign: "center",
  maxWidth: "820px",
  margin: "0 auto 42px",
};

const smallLabel: React.CSSProperties = {
  color: "#9B7434",
  letterSpacing: "7px",
  fontSize: "10px",
  fontWeight: 700,
  textTransform: "uppercase",
  marginBottom: "12px",
};

const title: React.CSSProperties = {
  fontSize: "clamp(34px, 5vw, 58px)",
  lineHeight: 1,
  margin: 0,
};

const goldItalic: React.CSSProperties = {
  color: "#C08A18",
  fontStyle: "italic",
  fontWeight: 500,
};

const subtitle: React.CSSProperties = {
  color: "#7A5A28",
  fontSize: "18px",
  fontStyle: "italic",
  lineHeight: 1.7,
};

const toolbar: React.CSSProperties = {
  marginTop: "22px",
  display: "flex",
  justifyContent: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const select: React.CSSProperties = {
  background: "#FFF9EF",
  color: "#17130E",
  border: "1px solid #C8A96A",
  padding: "13px 16px",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "2px",
  textTransform: "uppercase",
  outline: "none",
};

const downloadButton: React.CSSProperties = {
  background: "#14110D",
  color: "#C8A96A",
  border: "1px solid #C8A96A",
  padding: "13px 20px",
  letterSpacing: "3px",
  textTransform: "uppercase",
  fontSize: "12px",
  fontWeight: 700,
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "22px",
  maxWidth: "1180px",
  margin: "0 auto",
};

const card: React.CSSProperties = {
  background: "#FFF9EF",
  border: "1px solid #D8C29B",
  boxShadow: "0 14px 35px rgba(38,29,20,0.07)",
  overflow: "hidden",
};

const imageButton: React.CSSProperties = {
  width: "100%",
  height: "260px",
  padding: 0,
  border: "none",
  background: "#E8DDC9",
  cursor: "zoom-in",
  overflow: "hidden",
  display: "block",
};

const image: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  display: "block",
};

const imagePlaceholder: React.CSSProperties = {
  height: "260px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#E8DDC9",
  color: "#7A5A28",
};

const content: React.CSSProperties = {
  padding: "20px",
};

const category: React.CSSProperties = {
  color: "#9B7434",
  letterSpacing: "4px",
  fontSize: "10px",
  textTransform: "uppercase",
  marginBottom: "8px",
};

const cardTitle: React.CSSProperties = {
  fontSize: "22px",
  margin: "0 0 8px",
  lineHeight: 1.25,
};

const price: React.CSSProperties = {
  color: "#C08A18",
  fontWeight: 700,
  marginBottom: "10px",
};

const description: React.CSSProperties = {
  color: "#5C5145",
  lineHeight: 1.65,
  fontStyle: "italic",
  marginBottom: "18px",
};

const button: React.CSSProperties = {
  display: "inline-block",
  background: "#14110D",
  color: "#C8A96A",
  textDecoration: "none",
  padding: "11px 16px",
  letterSpacing: "3px",
  textTransform: "uppercase",
  fontSize: "12px",
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(20,17,13,0.78)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  zIndex: 1000,
};

const modalCard: React.CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: "860px",
  maxHeight: "90vh",
  overflowY: "auto",
  background: "#FFF9EF",
  border: "1px solid #D8C29B",
};

const closeButton: React.CSSProperties = {
  position: "absolute",
  top: "12px",
  right: "12px",
  width: "36px",
  height: "36px",
  border: "none",
  background: "#14110D",
  color: "#C8A96A",
  cursor: "pointer",
  fontSize: "24px",
  zIndex: 3,
};

const zoomControls: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 2,
  display: "flex",
  gap: "8px",
  justifyContent: "center",
  flexWrap: "wrap",
  padding: "12px",
  background: "#17130E",
};

const zoomButton: React.CSSProperties = {
  background: "#C8A96A",
  color: "#14110D",
  border: "none",
  padding: "9px 12px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "12px",
};

const modalImageWrap: React.CSSProperties = {
  width: "100%",
  height: "520px",
  overflow: "auto",
  background: "#17130E",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalImage: React.CSSProperties = {
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
  display: "block",
  transition: "transform 0.25s ease",
  transformOrigin: "center center",
};

const modalContent: React.CSSProperties = {
  padding: "24px",
};

const modalTitle: React.CSSProperties = {
  fontSize: "30px",
  margin: "0 0 8px",
};

const loadingText: React.CSSProperties = {
  textAlign: "center",
  color: "#7A5A28",
  fontSize: "18px",
};

const backWrapper: React.CSSProperties = {
  textAlign: "center",
  marginTop: "42px",
};

const backButton: React.CSSProperties = {
  color: "#14110D",
  textDecoration: "none",
  fontWeight: 700,
};

const pdfWrapper: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: "-10000px",
  width: "794px",
  background: "#F4EFE6",
  zIndex: -1,
};

const pdfPageLight: React.CSSProperties = {
  width: "794px",
  height: "1123px",
  background: "#F4EFE6",
  color: "#17130E",
  padding: "58px",
  boxSizing: "border-box",
  fontFamily: "Georgia, 'Times New Roman', serif",
  position: "relative",
};

const pdfCoverFrame: React.CSSProperties = {
  border: "2px solid #D8C29B",
  background: "#FFF9EF",
  minHeight: "880px",
  padding: "42px",
  boxSizing: "border-box",
};

const pdfLogoBox: React.CSSProperties = {
  textAlign: "center",
  marginTop: "30px",
  width: "100%",
};

const pdfLogo: React.CSSProperties = {
  width: "330px",
  height: "auto",
  objectFit: "contain",
  display: "block",
  margin: "0 auto",
};

const pdfCoverCenter: React.CSSProperties = {
  marginTop: "80px",
  textAlign: "center",
};

const pdfCoverSmall: React.CSSProperties = {
  color: "#9B7434",
  letterSpacing: "4px",
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase",
  marginBottom: "16px",
};

const pdfCoverTitleLight: React.CSSProperties = {
  fontSize: "62px",
  lineHeight: 1.05,
  margin: 0,
  color: "#17130E",
};

const pdfCoverSubtitleLight: React.CSSProperties = {
  fontSize: "26px",
  color: "#C08A18",
  marginTop: "18px",
};

const pdfPrintPromiseGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
  marginTop: "55px",
};

const pdfPrintPromiseBox: React.CSSProperties = {
  border: "1px solid #D8C29B",
  background: "#F4EFE6",
  color: "#17130E",
  padding: "20px",
  fontSize: "16px",
  fontWeight: 700,
  textAlign: "center",
  lineHeight: 1.4,
};

const pdfFooterLight: React.CSSProperties = {
  position: "absolute",
  bottom: "42px",
  left: "58px",
  right: "58px",
  display: "flex",
  justifyContent: "space-between",
  color: "#9B7434",
  fontSize: "14px",
};

const pdfSmallGold: React.CSSProperties = {
  color: "#C08A18",
  letterSpacing: "5px",
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase",
};

const pdfSectionTitle: React.CSSProperties = {
  fontSize: "48px",
  margin: "0 0 38px",
  color: "#17130E",
};

const pdfServicesGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "18px",
  marginTop: "36px",
};

const pdfServiceItemLight: React.CSSProperties = {
  border: "1px solid #D8C29B",
  background: "#FFF9EF",
  color: "#17130E",
  padding: "28px",
  fontSize: "22px",
  textAlign: "center",
};

const pdfGoldBanner: React.CSSProperties = {
  marginTop: "70px",
  background: "#C8A96A",
  color: "#14110D",
  padding: "20px",
  textAlign: "center",
  fontWeight: 700,
  letterSpacing: "3px",
  fontSize: "15px",
};

const pdfProductHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  alignItems: "flex-start",
};

const pdfProductPageTitle: React.CSSProperties = {
  fontSize: "40px",
  margin: 0,
};

const pdfInstallBadge: React.CSSProperties = {
  background: "#14110D",
  color: "#C8A96A",
  padding: "12px",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "2px",
  textAlign: "center",
  width: "230px",
};

const pdfProductGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "14px",
  marginTop: "24px",
};

const pdfProductCard: React.CSSProperties = {
  background: "#FFF9EF",
  border: "1px solid #D8C29B",
  overflow: "hidden",
  minHeight: "315px",
};

const pdfProductImageBox: React.CSSProperties = {
  height: "190px",
  background: "#F4EFE6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px",
  boxSizing: "border-box",
};

const pdfProductImage: React.CSSProperties = {
  maxWidth: "100%",
  maxHeight: "100%",
  width: "auto",
  height: "auto",
  objectFit: "contain",
  objectPosition: "center",
  display: "block",
};

const pdfNoImage: React.CSSProperties = {
  color: "#7A5A28",
  fontSize: "16px",
};

const pdfProductContent: React.CSSProperties = {
  padding: "12px 14px 14px",
};

const pdfProductCategory: React.CSSProperties = {
  color: "#9B7434",
  letterSpacing: "2px",
  fontSize: "8px",
  textTransform: "uppercase",
  margin: "0 0 5px",
};

const pdfProductTitle: React.CSSProperties = {
  fontSize: "16px",
  margin: "0 0 5px",
};

const pdfProductCode: React.CSSProperties = {
  fontSize: "10px",
  color: "#7A5A28",
  margin: "0 0 5px",
};

const pdfProductPrice: React.CSSProperties = {
  fontSize: "15px",
  color: "#C08A18",
  fontWeight: 700,
  margin: 0,
};

const pdfWhyChooseSection: React.CSSProperties = {
  marginTop: "34px",
};

const pdfWhyChooseTitle: React.CSSProperties = {
  fontSize: "26px",
  margin: "0 0 18px",
  color: "#17130E",
};

const pdfWhyChooseGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const pdfWhyChooseCard: React.CSSProperties = {
  border: "1px solid #D8C29B",
  background: "#FFF9EF",
  padding: "12px",
  fontSize: "14px",
  fontWeight: 600,
};

const pdfStoryBox: React.CSSProperties = {
  marginTop: "20px",
  background: "#FFF9EF",
  border: "1px solid #D8C29B",
  padding: "18px",
};

const pdfStoryHeading: React.CSSProperties = {
  margin: "0 0 8px",
  color: "#C08A18",
  fontSize: "20px",
};

const pdfStoryText: React.CSSProperties = {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.7,
  color: "#5C5145",
};

const pdfPageFooter: React.CSSProperties = {
  position: "absolute",
  bottom: "30px",
  left: "58px",
  right: "58px",
  display: "flex",
  justifyContent: "space-between",
  color: "#9B7434",
  fontSize: "13px",
};

const pdfContactGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "18px",
  marginTop: "60px",
};

const pdfContactBoxLight: React.CSSProperties = {
  border: "1px solid #D8C29B",
  background: "#FFF9EF",
  padding: "24px",
  color: "#17130E",
  fontSize: "20px",
};

const pdfQrSection: React.CSSProperties = {
  marginTop: "44px",
  textAlign: "center",
};

const pdfQrImage: React.CSSProperties = {
  width: "145px",
  height: "145px",
  objectFit: "contain",
  margin: "0 auto 14px",
  display: "block",
};

const pdfQrText: React.CSSProperties = {
  fontSize: "17px",
  color: "#7A5A28",
  lineHeight: 1.6,
  maxWidth: "430px",
  margin: "0 auto",
};