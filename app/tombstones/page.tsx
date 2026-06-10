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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

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
                <img src={product.image_url} alt={product.title} style={image} />
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
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "18px",
  maxWidth: "1180px",
  margin: "0 auto",
};

const card: React.CSSProperties = {
  background: "#FFF9EF",
  border: "1px solid #D8C29B",
  boxShadow: "0 14px 35px rgba(38,29,20,0.07)",
  overflow: "hidden",
};

const image: React.CSSProperties = {
  width: "100%",
  height: "230px",
  objectFit: "cover",
  display: "block",
};

const imagePlaceholder: React.CSSProperties = {
  height: "230px",
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
  fontSize: "24px",
  margin: "0 0 8px",
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