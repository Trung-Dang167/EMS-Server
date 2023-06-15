const Modbus = require('modbus-serial');
const express = require('express');
const WebSocket = require('ws');
const mysql = require('mysql');
const bodyParser = require('body-parser')


const main = express();
const port = 3000;

main.use(bodyParser.json())

main.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin','*')
  res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT DELETE')
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization')
  next()
})

// Kết nối tới cơ sở dữ liệu MySQL
// const db = mysql.createConnection({
//   host: 'localhost',
//   user: 'admin',
//   password: 'Admin@123',
//   database: 'DB_CEM'
// });

// db.connect((err) => {
//   if (err){
//     console.error('Lỗi kết nối cơ sở dữ liệu', err);
//   } else {
//     console.log("Đã kết nối thành công đến cơ sở dữ liệu MySQL.");
//   }
// });

// // Khởi tạo máy chủ WebSocket
// const wss = new WebSocket.Server({ noServer: true });

// wss.on('connection', (ws) => {
//   console.log('Đã kết nối WebSocket');

//   // Gửi dữ liệu từ thiết bị Modbus tới trình duyệt web mỗi giây
//   const interval = setInterval(() => {
//     client.readHoldingRegisters(72, 20, (err, data) => {
//       //Xử lý dữ liệu đọc từ thiết bị Modbus
//       if (err) {
//         console.error('Lỗi khi đọc dữ liệu từ thiết bị Modbus:', err);
//       } else {
//         const floatArray = [];
//         for (let i = 0; i < data.data.length - 1; i += 2) {
//           const highByte = data.data[i];
//           const lowByte = data.data[i + 1];
//           const combinedValue = (highByte << 16) | lowByte;
//           const buffer = Buffer.alloc(4);
//           buffer.writeInt32BE(combinedValue, 0);
//           const floatValue = buffer.readFloatBE(0);
//           const roundedValue = floatValue.toFixed(2);
//           floatArray.push(roundedValue);
//         }

//         // Gắn giá trị thời gian thực vào mỗi giá trị Modbus
//         const currentTime = new Date();
//         const timestamp = currentTime.toISOString().slice(0, 19).replace('T', ' ');
//         const modbusDataWithTimestamp = floatArray.map((value) =>{
//           return {
//             timestamp: timestamp,
//             value: value
//           };
//         });

//         // Lưu dữ liệu vào cơ sở dữ liệu MySQL
//         const query = 'INSERT INTO sensor_data (timestamp, value) VALUES ?';
//         const values = modbusDataWithTimestamp.map((data) => [data.timestamp, data.value]);
//         db.query(query, [values], (err, result) => {
//           if (err) {
//             console.error('Lỗi khi lưu dữ liệu vào cơ sở dữ liệu:', err);
//           } else {
//             console.log('Đã lưu dữ liệu vào cơ sở dữ liệu MySQL.');
//           }
//         });

//         // Gửi dữ liệu tới trình duyệt web qua WebSocket
//         ws.send(JSON.stringify(floatArray));
//       }
//     });
//   }, 1000);

//   ws.on('close', () => {
//     console.log('Đã ngắt kết nối WebSocket');
//     clearInterval(interval);
//   });
// });

// main.get('/', (req, res) => {
//   res.sendFile(__dirname + '/src/index.html');
// });

main.listen(port,() => console.log(`Listening on port ${port}`))

// // Kết nối tới thiết bị Modbus
// const client = new Modbus();
// const MODBUS_TCP_PORT = 502;
// const MODBUS_TCP_IP = '192.168.30.35';

// client.connectTCP(MODBUS_TCP_IP, { port: MODBUS_TCP_PORT }, () => {
//   console.log('Kết nối thành công đến thiết bị Modbus.');

//   server.on('upgrade', (request, socket, head) => {
//     wss.handleUpgrade(request, socket, head, (ws) => {
//       wss.emit('connection', ws, request);
//     });
//   });
// });

// client.on('error', (err) => {
//   console.error('Lỗi kết nối Modbus:', err);
// });