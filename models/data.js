const db = require('../util/database');

module.exports = class Data {
  constructor(tag, name, expectedValue, realtimeValue, unit, designP, upperbound, lowerbound) {
    this.name = name;
    this.tag = tag;
    this.realtimeValue = realtimeValue;
    this.expectedValue = expectedValue;
    this.unit = unit;
    this.designP = designP;
    this.upperbound = upperbound;
    this.lowerbound = lowerbound;
  }

  static fetchAll() {
    return db.execute('SELECT * FROM data');
  }

  static updateExpectedValue(tag, expectedValue) {
    return db.execute('UPDATE data SET expectedValue = ? WHERE tag = ?', [expectedValue, tag]);
  }

  static updateBounds(tag, upperbound, lowerbound) {
    return db.execute('UPDATE data SET upperbound = ?, lowerbound = ? WHERE tag = ?', [upperbound, lowerbound, tag]);
  }
  
};
