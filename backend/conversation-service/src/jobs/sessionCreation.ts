import cron from 'node-cron';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import prisma from '../config/database.js';
import pino from 'pino';

dayjs.extend(customParseFormat);
const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

interface ClassGroup {
  id: string;
  startTime: string | null;
  cutoffTime: string | null;
  classType: string | null;
  selectedDayNumbers: number[];
}

/** Schedule a session-creation cron for a single class */
export function scheduleSessionCronForClass(classGroup: ClassGroup): void {
  const startTime = classGroup.startTime || '09:00';
  const [hour, minute] = startTime.split(':').map(Number);

  cron.schedule(`${minute} ${hour} * * *`, async () => {
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const todayDay = dayjs().day();

      const existing = await prisma.session.findFirst({
        where: { classId: classGroup.id, date: today },
      });
      if (existing) return;

      const classType = classGroup.classType || 'regular';
      let shouldCreate = false;

      if (classType === 'regular') {
        shouldCreate = true;
      } else if (classType === 'multi_weekly') {
        shouldCreate = classGroup.selectedDayNumbers.includes(todayDay);
      }

      if (shouldCreate) {
        await prisma.session.create({
          data: {
            classId: classGroup.id,
            date: today,
            startTime,
            cutoffTime: classGroup.cutoffTime,
            type: 'auto',
            status: 'scheduled',
          },
        });
        logger.info({ classId: classGroup.id, date: today }, 'Session created');
      }
    } catch (err) {
      logger.error({ err, classId: classGroup.id }, 'Session creation job failed');
    }
  });
}

/** On startup: load all classroom conversations and register their crons */
export const startSessionCreationScheduler = async (): Promise<void> => {
  try {
    const classes = await prisma.conversation.findMany({
      where: { groupType: 'classroom' },
      include: { selectedDays: true },
    });

    // Fetch class profiles separately — table may not exist in all environments
    let profileMap: Record<string, any> = {};
    try {
      const profiles = await prisma.classProfile.findMany({
        where: { conversationId: { in: classes.map((c) => c.id) } },
      });
      for (const p of profiles) profileMap[p.conversationId] = p;
    } catch {
      logger.warn('class_profiles table not available; sessions will use defaults');
    }

    for (const cls of classes) {
      const profile = profileMap[cls.id];
      scheduleSessionCronForClass({
        id: cls.id,
        startTime: profile?.startTime ?? null,
        cutoffTime: profile?.cutoffTime ?? null,
        classType: profile?.classType ?? null,
        selectedDayNumbers: cls.selectedDays.map((d) => d.day),
      });
    }

    logger.info({ count: classes.length }, 'Session creation crons registered');
  } catch (err) {
    logger.error({ err }, 'Failed to start session creation scheduler');
  }
};
