#!/usr/bin/env npx tsx

import { config } from "dotenv";
config();

import { db } from "../server/db";
import { users } from "../shared/schema";
import { isNotNull, eq } from "drizzle-orm";
import { PIIProtectionService } from "../server/services/piiProtectionService";

const PREFIX = "enc:";

async function run() {
  if (!PIIProtectionService.isEncryptionAvailable()) {
    console.error("FIELD_ENCRYPTION_KEY is not set; cannot encrypt mfa_secret values.");
    process.exit(1);
  }

  const dryRun = process.argv.includes("--dry-run");
  const withSecrets = await db
    .select({
      id: users.id,
      email: users.email,
      mfaSecret: users.mfaSecret,
    })
    .from(users)
    .where(isNotNull(users.mfaSecret));

  const plaintextUsers = withSecrets.filter(
    (u) => !!u.mfaSecret && !u.mfaSecret.startsWith(PREFIX),
  );

  console.log(`Found ${plaintextUsers.length} plaintext MFA secret(s).`);
  if (plaintextUsers.length === 0) {
    return;
  }

  let updated = 0;
  for (const user of plaintextUsers) {
    if (!user.mfaSecret) {
      continue;
    }
    const encrypted = `${PREFIX}${PIIProtectionService.encryptField(user.mfaSecret)}`;

    if (!dryRun) {
      await db
        .update(users)
        .set({
          mfaSecret: encrypted,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    }

    updated++;
    if (dryRun) {
      console.log(`[dry-run] would encrypt mfa_secret for ${user.email}`);
    }
  }

  if (dryRun) {
    console.log(`Dry run complete: ${updated} row(s) would be updated.`);
  } else {
    console.log(`Migration complete: ${updated} row(s) updated.`);
  }
}

run().catch((error) => {
  console.error("MFA secret encryption migration failed:", error);
  process.exit(1);
});
