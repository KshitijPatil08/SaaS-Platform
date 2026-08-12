-- CreateTable
CREATE TABLE "JobLock" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "owner_id" TEXT NOT NULL,
    "locked_until" TIMESTAMP NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "JobLock_locked_until_idx" ON "JobLock"("locked_until");
