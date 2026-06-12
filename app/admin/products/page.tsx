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
    const filePath = fileName;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("tombstone-products")
      .upload(filePath, imageFile, {
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

    if (!data.publicUrl) {
      throw new Error("Could not generate public image URL.");
    }

    return data.publicUrl;
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const uploadedImageUrl = await uploadImage();

      console.log("Uploaded image URL:", uploadedImageUrl);

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

    if (viewingProduct?.id === id) {
      setViewingProduct(null);
    }

    if (editingProduct?.id === id) {
      resetForm();
    }

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

        {imageFile ? (
          <p style={helpText}>Selected image: {imageFile.name}</p>
        ) : null}

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
            Use this when you want to highlight a product later on the homepage
            or in a featured tombstones section.
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
            Active products show on the public catalogue. If unticked, the
            product stays in admin but is hidden from customers.
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
              <img src={product.image_url} alt={product.title} style={image} />
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
                <button
                  onClick={() => setViewingProduct(product)}
                  style={secondaryButton}
                >
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
        <div style={modalOverlay} onClick={() => setViewingProduct(null)}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setViewingProduct(null)}
              style={modalClose}
            >
              ×
            </button>

            {viewingProduct.image_url ? (
              <img
                src={viewingProduct.image_url}
                alt={viewingProduct.title}
                style={modalImage}
              />
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
                <button
                  onClick={() => startEdit(viewingProduct)}
                  style={button}
                >
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
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "20px",
};

const card: React.CSSProperties = {
  background: "#FFF9EF",
  border: "1px solid #D8C29B",
};

const image: React.CSSProperties = {
  width: "100%",
  height: "220px",
  objectFit: "cover",
};

const imagePlaceholder: React.CSSProperties = {
  height: "220px",
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
  maxWidth: "760px",
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
};

const modalImage: React.CSSProperties = {
  width: "100%",
  maxHeight: "460px",
  objectFit: "contain",
  background: "#17130E",
  display: "block",
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