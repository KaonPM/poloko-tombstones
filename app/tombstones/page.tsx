"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  price: string | null;
  image_url: string | null;
};

export default function TombstonesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    fetchProducts();
  }, []);

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
      .select("id,title,category,description,price,image_url")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error) setProducts(data || []);
    setLoading(false);
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
      </section>

      {loading ? (
        <p style={loadingText}>Loading catalogue...</p>
      ) : products.length === 0 ? (
        <p style={loadingText}>No products have been added yet.</p>
      ) : (
        <section style={grid}>
          {products.map((product) => (
            <article key={product.id} style={card}>
              {product.image_url ? (
                <button
                  type="button"
                  onClick={() => openProduct(product)}
                  style={imageButton}
                  onMouseEnter={(e) => {
                    const img = e.currentTarget.querySelector("img");
                    if (img) img.style.transform = "scale(1.08)";
                  }}
                  onMouseLeave={(e) => {
                    const img = e.currentTarget.querySelector("img");
                    if (img) img.style.transform = "scale(1)";
                  }}
                >
                  <img
                    src={product.image_url}
                    alt={product.title}
                    style={image}
                  />
                </button>
              ) : (
                <div style={imagePlaceholder}>No Image</div>
              )}

              <div style={content}>
                <p style={category}>{product.category}</p>
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
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
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

                  <button
                    type="button"
                    onClick={() => setZoom(1)}
                    style={zoomButton}
                  >
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
                href={`/#contact?product=${encodeURIComponent(
                  selectedProduct.title
                )}`}
                style={button}
              >
                Request Quote
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div style={backWrapper}>
        <Link href="/" style={backButton}>
          ← Back to Home
        </Link>
      </div>
    </main>
  );
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
  transition: "transform 0.35s ease",
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