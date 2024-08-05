const express = require('express');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const customizeRoutes = require('./routes/customize');
const dashboardRoutes = require('./routes/dashboard');
const alarmRoutes = require('./routes/alarm');
const trendRoutes = require('./routes/trend');
const errorController = require('./controllers/error');
const cors = require('cors');
const db = require('./util/database');
const data = require('./models/data');
const Modbus = require('modbus-serial');

//Define for connection Modbus_Dlogger
const MODBUS_TCP_PORT = 502;
const MODBUS_TCP_IP = '192.168.6.231';
const registerData = 72;
const registerStatus = 154;
const numberofRegister = 24;//số thanh ghi luôn chẵn
const socketEmitInterval = 3000;//milliseconds
const intervalHistories = 10000;
let isModbusConnected = false;

//Define a map of indices to tags
const tagMap = {
  0: '1HNE10CF201',
  1: '1HNE10CT201',
  2: '1HNE10CP201',
  3: '1HNE10CQ206',
  4: '1HNE10CQ205',
  5: '',
  6: '',
  7: '1HNE10CQ204',
  8: '1HNE10CQ207',
  9: '1HNE10CQ202',
  10: '1HNE10CQ201',
  11: '1HNE10CQ203',
}

const client = new Modbus();

function connectModbus(){
  client.connectTCP(MODBUS_TCP_IP, { port: MODBUS_TCP_PORT }, async() => {
    console.log('Connected Modbus device.');
    isModbusConnected = true;
  });
}

// async function initializeData(){
//   const initialData = [
//     {tag: '1HNE10CQ207', name: 'H20',         unit: 'vol',    status: 'Normal', maxValue:'33', minValue:'0', alarmValue:'28', alarmStatus: 'Normal', order: 1 },
//     {tag: '1HNE10CQ205', name: 'HCl',         unit: 'mg/Nm3', status: 'Normal', maxValue:'200', minValue:'0', alarmValue:'180', alarmStatus: 'Normal', order: 2 },
//     {tag: '1HNE10CQ204', name: 'SO2',         unit: 'mg/Nm3', status: 'Normal', maxValue:'500', minValue:'0',  alarmValue:'400', alarmStatus: 'Normal', order: 3 },
//     {tag: '1HNE10CQ203', name: 'NOx',         unit: 'mg/Nm3', status: 'Normal', maxValue:'800', minValue:'0',  alarmValue:'700', alarmStatus: 'Normal', order: 4 },
//     {tag: '1HNE10CQ202', name: 'CO',          unit: 'mg/Nm3', status: 'Normal', maxValue:'700', minValue:'0',  alarmValue:'600', alarmStatus: 'Normal', order: 5 },
//     {tag: '1HNE10CQ201', name: 'O2',          unit: 'vol',    status: 'Normal', maxValue:'21', minValue:'0',  alarmValue:'20', alarmStatus: 'Normal', order: 6 },
//     {tag: '1HNE10CF201', name: 'Flow',        unit: 'Nm3/s',  status: 'Normal', maxValue:'27', minValue:'0',  alarmValue:'20', alarmStatus: 'Normal', order: 7 },
//     {tag: '1HNE10CT201', name: 'Temperature', unit: 'oC',     status: 'Normal', maxValue:'200', minValue:'0',  alarmValue:'180', alarmStatus: 'Normal', order: 8 },
//     {tag: '1HNE10CP201', name: 'Pressure',    unit: 'Pa',     status: 'Normal', maxValue:'1000', minValue:'-500',  alarmValue:'800', alarmStatus: 'Normal', order: 9 },
//     {tag: '1HNE10CQ206', name: 'Dust',        unit: 'mg/Nm3', status: 'Normal', maxValue:'300', minValue:'0',  alarmValue:'250', alarmStatus: 'Normal', order: 10 },
//   ];
//   const connection = await db.getConnection();
//   try {
//     for (const rowData of initialData){
//       const sql = 'INSERT IGNORE INTO data (tag, name, realtimeValue, unit, time, status, minValue, alarmValue, alarmStatus, order) VALUES (?,?,?,?,?,?,?,?,?,?)';
//       const values = [rowData.tag, rowData.name, 0, rowData.unit, 0, rowData.status, rowData.minValue, rowData.alarmValue, rowData.alarmStatus, rowData.order];

//       await connection.query(sql, values);
//     }
//     console.log('Initial data inserted.');
//   } catch (error){
//     console.error('Error inserting initial data:', error);
//   } finally {
//     connection.release();
//   }  
// }

function getStatusText(floatStatus) {
  if (floatStatus == 0) {
    return 'Normal';
  } else if (floatStatus == 1) {
    return 'Calib';
  } else if (floatStatus >= 2) {
    return 'Error';
  } else {
    return 'Unknown';
  }
}

