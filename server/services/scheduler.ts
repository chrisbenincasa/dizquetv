import schedule from 'node-schedule';
import { ServerContext } from '../serverContext.js';
import { Task, TaskId } from '../tasks/task.js';
import { UpdateXmlTvTask } from '../tasks/updateXmlTvTask.js';
import createLogger from '../logger.js';

const logger = createLogger(import.meta);

type TaskFactoryFn<Data> = () => Task<Data>;

class ScheduledTask<Data> {
  private factory: TaskFactoryFn<Data>;
  private scheduledJob: schedule.Job;
  private _running: boolean = false;
  private schedule: string;
  public lastExecution?: Date;

  constructor(
    jobName: string,
    cronSchedule: string,
    taskFactory: TaskFactoryFn<Data>,
  ) {
    this.schedule = cronSchedule;
    this.factory = taskFactory;
    this.scheduledJob = schedule.scheduleJob(jobName, cronSchedule, () =>
      this.jobInternal(),
    );
  }

  running() {
    return this._running;
  }

  // Runs an instance of this task now, cancels the next invocation
  // and reschedules the job on the original schedule.
  // If background=true, this function will not return the underlying
  // Promise generated by the running job and all errors will be swallowed.
  async runNow(background: boolean = true) {
    this.scheduledJob.cancelNext(false);
    const rescheduleCb = () => this.scheduledJob.reschedule(this.schedule);
    if (background) {
      await this.jobInternal().finally(rescheduleCb);
      return;
    } else {
      return this.jobInternal(true).finally(rescheduleCb);
    }
  }

  cancel() {
    this.scheduledJob.cancel();
  }

  nextExecution() {
    return this.scheduledJob.nextInvocation();
  }

  private async jobInternal(rethrow: boolean = false) {
    this._running = true;
    const instance = this.factory();
    try {
      return await instance.run();
    } catch (e) {
      logger.error('Error while running job: %s; %O', instance.name, e);
      if (rethrow) throw e;
      return;
    } finally {
      this._running = false;
      this.lastExecution = new Date();
    }
  }
}

export const scheduledJobsById: Partial<
  Record<TaskId, ScheduledTask<unknown>>
> = {};

export const scheduleJobs = (serverContext: ServerContext) => {
  const xmlTvSettings = serverContext.dbAccess.xmlTvSettings();

  scheduledJobsById[UpdateXmlTvTask.ID] = new ScheduledTask(
    UpdateXmlTvTask.name,
    hoursCrontab(xmlTvSettings.refreshHours),
    () => UpdateXmlTvTask.create(serverContext),
  );
};

function hoursCrontab(hours: number): string {
  return `0 0 0/${hours} * * *`;
}
