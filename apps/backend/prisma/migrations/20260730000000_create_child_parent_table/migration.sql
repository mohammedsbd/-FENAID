-- CreateTable
CREATE TABLE "ChildParent" (
    "childId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChildParent_pkey" PRIMARY KEY ("childId","parentId")
);

-- CreateIndex
CREATE INDEX "ChildParent_parentId_idx" ON "ChildParent"("parentId");

-- AddForeignKey
ALTER TABLE "ChildParent" ADD CONSTRAINT "ChildParent_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildParent" ADD CONSTRAINT "ChildParent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
