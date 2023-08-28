const db = require('../util/database');

module.exports = class Histories {
  constructor(tag, realtimeValue, time) {
    this.tag = tag;
    this.realtimeValue = realtimeValue;
    this.time = time; 
  }

  static fetchStat() {
    return db.execute('SELECT * FROM histories');
  }
}