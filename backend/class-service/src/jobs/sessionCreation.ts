import cron from 'node-cron';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import prisma from '../config/database.js';
import pino from 'pino';

dayjs.extend(customParseFormat);
const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

interface ClassGroup {
  id: string;
  startTime: string;
  cutoffTime: string;
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
            endTime: classGroup.cutoffTime,
            isActive: true,
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

    for (const cls of classes) {
      scheduleSessionCronForClass({
        id: cls.id,
        startTime: cls.startTime,
        cutoffTime: cls.cutoffTime,
        classType: cls.classType,
        selectedDayNumbers: cls.selectedDays.map((d) => d.day),
      });
    }

    logger.info({ count: classes.length }, 'Session creation crons registered');
  } catch (err) {
    logger.error({ err }, 'Failed to start session creation scheduler');
  }
};
