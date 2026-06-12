"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  price: string | null;
  image_url: string | null;
  is_featured: boolean;
  is_active: boolean;
};

const categories = [
  "Single Headstone",
  "Double Headstone",
  "Full Tombstone Set",
  "Children's Memorial",
  "Custom Design",
  "Ledger",
];

const emptyForm = {
  title: "",
  category: "Single Headstone",
  description: "",
  price: "",
  is_featured: false,
  is_active: true,
};

export default function AdminProductsPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);

  const [checking, setChecking] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [zoom, setZoom] = useState(1);

  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/admin/login");
      return;
    }

    setChecking(false);
    fetchProducts();
  }

  async function fetchProducts() {
    const { data, error } = await supabase
      .from("tombstone_products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setProducts(data || []);
  }

  async function uploadImage() {
    if (!imageFile) return "";

    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("tombstone-products")
      .upload(fileName, imageFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    if (!uploadData?.path) {
      throw new Error("Image uploaded but no file path was returned.");
    }

    const { data } = supabase.storage
      .from("tombstone-products")
      .getPublicUrl(uploadData.path);

    return data.publicUrl;
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const uploadedImageUrl = await uploadImage();

      if (editingProduct) {
        const { error } = await supabase
          .from("tombstone_products")
          .update({
            title: form.title,
            category: form.category,
            description: form.description,
            price: form.price,
            image_url: uploadedImageUrl || editingProduct.image_url,
            is_featured: form.is_featured,
            is_active: form.is_active,
          })
          .eq("id", editingProduct.id);

        if (error) {
          alert(error.message);
          return;
        }

        alert("Product updated successfully.");
      } else {
        const { error } = await supabase.from("tombstone_products").insert({
          title: form.title,
          category: form.category,
          description: form.description,
          price: form.price,
          image_url: uploadedImageUrl,
          is_featured: form.is_featured,
          is_active: form.is_active,
        });

        if (error) {
          alert(error.message);
          return;
        }

        alert("Product added successfully.");
      }

      resetForm();
      fetchProducts();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(product: Product) {
    setEditingProduct(product);
    setViewingProduct(null);
    setZoom(1);

    setForm({
      title: product.title,
      category: product.category,
      description: product.description || "",
      price: product.price || "",
      is_featured: product.is_featured,
      is_active: product.is_active,
    });

    setImageFile(null);

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function resetForm() {
    setEditingProduct(null);
    setForm(emptyForm);
    setImageFile(null);
  }

  function openView(product: Product) {
    setViewingProduct(product);
    setZoom(1);
  }

  function closeView() {
    setViewingProduct(null);
    setZoom(1);
  }

  async function deleteProduct(id: string) {
    const confirmed = confirm(
      "Permanently delete this product? This action cannot be undone."
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("tombstone_products")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    if (viewingProduct?.id === id) closeView();
    if (editingProduct?.id === id) resetForm();

    fetchProducts();
    alert("Product permanently deleted.");
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  if (checking) {
    return (
      <main style={page}>
        <p style={text}>Checking admin access...</p>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={header}>
        <div>
          <h1 style={title}>Tombstone Product Admin</h1>
          <p style={text}>Manage product catalogue, pricing and images.</p>
        </div>

        <div style={headerActions}>
          <button onClick={() => router.push("/admin")} style={secondaryButton}>
            Dashboard
          </button>

          <button onClick={logout} style={deleteButton}>
            Logout
          </button>
        </div>
      </div>

      <form ref={formRef} onSubmit={saveProduct} style={formBox}>
        <h2 style={sectionTitle}>
          {editingProduct ? "Edit Product" : "Add Product"}
        </h2>

        <input
          placeholder="Product title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          style={input}
        />

        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          style={input}
        >
          {categories.map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </select>

        <input
          placeholder="Price, e.g. From R6,500"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          style={input}
        />

        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
          style={textarea}
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          style={input}
        />

        {imageFile ? <p style={helpText}>Selected image: {imageFile.name}</p> : null}

        {editingProduct?.image_url ? (
          <p style={helpText}>
            Current image will remain unless you upload a new one.
          </p>
        ) : null}

        <label style={checkLabel}>
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(e) =>
              setForm({ ...form, is_featured: e.target.checked })
            }
          />
          <strong>Featured product</strong>
          <span style={helpText}>
            Use this to highlight a product later on the homepage.
          </span>
        </label>

        <label style={checkLabel}>
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) =>
              setForm({ ...form, is_active: e.target.checked })
            }
          />
          <strong>Active</strong>
          <span style={helpText}>
            Active products show on the public catalogue. Inactive products stay
            hidden.
          </span>
        </label>

        <div style={formActions}>
          <button type="submit" disabled={saving} style={button}>
            {saving
              ? "Saving..."
              : editingProduct
              ? "Update Product"
              : "Add Product"}
          </button>

          {editingProduct ? (
            <button type="button" onClick={resetForm} style={secondaryButton}>
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>

      <section style={grid}>
        {products.map((product) => (
          <div key={product.id} style={card}>
            {product.image_url ? (
              <button
                type="button"
                onClick={() => openView(product)}
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
                <img src={product.image_url} alt={product.title} style={image} />
              </button>
            ) : (
              <div style={imagePlaceholder}>No Image</div>
            )}

            <div style={cardBody}>
              <div style={badgeRow}>
                {product.is_featured ? (
                  <span style={featuredBadge}>Featured</span>
                ) : null}

                <span style={product.is_active ? activeBadge : inactiveBadge}>
                  {product.is_active ? "Active" : "Hidden"}
                </span>
              </div>

              <h3>{product.title}</h3>
              <p>{product.category}</p>
              <strong>{product.price || "Quote Required"}</strong>
              <p>{product.description}</p>

              <div style={actionRow}>
                <button onClick={() => openView(product)} style={secondaryButton}>
                  View
                </button>

                <button onClick={() => startEdit(product)} style={button}>
                  Edit
                </button>

                <button
                  onClick={() => deleteProduct(product.id)}
                  style={deleteButton}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      {viewingProduct ? (
        <div style={modalOverlay} onClick={closeView}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={closeView} style={modalClose}>
              ×
            </button>

            {viewingProduct.image_url ? (
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
                    src={viewingProduct.image_url}
                    alt={viewingProduct.title}
                    style={{ ...modalImage, transform: `scale(${zoom})` }}
                  />
                </div>
              </>
            ) : (
              <div style={modalNoImage}>No Image</div>
            )}

            <div style={modalContent}>
              <p style={text}>{viewingProduct.category}</p>
              <h2 style={modalTitle}>{viewingProduct.title}</h2>
              <p>
                <strong>{viewingProduct.price || "Quote Required"}</strong>
              </p>
              <p style={text}>{viewingProduct.description}</p>

              <div style={badgeRow}>
                {viewingProduct.is_featured ? (
                  <span style={featuredBadge}>Featured</span>
                ) : null}

                <span style={viewingProduct.is_active ? activeBadge : inactiveBadge}>
                  {viewingProduct.is_active ? "Active" : "Hidden"}
                </span>
              </div>

              <div style={actionRow}>
                <button onClick={() => startEdit(viewingProduct)} style={button}>
                  Edit Product
                </button>

                <button
                  onClick={() => deleteProduct(viewingProduct.id)}
                  style={deleteButton}
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "#F4EFE6",
  padding: "50px 7%",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "30px",
};

const headerActions: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const title: React.CSSProperties = {
  fontSize: "34px",
  marginBottom: "10px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "24px",
  margin: 0,
};

const text: React.CSSProperties = {
  color: "#6C5A45",
};

const helpText: React.CSSProperties = {
  color: "#7A5A28",
  fontSize: "12px",
  marginLeft: "8px",
};

const formBox: React.CSSProperties = {
  display: "grid",
  gap: "14px",
  maxWidth: "760px",
  background: "#FFF9EF",
  border: "1px solid #D8C29B",
  padding: "24px",
  marginBottom: "36px",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "13px",
  border: "1px solid #D8C29B",
  background: "#FFFDF7",
};

const textarea: React.CSSProperties = {
  ...input,
  minHeight: "120px",
};

const checkLabel: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  alignItems: "center",
  flexWrap: "wrap",
};

const formActions: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const button: React.CSSProperties = {
  background: "#14110D",
  color: "#C8A96A",
  border: "none",
  padding: "12px 16px",
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButton: React.CSSProperties = {
  background: "#C8A96A",
  color: "#14110D",
  border: "none",
  padding: "12px 16px",
  cursor: "pointer",
  fontWeight: 700,
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "24px",
};

const card: React.CSSProperties = {
  background: "#FFF9EF",
  border: "1px solid #D8C29B",
  overflow: "hidden",
  boxShadow: "0 12px 25px rgba(0,0,0,0.06)",
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
  background: "#E8DDC9",
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

const cardBody: React.CSSProperties = {
  padding: "18px",
};

const badgeRow: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "10px",
};

const featuredBadge: React.CSSProperties = {
  background: "#C8A96A",
  color: "#14110D",
  padding: "5px 9px",
  fontSize: "11px",
  fontWeight: 700,
};

const activeBadge: React.CSSProperties = {
  background: "#1F6B3A",
  color: "white",
  padding: "5px 9px",
  fontSize: "11px",
  fontWeight: 700,
};

const inactiveBadge: React.CSSProperties = {
  background: "#7A1F1F",
  color: "white",
  padding: "5px 9px",
  fontSize: "11px",
  fontWeight: 700,
};

const actionRow: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "14px",
};

const deleteButton: React.CSSProperties = {
  background: "#151212",
  color: "white",
  border: "none",
  padding: "12px 16px",
  cursor: "pointer",
  fontWeight: 700,
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
  width: "100%",
  maxWidth: "860px",
  maxHeight: "90vh",
  overflowY: "auto",
  background: "#FFF9EF",
  border: "1px solid #D8C29B",
  position: "relative",
};

const modalClose: React.CSSProperties = {
  position: "absolute",
  top: "12px",
  right: "12px",
  width: "36px",
  height: "36px",
  border: "none",
  background: "#14110D",
  color: "#C8A96A",
  fontSize: "24px",
  cursor: "pointer",
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

const modalNoImage: React.CSSProperties = {
  height: "300px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#E8DDC9",
  color: "#7A5A28",
};

const modalContent: React.CSSProperties = {
  padding: "24px",
};

const modalTitle: React.CSSProperties = {
  fontSize: "30px",
  margin: "0 0 10px",
};