async function updateAlarmStatusText(tag, floatArrayData){
  try {
    const [alarmValueObj] = await data.fetchAlamrValue(tag);
    // console.log(alarmValueObj);
    const alarmValue = parseFloat(alarmValueObj[0].alarmValue);
    if (isNaN(alarmValue)) {
      console.error(`Giá trị alarm cho tag ${tag} không hợp lệ: ${alarmValueObj[0].alarmValue}`);
      return 'Error';
    }
    if (floatArrayData >= alarmValue) {
      // console.log(`Giá trị của tag ${tag}; Alarm Value: ${alarmValue}; Data: ${floatArrayData}; High`);
      return 'High';
    } else {
      // console.log(`Giá trị của tag ${tag}; Alarm Value: ${alarmValue}; Data: ${floatArrayData}; Normal`);
      return 'Normal';
    }
  } catch(err) {
    console.error("Lỗi trong quá trình đọc giá trị alarm", err);
    return 'Error';
  }
}

// Read Modbus data and status then update to database
async function readAndWriteData() {
  try {
    // Read measured value: Value register
    const data = await new Promise((resolve, reject) => {
      client.readHoldingRegisters(registerData, numberofRegister, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });

    // Read measured status: Status register
    const status = await new Promise((resolve, reject) => {
      client.readHoldingRegisters(registerStatus, numberofRegister, (err, status) => {
        if (err) {
          reject(err);
        } else {
          resolve(status);
        }
      });
    });

    let floatArrayData = [];
    for (let i = 0; i < numberofRegister - 1; i += 2) {
      const highByteData = data.data[i];
      const lowByteData = data.data[i + 1];
      const combinedValueData = (highByteData << 16) | lowByteData;
      const bufferData = Buffer.alloc(4);
      bufferData.writeInt32BE(combinedValueData, 0);
      const floatValueData = bufferData.readFloatBE(0);
      const roundedValueData = floatValueData.toFixed(2);
      floatArrayData.push(roundedValueData);
    }

    // console.log("floatdata read",floatArrayData);
    const floatArrayStatus = [];
    for (let i = 0; i < numberofRegister - 1; i += 2) {
      const highByteStatus = status.data[i];
      const lowByteStatus = status.data[i + 1];
      const combinedValueStatus = (highByteStatus << 16) | lowByteStatus;
      const bufferStatus = Buffer.alloc(4);
      bufferStatus.writeInt32BE(combinedValueStatus, 0);
      const floatValueStatus = bufferStatus.readFloatBE(0);
      const roundedValueStatus = floatValueStatus.toFixed(2);
      floatArrayStatus.push(roundedValueStatus);
    }

    let statusArrayText = [];
    for (let i = 0; i < numberofRegister /2; i++){
      statusArrayText[i] =  getStatusText(floatArrayStatus[i]);
    }
    // console.log('Status: ', statusArrayText);

    //Update data to SQL database: 'data' 
    const connection = await db.getConnection();
    for (let i = 0; i < numberofRegister /2; i++) {
      if (i === 5 || i === 6) {
        continue; // Bỏ qua các lần lặp với i = 5 và i = 6
      }
      const floatData = floatArrayData[i];
      const statusText = statusArrayText[i];
      const tag = tagMap[i];
      const alarmText = await updateAlarmStatusText(tag, floatData);
      // console.log(`Giá trị alarm cho tag ${tag}:`,alarmText);
      const sql = `UPDATE data SET realtimeValue = ?, status = ?, alarmStatus = ?, time = NOW() WHERE tag = ?`;
      const values = [floatData, statusText, alarmText, tag];
      await connection.query(sql, values);
    }

    connection.release();
  } catch (err) {
    console.error('Error while reading modbus and writing to SQL:', err);
    isModbusConnected = false;
    connectModbus();
  }
}

const main = express();
const ports = process.env.PORT || 3000;

main.use(bodyParser.json());
main.use(cors());
main.use('/auth', authRoutes);
main.use('/dashboard', dashboardRoutes);
main.use('/alarm', alarmRoutes);
main.use('/customize', customizeRoutes);
main.use('/trend', trendRoutes);
main.use(errorController.get404);
main.use(errorController.get500);

const server = main.listen(ports, () => {
  console.log(`Server running on:  http://localhost:${ports}`);
});

const io = socketIo(server, {
  cors: {
    origin: '*', // Allow requests from any origin (change this to restrict access if needed)
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
});

io.on('connection', (socket) => {
  console.log('WebSocket Connected Server.');
  setInterval(async () => {
    try {
      const [dataResults] = await data.fetchData();
      socket.emit('data', dataResults);
      //  console.log('Giá trị gửi đi WebSocket:', dataResults);
    } catch (err) {
      console.error('Error while querying data from SQL:', err);
    }
  }, socketEmitInterval);

  setInterval(async () => {
    try {
      const [alarmResults] = await data.fetchAlarm();
      socket.emit('alarm', alarmResults);
    } catch (err) {
      console.error('Error while querying alarm from SQL:', err);
    }
  }, socketEmitInterval);

});
connectModbus();
// initializeData();
setInterval(readAndWriteData, socketEmitInterval);
