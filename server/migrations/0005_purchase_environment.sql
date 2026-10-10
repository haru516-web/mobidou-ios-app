-- Remember whether a purchase was real or from the Sandbox (run once on an existing database).
ALTER TABLE purchases ADD COLUMN environment TEXT NOT NULL DEFAULT 'Production';
