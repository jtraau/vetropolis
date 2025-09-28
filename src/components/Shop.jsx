import React from "react";

const Shop = ({
  money,
  shopItems,
  onBuy,
  onClose,
  message,
  title = "Toko",
}) => {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 220,
        display: "flex",
        alignItems: "flex-end", // <— was 'right'
        justifyContent: "flex-end", // <— was 'right'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          padding: 24,
          minWidth: 320,
          maxWidth: "92vw",
          minHeight: 340,
          maxHeight: "92vh",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          margin: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            fontWeight: "bold",
            fontSize: 22,
            marginBottom: 10,
            color: "#222",
          }}
        >
          {title}
        </div>

        {/* Saldo */}
        <div style={{ marginBottom: 10, fontWeight: 700, color: "#2e7d32" }}>
          Saldo: {money}
        </div>

        {/* Pesan khusus shop */}
        {message && (
          <div
            style={{
              marginBottom: 12,
              padding: "8px 12px",
              width: "100%",
              borderRadius: 10,
              background: "rgba(211, 47, 47, 0.08)",
              color: "#d32f2f",
              fontWeight: 600,
            }}
          >
            {message}
          </div>
        )}

        {/* List item */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            width: 320,
            maxWidth: "80vw",
            overflowY: "auto",
            paddingRight: 4,
            flex: 1,
          }}
        >
          {shopItems.map((item) => {
            const disabled = money < item.price;
            const hasEffect =
              (item.restoreHunger || 0) > 0 || (item.restoreThirst || 0) > 0;

            return (
              <button
                key={item.id}
                onClick={() => onBuy(item)}
                disabled={disabled}
                style={{
                  width: "100%",
                  minHeight: 56,
                  background: disabled ? "#eee" : "#f5f5f5",
                  border: "2px solid #bbb",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  fontSize: 18,
                  color: disabled ? "#999" : "#333",
                  cursor: disabled ? "not-allowed" : "pointer",
                  padding: "10px 14px",
                  gap: 12,
                  opacity: disabled ? 0.85 : 1,
                  textAlign: "left",
                }}
                title={disabled ? "Uang tidak cukup" : `Beli ${item.name}`}
              >
                <span style={{ fontSize: 26, lineHeight: 1 }}>
                  {item.emoji}
                </span>

                <div
                  style={{ flex: 1, display: "flex", flexDirection: "column" }}
                >
                  <span style={{ fontWeight: 700, fontSize: 16 }}>
                    {item.name}
                  </span>
                  {hasEffect && (
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      {item.restoreHunger
                        ? `+${item.restoreHunger} Hunger`
                        : ""}
                      {item.restoreHunger && item.restoreThirst ? " · " : ""}
                      {item.restoreThirst
                        ? `+${item.restoreThirst} Thirst`
                        : ""}
                    </span>
                  )}
                </div>

                <span
                  style={{ fontSize: 16, fontWeight: 800, color: "#2e7d32" }}
                >
                  {item.price}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          style={{
            marginTop: 14,
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            background: "#f44336",
            color: "#fff",
            fontWeight: "bold",
            fontSize: 16,
            cursor: "pointer",
            alignSelf: "flex-end",
          }}
        >
          Tutup
        </button>
      </div>
    </div>
  );
};

export default Shop;