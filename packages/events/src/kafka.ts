import { Kafka, Producer, Consumer } from 'kafkajs';
import { logger } from '@packages/utils';

export const kafkaConfig = new Kafka({
  clientId: 'multiagent-platform',
  brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
});

class KafkaManager {
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;

  async getProducer(): Promise<Producer> {
    if (!this.producer) {
      this.producer = kafkaConfig.producer();
      await this.producer.connect();
      logger.info('Kafka Producer connected');
    }
    return this.producer;
  }

  async getConsumer(groupId: string): Promise<Consumer> {
    if (!this.consumer) {
      this.consumer = kafkaConfig.consumer({ groupId });
      await this.consumer.connect();
      logger.info(`Kafka Consumer connected for group: ${groupId}`);
    }
    return this.consumer;
  }

  async publish(topic: string, message: any) {
    try {
      const p = await this.getProducer();
      await p.send({
        topic,
        messages: [{ value: JSON.stringify(message) }],
      });
      logger.debug({ topic }, 'Message published to Kafka');
    } catch (err) {
      logger.error({ err, topic }, 'Failed to publish to Kafka');
      throw err;
    }
  }
}

export const kafkaManager = new KafkaManager();
