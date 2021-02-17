require('dotenv').config();
import initClient from './SocketClient';
import SocketServer from './SocketServer';
interface LaunchEnv {
  MODE: string;
  REACT_APP_SOCKET_PORT: string;
}
const {
  MODE,
  REACT_APP_SOCKET_PORT
} = process.env as unknown as LaunchEnv;

if(MODE=='client') {
  console.log('Launching Pi in client only mode...')
  initClient();
  //require('./SocketClient');
}
if(MODE=='server') {
  console.log('Launching Pi in server only mode...')
  new SocketServer(REACT_APP_SOCKET_PORT);
}