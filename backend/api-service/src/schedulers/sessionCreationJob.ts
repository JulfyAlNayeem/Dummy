import cron from 'node-cron';

interface ClassGroup {
  id: string;
  startTime: string | null;
  cutoffTime: string | null;
  classType: string | null;
  selectedDayNumbers: number[];
}

// Class session orchestration has moved to conversation-service.
export function scheduleSessionCronForClass(_classGroup: ClassGroup): void {
  // no-op compatibility shim
}

// Class session orchestration has moved to conversation-service.
export const startCronJobs = async (): Promise<void> => {
  // no-op compatibility shim
};

export default {
  scheduleSessionCronForClass,
  startCronJobs,
};
