-- Create login_attempts table for tracking failed login attempts
CREATE TABLE "login_attempts" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" varchar NOT NULL,
  "ip_address" varchar NOT NULL,
  "user_id" varchar REFERENCES users(id),
  "attempt_count" integer NOT NULL DEFAULT 1,
  "last_attempt_at" timestamp DEFAULT now(),
  "lockout_until" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Create indexes for efficient lookups
CREATE INDEX "IDX_login_attempts_email_ip" ON "login_attempts"("email", "ip_address");
CREATE INDEX "IDX_login_attempts_lockout" ON "login_attempts"("lockout_until");
