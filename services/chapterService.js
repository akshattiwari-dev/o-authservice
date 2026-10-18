import { prisma } from "@/lib/prisma";

export async function getProgressForUser(userId) {
  return prisma.chapterProgress.findMany({ where: { userId } });
}

export async function setChapterCompletion(userId, chapterSlug, completed) {
  return prisma.chapterProgress.upsert({
    where: { userId_chapterSlug: { userId, chapterSlug } },
    create: { userId, chapterSlug, completed, completedAt: completed ? new Date() : null },
    update: { completed, completedAt: completed ? new Date() : null },
  });
}

export async function getNote(userId, chapterSlug) {
  return prisma.chapterNote.findUnique({
    where: { userId_chapterSlug: { userId, chapterSlug } },
  });
}

export async function upsertNote(userId, chapterSlug, body) {
  return prisma.chapterNote.upsert({
    where: { userId_chapterSlug: { userId, chapterSlug } },
    create: { userId, chapterSlug, body },
    update: { body },
  });
}
