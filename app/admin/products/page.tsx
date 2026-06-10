"use client";

import { useEffect, useState } from "react";
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

export default function AdminProductsPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    category: "Single Headstone",
    description: "",
    price: "",
    is_featured: false,
    is_active: true,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);

  function login() {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setLoggedIn(true);
      fetchProducts();
    } else {
      alert("Incorrect password.");
    }
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

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      let imageUrl = "";

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
          .from("tombstone-products")
          .upload(filePath, imageFile);

        if (uploadError) {
          alert(uploadError.message);
          return;
        }

        const { data } = supabase.storage
          .from("tombstone-products")
          .getPublicUrl(filePath);

        imageUrl = data.publicUrl;
      }

      const { error } = await supabase.from("tombstone_products").insert({
        title: form.title,
        category: form.category,
        description: form.description,
        price: form.price,
        image_url: imageUrl,
        is_featured: form.is_featured,
        is_active: form.is_active,
      });

      if (error) {
        alert(error.message);
        return;
      }

      setForm({
        title: "",
        category: "Single Headstone",
        description: "",
        price: "",
        is_featured: false,
        is_active: true,
      });

      setImageFile(null);
      fetchProducts();
      alert("Product added successfully.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: string) {
    const confirmed = confirm("Delete this product?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("tombstone_products")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    fetchProducts();
  }

  if (!loggedIn) {
    return (
      <main style={page}>
        <div style={loginBox}>
          <h1 style={title}>Poloko Admin</h1>
          <p style={text}>Enter admin password to manage tombstone products.</p>

          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={input}
          />

          <button onClick={login} style={button}>
            Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={page}>
      <h1 style={title}>Tombstone Product Admin</h1>

      <form onSubmit={addProduct} style={formBox}>
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

        <label style={checkLabel}>
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(e) =>
              setForm({ ...form, is_featured: e.target.checked })
            }
          />
          Featured product
        </label>

        <label style={checkLabel}>
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) =>
              setForm({ ...form, is_active: e.target.checked })
            }
          />
          Active
        </label>

        <button type="submit" disabled={saving} style={button}>
          {saving ? "Saving..." : "Add Product"}
        </button>
      </form>

      <section style={grid}>
        {products.map((product) => (
          <div key={product.id} style={card}>
            {product.image_url && (
              <img src={product.image_url} alt={product.title} style={image} />
            )}

            <div style={cardBody}>
              <h3>{product.title}</h3>
              <p>{product.category}</p>
              <strong>{product.price}</strong>
              <p>{product.description}</p>

              <button
                onClick={() => deleteProduct(product.id)}
                style={deleteButton}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "#F4EFE6",
  padding: "50px 7%",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const loginBox: React.CSSProperties = {
  maxWidth: "420px",
  margin: "80px auto",
  background: "#FFF9EF",
  border: "1px solid #D8C29B",
  padding: "30px",
};

const title: React.CSSProperties = {
  fontSize: "34px",
  marginBottom: "20px",
};

const text: React.CSSProperties = {
  color: "#6C5A45",
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
};

const textarea: React.CSSProperties = {
  ...input,
  minHeight: "120px",
};

const checkLabel: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  alignItems: "center",
};

const button: React.CSSProperties = {
  background: "#14110D",
  color: "#C8A96A",
  border: "none",
  padding: "14px 20px",
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

const cardBody: React.CSSProperties = {
  padding: "18px",
};

const deleteButton: React.CSSProperties = {
  background: "#7A1F1F",
  color: "white",
  border: "none",
  padding: "10px 14px",
  cursor: "pointer",
};