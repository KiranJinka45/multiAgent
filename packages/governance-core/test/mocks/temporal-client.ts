export class Connection {
  static async connect() {
    throw new Error('Real Temporal connection disabled in mock test env.');
  }
}
export class Client {}
