require('dotenv').config();
import initClient from './SocketClient';
import SocketServer from './SocketServer';
interface LaunchEnv {
  MODE: string;
  SERVER: string;
  SERVER_PORT: string;
}
const {
  MODE,
  SERVER_PORT
} = process.env as unknown as LaunchEnv;

if(MODE=='client') {
  console.log('Launching Pi in client only mode...')
  initClient();
  //require('./SocketClient');
}
if(MODE=='server') {
  console.log('Launching Pi in server only mode...')
  new SocketServer(SERVER_PORT);
}