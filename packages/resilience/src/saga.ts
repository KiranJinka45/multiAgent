import { logger } from '@packages/observability';

export type SagaStep<T = any> = {
  name: string;
  action: (data: T) => Promise<any>;
  compensate: (data: T) => Promise<void>;
};

export async function runSaga<T>(sagaName: string, steps: SagaStep<T>[], initialData: T) {
  const completed: SagaStep<T>[] = [];
  logger.info(`Starting Saga: ${sagaName}`);

  try {
    for (const step of steps) {
      logger.debug(`Executing Saga Step: ${step.name}`);
      await step.action(initialData);
      completed.push(step);
    }
    logger.info(`Saga completed successfully: ${sagaName}`);
    return true;
  } catch (err: any) {
    logger.error(`Saga failed at step: ${completed.length < steps.length ? steps[completed.length].name : 'Unknown'}, Error: ${err.message}. Initiating compensation...`);
    
    // Compensation phase (reverse order)
    for (const step of completed.reverse()) {
      try {
        logger.debug(`Compensating Saga Step: ${step.name}`);
        await step.compensate(initialData);
      } catch (compErr: any) {
        logger.error(`CRITICAL: Compensation failed for step ${step.name}. Error: ${compErr.message}`);
      }
    }
    throw new Error(`Saga ${sagaName} aborted and compensated due to: ${err.message}`);
  }
}



