const db = require('../util/database');

module.exports = class Data {
  constructor(tag, name, realtimeValue, unit, status, maxValue, alarmValue, alarmStatus) {
    this.name = name;
    this.tag = tag;
    this.realtimeValue = realtimeValue;
    this.unit = unit;
    this.status = status;
    this.maxValue = maxValue;
    this.alarmValue = alarmValue;
    this.alarmStatus = alarmStatus;
  }

  static fetchData() {
    return db.execute('SELECT * FROM data');
  }

  static fetchAlarm(){
    return db.execute('SELECT * FROM alarm ORDER BY time DESC');
  }

  static fetchHistories() {
    return db.execute('SELECT * FROM histories');
  }

  static fetchAlamrValue(tag){
    return db.execute('SELECT alarmValue FROM data WHERE tag = ?',[tag]);
  }

  static updateAlarmValue(tag, alarmValue) {
    return db.execute('UPDATE data SET alarmValue = ? WHERE tag = ?', [alarmValue, tag]);
  }

};
