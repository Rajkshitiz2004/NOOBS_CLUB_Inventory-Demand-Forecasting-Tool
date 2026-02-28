CREATE TABLE IF NOT EXISTS inventory_sales (
    id SERIAL PRIMARY KEY,
    sale_date DATE NOT NULL,
    sku VARCHAR(100) NOT NULL,
    units_sold INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sku_date ON inventory_sales (sku, sale_date);
