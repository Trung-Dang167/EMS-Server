const express = require('express');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const customizeRoutes = require('./routes/customize');
const dashboardRoutes = require('./routes/dashboard');
const trendRoutes = require('./routes/trend');
const errorController = require('./controllers/error');
const cors = require('cors');
const db = require('./util/database');
const data = require('./models/data');
const histories = require('./models/histories')
const Modbus = require('modbus-serial');
const { fetchAll } = require('./controllers/dashboard');
const { fetchStat } = require('./controllers/trend');

// Kết nối tới Modbus
const MODBUS_TCP_PORT = 502;
const MODBUS_TCP_IP = '192.168.30.28';

const client = new Modbus();
client.connectTCP(MODBUS_TCP_IP, { port: MODBUS_TCP_PORT }, () => {
  console.log('Connected Modbus device.');
});

client.on('error', (err) => {
  console.error('Lỗi kết nối Modbus:', err);
});

// Hàm đọc giá trị từ Modbus và ghi vào cơ sở dữ liệu
async function readAndWriteData() {
  try {
    // Đọc giá trị từ thiết bị Modbus
    const data = await new Promise((resolve, reject) => {
      client.readHoldingRegisters(72, 36, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });

    let floatArray = [];
    for (let i = 0; i < data.data.length - 1; i += 2) {
      const highByte = data.data[i];
      const lowByte = data.data[i + 1];
      const combinedValue = (highByte << 16) | lowByte;
      const buffer = Buffer.alloc(4);
      buffer.writeInt32BE(combinedValue, 0);
      const floatValue = buffer.readFloatBE(0);
      const roundedValue = floatValue.toFixed(2);
      floatArray.push(roundedValue);
    }

    const connection = await db.getConnection();
    for (let i = 0; i < floatArray.length; i++) {
      const floatValue = floatArray[i];
      let tag = '';

      const tagLookup = {
        0: '1HNE10CQ207',
        1: '1HNE10CQ205',
        2: '1HNE10CQ204',
        3: '1HNE10CQ203',
        4: '1HNE10CQ202',
        5: '1HNE10CQ201',
        12: '1HNECQ206',
        13: '1HNECF201',
        14: '1HNECP201',
        15: '1HNECQ002',
        16: 'T-TT0301',
        17: 'T-TT0302'
      };

      if ((i >= 0 && i <= 5) || (i >= 12 && i <= 17)) {
        tag = tagLookup[i];


        const sql1 = `UPDATE data SET realtimeValue = ? WHERE tag = ?`;
        const values1 = [floatValue, tag];

        await connection.query(sql1, values1);

        const insertSql = `INSERT INTO histories (tag, realtimeValue) VALUES (?, ?)`;
        const insertValues = [tag, floatValue];

        await connection.query(insertSql, insertValues);
      }
    }

    connection.release();
  } catch (err) {
    console.error('Error while reading modbus and writing to SQL:', err);
  }
}

const main = express();
const ports = process.env.PORT || 3000;

main.use(bodyParser.json());
main.use(cors());

main.use('/auth', authRoutes);
main.use('/dashboard', dashboardRoutes);
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
  console.log('WebSocket Connected.');

  setInterval(async () => {
    try {
      const [allData] = await data.fetchAll();
      const [allStat] = await histories.fetchStat();
      socket.emit('data', allData);
      socket.emit('stat', allStat);
    } catch (err) {
      console.error('Error while querying data from SQL:', err);
    }
  }, 1000);
});

setInterval(readAndWriteData, 1000);
