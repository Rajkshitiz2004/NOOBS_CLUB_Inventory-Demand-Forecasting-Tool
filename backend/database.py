import sqlite3
import os

DB_PATH = 'inventory.db'

def get_connection():
    return sqlite3.connect(DB_PATH)

def init_db():
    conn = get_connection()
    sql = """
    CREATE TABLE IF NOT EXISTS inventory_sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_date TEXT NOT NULL,
        sku TEXT NOT NULL,
        units_sold INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sku_date ON inventory_sales (sku, sale_date);
    """
    with conn:
        conn.executescript(sql)
    conn.close()

def insert_sales(data_list):
    conn = get_connection()
    with conn:
        query = "INSERT INTO inventory_sales (sale_date, sku, units_sold) VALUES (?, ?, ?)"
        conn.executemany(query, data_list)
    conn.close()

def get_skus():
    conn = get_connection()
    cursor = conn.execute("SELECT DISTINCT sku FROM inventory_sales ORDER BY sku")
    skus = [row[0] for row in cursor.fetchall()]
    conn.close()
    return skus

def get_sales_by_sku(sku):
    conn = get_connection()
    cursor = conn.execute(
        "SELECT sale_date, units_sold FROM inventory_sales WHERE sku = ? ORDER BY sale_date",
        (sku,)
    )
    data = cursor.fetchall()
    conn.close()
    return data

def get_global_stats():
    conn = get_connection()
    cursor = conn.execute("SELECT COUNT(DISTINCT sku) FROM inventory_sales")
    total_skus = cursor.fetchone()[0]
    
    cursor = conn.execute("SELECT MAX(sale_date) FROM inventory_sales")
    max_date_str = cursor.fetchone()[0]
    if max_date_str:
        cursor = conn.execute(
            "SELECT SUM(units_sold) FROM inventory_sales WHERE sale_date > date(?, '-30 days')",
            (max_date_str,)
        )
        total_sales_30d = cursor.fetchone()[0] or 0
    else:
        total_sales_30d = 0
        
    conn.close()
    return {
        "total_skus": total_skus,
        "total_sales_30d": total_sales_30d,
        "growth": 8
    }
