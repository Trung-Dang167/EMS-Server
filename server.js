const express = require('express');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const customizeRoutes = require('./routes/customize');
const dashboardRoutes = require('./routes/dashboardRoutes');
const errorController = require('./controllers/error');
const cors = require('cors');
const db = require('./util/database');
const data = require('./models/data');
const Modbus = require('modbus-serial');

//Define for connection Modbus_Dlogger
const MODBUS_TCP_PORT = 502;
const MODBUS_TCP_IP = '192.168.30.24';
const registerData = 72;
const registerStatus = 154;
const numberofRegister = 24;//số thanh ghi luôn chẵn
const socketEmitInterval = 1000;//milliseconds
let isModbusConnected = false;

//Define a map of indices to tags
const tagMap = {
  0: '1HNE10CF201',
  1: '1HNE10CT201',
  2: '1HNE10CP201',
  3: '1HNE10CQ206',
  4: 'T-TT0301',
  5: 'T-TT0302',
  6: '1HNE10CQ207',
  7: '1HNE10CQ205',
  8: '1HNE10CQ204',
  9: '1HNE10CQ203',
  10: '1HNE10CQ202',
  11: '1HNE10CQ201',
}

const client = new Modbus();

function connectModbus(){
  client.connectTCP(MODBUS_TCP_IP, { port: MODBUS_TCP_PORT }, async() => {
    console.log('Connected Modbus device.');
    isModbusConnected = true;
  });
}

async function initializeData(){
  const initialData = [
    {tag: '1HNE10CQ207', name: 'Flue gas H20', expectedValue: '10.0', unit: 'vol', designP: 'at stack', upperbound: '33', lowerbound: '0', status: 'Normal'},
    {tag: '1HNE10CQ205', name: 'Flue gas HCl', expectedValue: '100.0', unit: 'mg/Nm3', designP: 'at stack', upperbound: '200', lowerbound: '0', status: 'Normal' },
    {tag: '1HNE10CQ204', name: 'Flue gas SO2', expectedValue: '250.0', unit: 'mg/Nm3', designP: 'at stack', upperbound: '500', lowerbound: '0', status: 'Normal' },
    {tag: '1HNE10CQ203', name: 'Flue gas NOx', expectedValue: '400.0', unit: 'mg/Nm3', designP: 'at stack', upperbound: '800', lowerbound: '0', status: 'Normal' },
    {tag: '1HNE10CQ202', name: 'Flue gas CO', expectedValue: '350.0', unit: 'mg/Nm3', designP: 'at stack', upperbound: '700', lowerbound: '0', status: 'Normal' },
    {tag: '1HNE10CQ201', name: 'Flue gas O2', expectedValue: '11.0', unit: 'mg/Nm3', designP: 'at stack', upperbound: '21', lowerbound: '0', status: 'Normal' },
    {tag: '1HNE10CF201', name: 'Stack Flow', expectedValue: '13.0', unit: 'Nm3/s', designP: 'at stack', upperbound: '27', lowerbound: '0', status: 'Normal' },
    {tag: '1HNE10CT201', name: 'Stack Temperature', expectedValue: '100.0', unit: 'oC', designP: 'at stack', upperbound: '200', lowerbound: '0', status: 'Normal' },
    {tag: '1HNE10CP201', name: 'Stack Pressure', expectedValue: '500.0', unit: 'Pa', designP: 'at stack', upperbound: '1000', lowerbound: '-500', status: 'Normal' },
    {tag: '1HNE10CQ206', name: 'Stack Dust', expectedValue: '150.0', unit: 'mg/Nm3', designP: 'at stack', upperbound: '300', lowerbound: '0', status: 'Normal' },
    {tag: 'T-TT0301', name: 'Temp. Furnace 301', expectedValue: '100.0', unit: 'oC', designP: 'at stack', upperbound: '200', lowerbound: '0', status: 'Normal' },
    {tag: 'T-TT0302', name: 'Temp. Furnace 302', expectedValue: '100.0', unit: 'oC', designP: 'at stack', upperbound: '200', lowerbound: '0', status: 'Normal' },
  ];
  const connection = await db.getConnection();
  try {
    for (const rowData of initialData){
      const sql = 'INSERT IGNORE INTO data (tag, name, expectedValue, realtimeValue, unit, designP, upperbound, lowerbound, status) VALUES (?,?,?,?,?,?,?,?,?)';
      const values = [rowData.tag, rowData.name, rowData.expectedValue, 0, rowData.unit, rowData.designP, rowData.upperbound, rowData.lowerbound, rowData.status];

      await connection.query(sql, values);
    }
    console.log('Initial data inserted.');
  } catch (error){
    console.error('Error inserting initial data:', error);
  } finally {
    connection.release();
  }  
}

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

// Read Modbus data and status then update to database
async function readAndWriteData() {
  try {
    let statusValues = [];
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

    let floatArrayStatus = [];
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
      const floatData = floatArrayData[i];
      const statusText = statusArrayText[i];
      const tag = tagMap[i];
      const sql = `UPDATE data SET realtimeValue = ?, status = ?, time = NOW() WHERE tag = ?`;
      const values = [floatData, statusText, tag];
      await connection.query(sql, values);
    }
    
    // Thêm dữ liệu vào bảng histories
    const insertSql = `
      INSERT INTO histories
      (value1, status1, value2, status2, value3, status3, value4, status4, value5, status5, value6, status6,
      value7, status7, value8, status8, value9, status9, value10, status10, value11, status11, value12, status12)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const insertValues = [
      floatArrayData[0], statusArrayText[0], floatArrayData[1], statusArrayText[1],
      floatArrayData[2], statusArrayText[2], floatArrayData[3], statusArrayText[3],
      floatArrayData[4], statusArrayText[4], floatArrayData[5], statusArrayText[5],
      floatArrayData[6], statusArrayText[6], floatArrayData[7], statusArrayText[7],
      floatArrayData[8], statusArrayText[8], floatArrayData[9], statusArrayText[9],
      floatArrayData[10], statusArrayText[10], floatArrayData[11], statusArrayText[11]
    ];
    await connection.query(insertSql, insertValues);

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
main.use('/customize', customizeRoutes);
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
  console.log('WebSocket Connected.');

  setInterval(async () => {
    try {
      const [allData] = await data.fetchAll();
      socket.emit('data', allData);
      // console.log('Giá trị gửi đi WebSocket:', allData);
    } catch (err) {
      console.error('Error while querying data from SQL:', err);
    }
  }, socketEmitInterval);
});
connectModbus();
initializeData();
setInterval(readAndWriteData, socketEmitInterval);
