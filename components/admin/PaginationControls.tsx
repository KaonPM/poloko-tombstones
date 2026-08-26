"use client";

type PaginationControlsProps = {
  itemLabel: string;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export default function PaginationControls({
  itemLabel,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <nav aria-label={`${itemLabel} pagination`} style={container}>
      <span style={summary}>Showing {start}-{end} of {totalItems}</span>
      <label style={pageSizeLabel}>
        Show
        <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} style={select}>
          <option value={5}>5</option>
          <option value={20}>20</option>
        </select>
      </label>
      <div style={actions}>
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} style={button}>
          Previous
        </button>
        <span style={pageText}>Page {page} of {totalPages}</span>
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} style={button}>
          Next
        </button>
      </div>
    </nav>
  );
}

const container: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "20px",
  color: "#6C5A45",
  fontSize: "13px",
};

const summary: React.CSSProperties = { fontWeight: 700 };
const pageSizeLabel: React.CSSProperties = { display: "flex", alignItems: "center", gap: "6px" };
const select: React.CSSProperties = { border: "1px solid #C8A96A", background: "#FFF9EF", padding: "5px 7px", font: "inherit" };
const actions: React.CSSProperties = { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" };
const pageText: React.CSSProperties = { whiteSpace: "nowrap" };
const button: React.CSSProperties = { border: "1px solid #C8A96A", background: "#FFF9EF", color: "#14110D", padding: "6px 10px", cursor: "pointer", fontWeight: 700 };
