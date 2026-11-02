import { connectDb, disconnectDb } from '../config/db.js';
import { logger } from '../config/logger.js';
import { hashPassword } from '../modules/auth/auth.service.js';
import { User } from '../modules/users/user.model.js';

/** Creates the first admin, or promotes an existing account, without touching other data. */
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD');
  if (password.length < 12) throw new Error('Use an admin password of at least 12 characters');

  await connectDb();
  await User.updateOne(
    { email },
    {
      $set: { role: 'admin', isActive: true, passwordHash: await hashPassword(password) },
      $setOnInsert: { name: 'Dali Admin' },
    },
    { upsert: true },
  );
  logger.info({ email }, 'Admin account ready');
}

main()
  .catch((err) => {
    logger.error(err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
