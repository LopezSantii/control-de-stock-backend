const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();
const { Pool } = require("pg");
const bodyParser = require("body-parser");

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

app.get("/test", (req, res) => {
  res.send("Test endpoint is working!");
});

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL, // Usa la variable de entorno de Vercel
});

pool.connect((err) => {
  if (err) throw err;
  console.log("Connected to the PostgreSQL database");
});

// Ruta para obtener todos los productos
app.get("/api/products", (req, res) => {
  pool.query("SELECT * FROM products", (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// Movimientos de Stock
app.get("/api/stock-movements", (req, res) => {
  const query = `
    SELECT stock_movements.id, stock_movements.producto_id, products.nombre AS producto_nombre, stock_movements.tipo, stock_movements.cantidad, stock_movements.fecha
    FROM stock_movements
    JOIN products ON stock_movements.producto_id = products.id
  `;

  pool.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: "Database query failed" });
    } else {
      res.json(results);
    }
  });
});

// Ruta para agregar un nuevo producto
app.post("/api/products", (req, res) => {
  const { nombre, descripcion, precio, cantidad } = req.body;
  pool.query(
    "INSERT INTO products (nombre, descripcion, precio, cantidad) VALUES (?, ?, ?, ?)",
    [nombre, descripcion, precio, cantidad],
    (err, result) => {
      if (err) throw err;
      res.json({ id: result.insertId });
    }
  );
});

// Ruta para eliminar un producto
app.delete("/api/products", (req, res) => {
  const { productId } = req.body;

  pool.query(
    "DELETE FROM stock_movements WHERE producto_id = ?",
    [productId],
    (err) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "Failed to delete stock movements" });
      }

      pool.query(
        "DELETE FROM products WHERE id = ?",
        [productId],
        (err, result) => {
          if (err) {
            res.status(500).json({ error: "Failed to delete product" });
          } else if (result.affectedRows === 0) {
            res.status(404).json({ error: "Product not found" });
          } else {
            res.json({
              message:
                "Product and related stock movements deleted successfully",
            });
          }
        }
      );
    }
  );
});

// Ruta para eliminar un movimientos
app.delete("/api/stock-movements", (req, res) => {
  const { movementid } = req.body;

  pool.query(
    "DELETE FROM stock_movements WHERE id = ?",
    [movementid],
    (err, result) => {
      if (err) {
        res.status(500).json({ error: "Failed to delete product" });
      } else if (result.affectedRows === 0) {
        res.status(404).json({ error: "Product not found" });
      } else {
        res.json({
          message: "Product and related stock movements deleted successfully",
        });
      }
    }
  );
});

// Ruta para registrar un movimiento de stock
app.post("/api/stock-movement", (req, res) => {
  const { producto_id, tipo, cantidad } = req.body;
  pool.query(
    "INSERT INTO stock_movements (producto_id, tipo, cantidad, fecha) VALUES (?, ?, ?, NOW())",
    [producto_id, tipo, cantidad],
    (err, result) => {
      if (err) throw err;
      // Actualiza la cantidad en productos
      const sign = tipo === "entrada" ? "+" : "-";
      pool.query(
        `UPDATE products SET cantidad = cantidad ${sign} ? WHERE id = ?`,
        [cantidad, producto_id],
        (err) => {
          if (err) throw err;
          res.json({ id: result.insertId });
        }
      );
    }
  );
});

app.listen(3001, () => {
  console.log("Server running on port 3001");
});
