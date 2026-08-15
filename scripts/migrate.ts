import mysql from "mysql2/promise";
import "dotenv/config";

const statements = [
  `CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, openId VARCHAR(191) NOT NULL UNIQUE, email VARCHAR(255), name VARCHAR(255), role VARCHAR(32) NOT NULL DEFAULT 'user', createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS catalog_collections (collectionKey VARCHAR(191) PRIMARY KEY, name VARCHAR(255) NOT NULL, payload JSON NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS catalog_products (productKey VARCHAR(191) PRIMARY KEY, slug VARCHAR(191) NOT NULL UNIQUE, name VARCHAR(255) NOT NULL, pricePkr INT NOT NULL, stock INT NOT NULL DEFAULT 20, status VARCHAR(32) NOT NULL DEFAULT 'active', payload JSON NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS orders (id INT AUTO_INCREMENT PRIMARY KEY, orderNumber VARCHAR(64) NOT NULL UNIQUE, userId INT NULL, email VARCHAR(255) NOT NULL, subtotalPkr INT NOT NULL, shippingPkr INT NOT NULL, discountPkr INT NOT NULL DEFAULT 0, totalPkr INT NOT NULL, shippingAddress JSON NOT NULL, paymentStatus VARCHAR(32) NOT NULL DEFAULT 'pending', fulfillmentStatus VARCHAR(32) NOT NULL DEFAULT 'pending', inventoryStatus VARCHAR(32) NOT NULL DEFAULT 'reserved', demoMode BOOLEAN NOT NULL DEFAULT TRUE, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX orders_user_idx (userId)) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS order_items (id INT AUTO_INCREMENT PRIMARY KEY, orderId INT NOT NULL, productKey VARCHAR(191) NOT NULL, productName VARCHAR(255) NOT NULL, variant VARCHAR(255), quantity INT NOT NULL, unitPricePkr INT NOT NULL, imageUrl VARCHAR(1000), INDEX order_items_order_idx (orderId)) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS payment_attempts (id INT AUTO_INCREMENT PRIMARY KEY, orderId INT NOT NULL, provider VARCHAR(64) NOT NULL, amountPkr INT NOT NULL, status VARCHAR(32) NOT NULL, referenceId VARCHAR(191) NOT NULL, idempotencyKey VARCHAR(191) NOT NULL UNIQUE, providerMetadata JSON NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX payment_attempts_reference_idx (referenceId)) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS payment_webhook_events (id INT AUTO_INCREMENT PRIMARY KEY, eventId VARCHAR(191) NOT NULL UNIQUE, provider VARCHAR(64) NOT NULL, payload JSON NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS saved_cart_lines (id INT AUTO_INCREMENT PRIMARY KEY, userId INT NOT NULL, productKey VARCHAR(191) NOT NULL, variantKey VARCHAR(255) NOT NULL DEFAULT '', quantity INT NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE KEY saved_cart_line_unique (userId, productKey, variantKey)) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS wishlist_items (id INT AUTO_INCREMENT PRIMARY KEY, userId INT NOT NULL, productKey VARCHAR(191) NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE KEY wishlist_item_unique (userId, productKey)) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS customer_addresses (id INT AUTO_INCREMENT PRIMARY KEY, userId INT NOT NULL, label VARCHAR(64) NOT NULL, recipient VARCHAR(255) NOT NULL, phone VARCHAR(64) NOT NULL, line1 VARCHAR(255) NOT NULL, line2 VARCHAR(255), city VARCHAR(128) NOT NULL, postalCode VARCHAR(32), country VARCHAR(64) NOT NULL DEFAULT 'Pakistan', isDefault BOOLEAN NOT NULL DEFAULT FALSE, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB`,
];

export async function migrate() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for migrations.");
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    await connection.query("CREATE TABLE IF NOT EXISTS _release_migrations (id VARCHAR(64) PRIMARY KEY, appliedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB");
    for (let index = 0; index < statements.length; index += 1) {
      const id = `000${Math.min(index + 1, 3)}_${index + 1}`;
      const [rows] = await connection.query("SELECT id FROM _release_migrations WHERE id = ?", [id]);
      if (!(rows as unknown[]).length) { await connection.query(statements[index]); await connection.query("INSERT INTO _release_migrations (id) VALUES (?)", [id]); console.log(`applied ${id}`); }
    }
  } finally { await connection.end(); }
}

if (process.env.VITEST !== "true") migrate().catch((error) => { console.error(error); process.exit(1); });
