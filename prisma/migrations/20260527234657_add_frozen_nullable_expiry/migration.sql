-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Food" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "expiryType" TEXT NOT NULL,
    "expiryDate" DATETIME,
    "quantity" INTEGER,
    "unit" TEXT,
    "frozen" BOOLEAN NOT NULL DEFAULT false,
    "memo" TEXT,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Food" ("createdAt", "expiryDate", "expiryType", "id", "memo", "name", "notified", "quantity", "unit", "updatedAt") SELECT "createdAt", "expiryDate", "expiryType", "id", "memo", "name", "notified", "quantity", "unit", "updatedAt" FROM "Food";
DROP TABLE "Food";
ALTER TABLE "new_Food" RENAME TO "Food";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
