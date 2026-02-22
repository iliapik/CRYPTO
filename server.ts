import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("database.db");

const CRYPTOS = [
  { type: 'Dogecoin', rarity: 'Common', chance: 0.25 },
  { type: 'Shiba Inu', rarity: 'Common', chance: 0.25 },
  { type: 'Litecoin', rarity: 'Uncommon', chance: 0.15 },
  { type: 'Cardano', rarity: 'Uncommon', chance: 0.15 },
  { type: 'Ethereum', rarity: 'Rare', chance: 0.07 },
  { type: 'Solana', rarity: 'Rare', chance: 0.07 },
  { type: 'Polkadot', rarity: 'Epic', chance: 0.02 },
  { type: 'Avalanche', rarity: 'Epic', chance: 0.02 },
  { type: 'Monero', rarity: 'Mythic', chance: 0.0075 },
  { type: 'Cosmos', rarity: 'Mythic', chance: 0.0075 },
  { type: 'Bitcoin', rarity: 'Legendary', chance: 0.0025 },
  { type: 'Binance Coin', rarity: 'Legendary', chance: 0.0025 },
];

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    bio TEXT,
    balance INTEGER DEFAULT 100,
    badge TEXT DEFAULT NULL,
    is_admin INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS friends (
    user_id TEXT,
    friend_id TEXT,
    PRIMARY KEY(user_id, friend_id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(friend_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    crypto_type TEXT,
    rarity TEXT,
    is_listed INTEGER DEFAULT 0,
    acquired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS marketplace (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id TEXT,
    inventory_id INTEGER,
    crypto_type TEXT,
    rarity TEXT,
    price INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(seller_id) REFERENCES users(id),
    FOREIGN KEY(inventory_id) REFERENCES inventory(id)
  );

  -- Pre-seed Creator accounts
  INSERT OR IGNORE INTO users (id, username, password, bio, balance, is_admin) 
  VALUES ('creator_id', 'Illyapik', '1203 Ilya', 'Creator', 999999999, 1);
  INSERT OR IGNORE INTO users (id, username, password, bio, balance, is_admin) 
  VALUES ('epic_id', 'Epic', '1203 Ilya', 'Creator', 999999999, 1);
`);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// Global error handler for JSON responses
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

// WebSocket handling
const clients = new Set<WebSocket>();

wss.on("connection", (ws) => {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
});

function broadcast(data: any) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// API Routes
app.post("/api/register", (req, res) => {
  try {
    const { username, password, bio } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Введите логин и пароль" });
    if (username.length < 4) return res.status(400).json({ error: "Логин должен быть не менее 4 символов" });
    if (password.length < 4) return res.status(400).json({ error: "Пароль должен быть не менее 4 символов" });

    const existing = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (existing) return res.status(400).json({ error: "Этот логин уже занят" });

    const id = Math.random().toString(36).substring(7);
    db.prepare("INSERT INTO users (id, username, password, bio) VALUES (?, ?, ?, ?)").run(id, username, password, bio || "");
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/login", (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Введите логин и пароль" });
    
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Неверный логин или пароль" });
    }
    
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/user/:id", (req, res) => {
  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    const inventory = db.prepare("SELECT * FROM inventory WHERE user_id = ?").all(req.params.id);
    res.json({ user: user || null, inventory: inventory || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/reward", (req, res) => {
  try {
    const { userId, amount } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    if (user && (user.username.toLowerCase() === 'illyapik' || user.username.toLowerCase() === 'epic')) {
      return res.json(user); // Don't need to update balance for creator
    }
    db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(amount, userId);
    const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    res.json(updatedUser || { error: "User not found" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/stats", (req, res) => {
  try {
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
    const marketCount = db.prepare("SELECT COUNT(*) as count FROM marketplace").get() as any;
    const totalItems = db.prepare("SELECT COUNT(*) as count FROM inventory").get() as any;
    
    // Economy volume = Weekly marketplace turnover (sum of prices of items sold in the last 7 days)
    // We'll use the sum of active listings created in the last 7 days as a proxy for turnover
    const turnover = db.prepare("SELECT SUM(price) as total FROM marketplace WHERE created_at > datetime('now', '-7 days')").get() as any;
    
    res.json({
      totalUsers: userCount.count,
      activeListings: marketCount.count,
      totalInventoryItems: totalItems.count,
      economyVolume: turnover.total || 0
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/unlock", (req, res) => {
  const { userId, code } = req.body;
  if (code === 'Iliapik10') {
    db.prepare("UPDATE users SET is_admin = 1 WHERE id = ?").run(userId);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    res.json({ success: true, user });
  } else {
    res.status(400).json({ error: "Invalid code" });
  }
});

app.post("/api/open-case", (req, res) => {
  const { userId, cost, crypto } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
  
  if (!user) return res.status(404).json({ error: "User not found" });

  const isAdmin = user.username.toLowerCase() === 'illyapik' || user.username.toLowerCase() === 'epic';

  if (!isAdmin && user.balance < cost) {
    return res.status(400).json({ error: "Insufficient funds" });
  }

  if (!isAdmin) {
    db.prepare("UPDATE users SET balance = balance - ? WHERE id = ?").run(cost, userId);
  }
  
  const result = db.prepare("INSERT INTO inventory (user_id, crypto_type, rarity) VALUES (?, ?, ?)").run(userId, crypto.type, crypto.rarity);
  
  const newUser = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  const newItem = db.prepare("SELECT * FROM inventory WHERE id = ?").get(result.lastInsertRowid);
  
  res.json({ user: newUser, item: newItem });
});

app.post("/api/exchange", (req, res) => {
  try {
    const { userId, rarity, cryptoType } = req.body;
    
    let countNeeded = 0;
    let targetType = "";
    let sourceRarity = rarity;

    if (cryptoType) {
      const mappings: Record<string, { count: number, target: string, rarity: string }> = {
        'Dogecoin': { count: 10, target: 'Doge Statue', rarity: 'Common' },
        'Shiba Inu': { count: 10, target: 'Shiba Plush', rarity: 'Common' },
        'Litecoin': { count: 8, target: 'Lite Trophy', rarity: 'Uncommon' },
        'Cardano': { count: 8, target: 'Carda Medal', rarity: 'Uncommon' },
        'Ethereum': { count: 5, target: 'Ether Crystal', rarity: 'Rare' },
        'Solana': { count: 5, target: 'Sola Orb', rarity: 'Rare' },
        'Bitcoin': { count: 3, target: 'Bit Crown', rarity: 'Legendary' },
      };

      const map = mappings[cryptoType];
      if (!map) return res.status(400).json({ error: "Недопустимый тип валюты для обмена" });
      
      countNeeded = map.count;
      targetType = map.target;
      sourceRarity = map.rarity;
    } else {
      countNeeded = rarity === 'Legendary' ? 5 : 4;
      targetType = rarity === 'Legendary' ? 'Legendary Bear' : 'Rare Diamond';
    }

    const query = cryptoType 
      ? "SELECT id FROM inventory WHERE user_id = ? AND crypto_type = ? AND is_listed = 0 LIMIT ?"
      : "SELECT id FROM inventory WHERE user_id = ? AND rarity = ? AND is_listed = 0 LIMIT ?";
    
    const params = cryptoType ? [userId, cryptoType, countNeeded] : [userId, rarity, countNeeded];
    const items = db.prepare(query).all(...params);

    if (items.length < countNeeded) {
      const name = cryptoType || rarity;
      return res.status(400).json({ error: `Недостаточно предметов ${name}. Нужно ${countNeeded}.` });
    }

    db.transaction(() => {
      const deleteStmt = db.prepare("DELETE FROM inventory WHERE id = ?");
      for (const item of items) {
        deleteStmt.run((item as any).id);
      }
      db.prepare("INSERT INTO inventory (user_id, crypto_type, rarity) VALUES (?, ?, ?)")
        .run(userId, targetType, sourceRarity);
    })();

    const inventory = db.prepare("SELECT * FROM inventory WHERE user_id = ?").all(userId);
    res.json({ success: true, inventory });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/friends/add", (req, res) => {
  try {
    const { userId, friendId } = req.body;
    if (userId === friendId) return res.status(400).json({ error: "Нельзя добавить самого себя" });
    
    const friend = db.prepare("SELECT id FROM users WHERE id = ?").get(friendId);
    if (!friend) return res.status(404).json({ error: "Пользователь не найден" });

    db.prepare("INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)").run(userId, friendId);
    db.prepare("INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)").run(friendId, userId);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/friends/:userId", (req, res) => {
  try {
    const friends = db.prepare(`
      SELECT u.id, u.username, u.badge 
      FROM users u 
      JOIN friends f ON u.id = f.friend_id 
      WHERE f.user_id = ?
    `).all(req.params.userId);
    res.json(friends);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/friends/gift", (req, res) => {
  try {
    const { fromId, toId, inventoryId } = req.body;
    
    db.transaction(() => {
      const item = db.prepare("SELECT * FROM inventory WHERE id = ? AND user_id = ? AND is_listed = 0").get(inventoryId, fromId);
      if (!item) throw new Error("Предмет не найден или на продаже");
      
      db.prepare("UPDATE inventory SET user_id = ? WHERE id = ?").run(toId, inventoryId);
    })();

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/exchange/badge", (req, res) => {
  try {
    const { userId, itemIds, badgeType } = req.body;
    
    const items = db.prepare(`SELECT * FROM inventory WHERE id IN (${itemIds.map(() => '?').join(',')}) AND user_id = ? AND is_listed = 0`)
      .all(...itemIds, userId);

    if (items.length !== itemIds.length) {
      return res.status(400).json({ error: "Некоторые предметы недоступны" });
    }

    db.transaction(() => {
      const deleteStmt = db.prepare("DELETE FROM inventory WHERE id = ?");
      for (const id of itemIds) {
        deleteStmt.run(id);
      }
      db.prepare("UPDATE users SET badge = ? WHERE id = ?").run(badgeType, userId);
    })();

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/upgrade", (req, res) => {
  try {
    const { userId, itemIds, targetRarity } = req.body;
    
    if (!itemIds || itemIds.length === 0) {
      return res.status(400).json({ error: "Выберите предметы для апгрейда" });
    }

    const items = db.prepare(`SELECT * FROM inventory WHERE id IN (${itemIds.map(() => '?').join(',')}) AND user_id = ? AND is_listed = 0`)
      .all(...itemIds, userId);

    if (items.length !== itemIds.length) {
      return res.status(400).json({ error: "Некоторые предметы недоступны или уже продаются" });
    }

    const rarityValues: Record<string, number> = {
      'Common': 1,
      'Uncommon': 4,
      'Rare': 16,
      'Epic': 64,
      'Mythic': 256,
      'Legendary': 1024
    };

    const totalValue = items.reduce((sum, item: any) => sum + (rarityValues[item.rarity] || 0), 0);
    const targetValue = rarityValues[targetRarity] || 1;
    
    // Calculate chance: (Total Value / Target Value) * 100
    // We cap it at 95% to keep some risk, or 100% if the user really overpays? 
    // Let's allow 100% but make it hard.
    const chance = Math.min(100, (totalValue / targetValue) * 100);
    const roll = Math.random() * 100;
    const success = roll <= chance;

    db.transaction(() => {
      // Always consume items
      const deleteStmt = db.prepare("DELETE FROM inventory WHERE id = ?");
      for (const id of itemIds) {
        deleteStmt.run(id);
      }

      if (success) {
        const possibleDrops = CRYPTOS.filter(c => c.rarity === targetRarity && c.chance > 0);
        const drop = possibleDrops[Math.floor(Math.random() * possibleDrops.length)];
        db.prepare("INSERT INTO inventory (user_id, crypto_type, rarity) VALUES (?, ?, ?)")
          .run(userId, drop.type, drop.rarity);
      }
    })();

    const inventory = db.prepare("SELECT * FROM inventory WHERE user_id = ?").all(userId);
    res.json({ success, chance, roll, inventory });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/marketplace", (req, res) => {
  const listings = db.prepare(`
    SELECT m.*, u.username as seller_name 
    FROM marketplace m 
    JOIN users u ON m.seller_id = u.id
    ORDER BY m.created_at DESC
  `).all();
  res.json(listings);
});

app.post("/api/marketplace/list", (req, res) => {
  const { userId, inventoryId, price } = req.body;
  const item = db.prepare("SELECT * FROM inventory WHERE id = ? AND user_id = ?").get(inventoryId, userId);
  
  if (!item) return res.status(404).json({ error: "Предмет не найден" });
  if (price > 10000) return res.status(400).json({ error: "Максимальная цена $10,000" });

  db.transaction(() => {
    db.prepare("INSERT INTO marketplace (seller_id, inventory_id, crypto_type, rarity, price) VALUES (?, ?, ?, ?, ?)").run(
      userId, inventoryId, item.crypto_type, item.rarity, price
    );
    db.prepare("UPDATE inventory SET is_listed = 1 WHERE id = ?").run(inventoryId);
  })();

  broadcast({ type: "MARKET_UPDATE" });
  res.json({ success: true });
});

app.post("/api/marketplace/cancel", (req, res) => {
  const { userId, inventoryId } = req.body;
  
  db.transaction(() => {
    db.prepare("DELETE FROM marketplace WHERE inventory_id = ? AND seller_id = ?").run(inventoryId, userId);
    db.prepare("UPDATE inventory SET is_listed = 0 WHERE id = ? AND user_id = ?").run(inventoryId, userId);
  })();

  broadcast({ type: "MARKET_UPDATE" });
  res.json({ success: true });
});

app.post("/api/marketplace/buy", (req, res) => {
  const { buyerId, listingId } = req.body;
  const listing = db.prepare("SELECT * FROM marketplace WHERE id = ?").get(listingId);
  const buyer = db.prepare("SELECT * FROM users WHERE id = ?").get(buyerId);

  if (!listing || !buyer) return res.status(404).json({ error: "Not found" });
  if (buyer.balance < listing.price) return res.status(400).json({ error: "Insufficient funds" });
  if (listing.seller_id === buyerId) return res.status(400).json({ error: "Cannot buy your own item" });

  db.transaction(() => {
    // Transfer money
    db.prepare("UPDATE users SET balance = balance - ? WHERE id = ?").run(listing.price, buyerId);
    db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(listing.price, listing.seller_id);
    
    // Transfer item
    db.prepare("UPDATE inventory SET user_id = ? WHERE id = ?").run(buyerId, listing.inventory_id);
    
    // Remove listing
    db.prepare("DELETE FROM marketplace WHERE id = ?").run(listingId);
  })();

  broadcast({ type: "MARKET_UPDATE" });
  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
