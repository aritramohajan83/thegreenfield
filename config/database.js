const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './database.sqlite';

let db;

function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('📁 Connected to SQLite database');
      }
    });
  }
  return db;
}

async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    
    database.serialize(async () => {
      // Users table
      database.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          phone TEXT,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'customer',
          loyalty_points INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Bookings table with duration column
      database.run(`
        CREATE TABLE IF NOT EXISTS bookings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          ground_number INTEGER NOT NULL,
          booking_date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          duration INTEGER NOT NULL,
          player_count INTEGER NOT NULL,
          total_amount DECIMAL(10,2) NOT NULL,
          payment_method TEXT NOT NULL,
          payment_status TEXT DEFAULT 'pending',
          payment_screenshot TEXT,
          booking_status TEXT DEFAULT 'pending',
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Updates/News table
      database.run(`
        CREATE TABLE IF NOT EXISTS updates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          image_url TEXT,
          is_featured BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Analytics table
      database.run(`
        CREATE TABLE IF NOT EXISTS analytics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_type TEXT NOT NULL,
          event_data TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create default admin user
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      
      if (adminEmail && adminPassword) {
        const hashedPassword = await bcrypt.hash(adminPassword, 12);
        
        database.run(`
          INSERT OR REPLACE INTO users (name, email, password, role)
          VALUES (?, ?, ?, ?)
        `, ['Admin User', adminEmail, hashedPassword, 'admin'], (err) => {
          if (err) {
            console.error('Error creating admin user:', err);
          } else {
            console.log('✅ Admin user created/updated');
          }
        });
      }

      // Insert sample updates
      database.run(`
        INSERT OR IGNORE INTO updates (title, content, is_featured)
        VALUES 
        ('Welcome to The Green Field!', 'Book your slots for Ground 1 and Ground 2. Available 24/7 with modern facilities.', 1),
        ('New Discount Available', 'Get 10% off on weekend bookings. Book now and enjoy premium sports experience!', 0)
      `, (err) => {
        if (err) {
          console.error('Error inserting sample updates:', err);
        }
      });
      
      resolve();
    });
  });
}

module.exports = {
  getDatabase,
  initializeDatabase
};