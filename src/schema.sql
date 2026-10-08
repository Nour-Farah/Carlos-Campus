PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('buyer','seller','admin')),university TEXT NOT NULL DEFAULT '',location TEXT NOT NULL DEFAULT '',phone TEXT NOT NULL DEFAULT '',suspended INTEGER NOT NULL DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
-- Upgrade existing single-owner databases without changing their accounts.
CREATE TRIGGER IF NOT EXISTS max_two_owners_insert
BEFORE INSERT ON users
WHEN NEW.role='admin' AND (SELECT COUNT(*) FROM users WHERE role='admin')>=2
BEGIN SELECT RAISE(ABORT,'CampusLoop supports at most two owner accounts'); END;
CREATE TRIGGER IF NOT EXISTS max_two_owners_update
BEFORE UPDATE OF role ON users
WHEN NEW.role='admin' AND OLD.role<>'admin' AND (SELECT COUNT(*) FROM users WHERE role='admin')>=2
BEGIN SELECT RAISE(ABORT,'CampusLoop supports at most two owner accounts'); END;
DROP INDEX IF EXISTS singleton_owner;
CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS categories(id INTEGER PRIMARY KEY,name TEXT UNIQUE NOT NULL,hidden INTEGER DEFAULT 0,position INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY,seller_id TEXT NOT NULL REFERENCES users(id),title TEXT NOT NULL,category_id INTEGER NOT NULL REFERENCES categories(id),brand TEXT NOT NULL,model TEXT NOT NULL,author TEXT DEFAULT '',condition TEXT NOT NULL,price REAL NOT NULL CHECK(price>=0),university TEXT NOT NULL,location TEXT NOT NULL,description TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACTIVE','INACTIVE','REJECTED','SOLD')),featured INTEGER DEFAULT 0,views INTEGER DEFAULT 0,contacts INTEGER DEFAULT 0,moderation_note TEXT DEFAULT '',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS product_status ON products(status,created_at);
CREATE INDEX IF NOT EXISTS product_seller ON products(seller_id);
CREATE TABLE IF NOT EXISTS product_images(id TEXT PRIMARY KEY,product_id TEXT REFERENCES products(id) ON DELETE CASCADE,url TEXT NOT NULL,position INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS favorites(user_id TEXT REFERENCES users(id) ON DELETE CASCADE,product_id TEXT REFERENCES products(id) ON DELETE CASCADE,PRIMARY KEY(user_id,product_id));
CREATE TABLE IF NOT EXISTS product_verifications(product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,kind TEXT NOT NULL,identifier TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'Under review',checks TEXT NOT NULL,notes TEXT DEFAULT '',updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS verification_evidence(id TEXT PRIMARY KEY,product_id TEXT REFERENCES products(id) ON DELETE CASCADE,storage_key TEXT NOT NULL,format TEXT NOT NULL,bytes BLOB);
CREATE TABLE IF NOT EXISTS site_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS activity_logs(id INTEGER PRIMARY KEY,actor_id TEXT REFERENCES users(id),product_id TEXT,action TEXT NOT NULL,details TEXT DEFAULT '',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,product_id TEXT REFERENCES products(id) ON DELETE CASCADE,user_id TEXT REFERENCES users(id),reason TEXT NOT NULL,resolved INTEGER DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
