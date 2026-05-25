import cron from 'node-cron';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import prisma from '../config/database.js';

dayjs.extend(customParseFormat);

interface ClassGroup {
  id: string;
  startTime: string | null;
  cutoffTime: string | null;
  classType: string | null;
  selectedDayNumbers: number[];
}

export function scheduleSessionCronForClass(classGroup: ClassGroup): void {
  const startTime = classGroup.startTime || '09:00';
  const [hour, minute] = startTime.split(':').map(Number);
  const cutoffTime = classGroup.cutoffTime || '09:15';

  cron.schedule(
    `${minute} ${hour} * * *`,
    async () => {
      try {
        const today = dayjs().format('YYYY-MM-DD');
        const todayDay = dayjs().day();

        // Check if a session already exists for today
        const existingSession = await prisma.session.findFirst({
          where: { classId: classGroup.id, date: today },
        });
        if (existingSession) {
          console.log(`Session already exists for class ${classGroup.id} on ${today}`);
          return;
        }

        // Use classType, default to "regular" if undefined
        const classType = classGroup.classType || 'regular';
        if (!['regular', 'weekly', 'multi_weekly', 'monthly', 'exam'].includes(classType)) {
          console.warn(
            `Invalid classType '${classType}' for class ${classGroup.id}. Defaulting to 'regular'`
          );
        }

        let shouldCreateSession = false;
        if (classType === 'regular') {
          shouldCreateSession = true;
        } else if (classType === 'multi_weekly') {
          // selectedDayNumbers stored from ConversationSelectedDay
          if (classGroup.selectedDayNumbers.includes(todayDay)) {
            shouldCreateSession = true;
          }
        }

        if (shouldCreateSession) {
          await prisma.session.create({
            data: {
              classId: classGroup.id,
              date: today,
              startTime,
              cutoffTime,
            },
          });
          console.log(`Session created for class ${classGroup.id} on ${today}`);
        } else {
          console.log(
            `No session created for class ${classGroup.id} on ${today} (classType: ${classType}, todayDay: ${todayDay})`
          );
        }
      } catch (error) {
        console.error(`Error generating session for class ${classGroup.id}:`, error);
      }
    },
    { timezone: 'Asia/Dhaka' }
  );
}

export const startCronJobs = async (): Promise<void> => {
  try {
    // Fetch all classrooms
    const classes = await prisma.conversation.findMany({
      where: { groupType: 'classroom' },
      select: {
        id: true,
        startTime: true,
        cutoffTime: true,
        classType: true,
        selectedDays: { select: { day: true } },
        participants: { select: { userId: true } },
      },
    });

    // Create sessions for today if missed (e.g., server was down at startTime)
    for (const classConv of classes) {
      const today = dayjs().format('YYYY-MM-DD');
      const todayDay = dayjs().day();
      const startTime = classConv.startTime || '09:00';
      const cutoffTime = classConv.cutoffTime || '09:15';
      const now = dayjs();
      const start = dayjs(`${today} ${startTime}`, 'YYYY-MM-DD HH:mm');

      if (now.isAfter(start)) {
        const existingSession = await prisma.session.findFirst({
          where: { classId: classConv.id, date: today },
        });
        if (!existingSession) {
          const classType = classConv.classType || 'regular';

          let shouldCreateSession = false;
          if (classType === 'regular') {
            shouldCreateSession = true;
          } else if (classType === 'multi_weekly') {
            const selectedDayNumbers = classConv.selectedDays.map((d: { day: number }) => d.day);
            if (selectedDayNumbers.includes(todayDay)) {
              shouldCreateSession = true;
            }
          }

          if (shouldCreateSession) {
            await prisma.session.create({
              data: {
                classId: classConv.id,
                date: today,
                startTime,
                cutoffTime,
              },
            });
            console.log(`Created missed session for class ${classConv.id} on ${today}`);
          }
        }
      }
    }

    // Schedule cron jobs for all classes
    for (const classConv of classes) {
      if (classConv) {
        const classGroup: ClassGroup = {
          id: classConv.id,
          startTime: classConv.startTime,
          cutoffTime: classConv.cutoffTime,
          classType: classConv.classType,
          selectedDayNumbers: classConv.selectedDays.map((d: { day: number }) => d.day),
        };
        scheduleSessionCronForClass(classGroup);
      }
    }

    // Schedule absent marking based on a dynamic check interval
    const checkInterval = 15; // Default to 15 minutes
    cron.schedule(
      `*/${checkInterval} * * * *`,
      async () => {
        try {
          const now = dayjs();
          const todayStr = now.format('YYYY-MM-DD');

          const sessions = await prisma.session.findMany({
            where: {
              status: 'scheduled',
              date: todayStr,
            },
          });

          for (const sess of sessions) {
            const classConv = await prisma.conversation.findUnique({
              where: { id: sess.classId },
              select: {
                id: true,
                groupType: true,
                startTime: true,
                cutoffTime: true,
                participants: { select: { userId: true } },
              },
            });

            if (!classConv || classConv.groupType !== 'classroom') {
              console.error(
                `Invalid classGroup or participants for session ${sess.id}. ClassId: ${sess.classId}`
              );
              continue;
            }

            const startTime = classConv.startTime || '09:00';
            const cutoffTime = classConv.cutoffTime || '09:15';
            const start = dayjs(`${sess.date} ${startTime}`, 'YYYY-MM-DD HH:mm');
            const cutoff = dayjs(`${sess.date} ${cutoffTime}`, 'YYYY-MM-DD HH:mm');

            if (now.isAfter(cutoff)) {
              const participantIds = classConv.participants.map((p) => p.userId);

              const existingLogs = await prisma.attendanceLog.findMany({
                where: { sessionId: sess.id },
                select: { userId: true, enteredAt: true, status: true },
              });

              const attendedUserIds = existingLogs.map((log) => log.userId);
              const absentUserIds = participantIds.filter((uid) => !attendedUserIds.includes(uid));

              if (absentUserIds.length > 0) {
                await prisma.attendanceLog.createMany({
                  data: absentUserIds.map((userId) => ({
                    sessionId: sess.id,
                    classId: sess.classId,
                    userId,
                    sessionDate: sess.date,
                    status: 'absent',
                  })),
                  skipDuplicates: true,
                });
                console.log(`Marked ${absentUserIds.length} absent students for session ${sess.id}`);
              }

              await prisma.session.update({
                where: { id: sess.id },
                data: { status: 'completed' },
              });
              console.log(`Session ${sess.id} marked as completed`);
            } else if (now.isAfter(start) && now.isBefore(cutoff)) {
              const existingLogs = await prisma.attendanceLog.findMany({
                where: {
                  sessionId: sess.id,
                  enteredAt: { not: null },
                },
                select: { id: true, userId: true, enteredAt: true, status: true },
              });

              for (const log of existingLogs) {
                if (log.enteredAt) {
                  const entered = dayjs(log.enteredAt);
                  if (entered.isAfter(start) && entered.isBefore(cutoff) && log.status !== 'late') {
                    await prisma.attendanceLog.update({
                      where: { id: log.id },
                      data: { status: 'late' },
                    });
                    console.log(`Marked user ${log.userId} as late for session ${sess.id}`);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Error in absent marking cron job:', error);
        }
      },
      { timezone: 'Asia/Dhaka' }
    );

    console.log('Cron jobs started successfully');
  } catch (error) {
    console.error('Error initializing cron jobs:', error);
  }
};
