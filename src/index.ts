require('dotenv').config();
import initClient from './SocketClient';
import SocketServer from './SocketServer';
import log from './Shared/logger';
interface LaunchEnv {
  MODE: string;
  REACT_APP_SOCKET_IP: string;
  REACT_APP_SOCKET_PORT: string;
}
const {
  MODE,
  REACT_APP_SOCKET_IP,
  REACT_APP_SOCKET_PORT
} = process.env as unknown as LaunchEnv;

if(MODE=='client') {
  log('infoHeader', `Launching Pi in client only mode, looking for server @${REACT_APP_SOCKET_IP}:${REACT_APP_SOCKET_PORT}`)
  initClient();
  //require('./SocketClient');
}else if(MODE=='server') {
  log('infoHeader', `Launching Pi in server only mode @${REACT_APP_SOCKET_IP}:${REACT_APP_SOCKET_PORT}`)
  new SocketServer(REACT_APP_SOCKET_PORT);
}else if(MODE=='both') {
  log('info', `Launching in server and client mode @${REACT_APP_SOCKET_IP}:${REACT_APP_SOCKET_PORT}`)
  initClient()
  new SocketServer(REACT_APP_SOCKET_PORT);
} else {
  console.log('No mode selected exiting check the environment variables...')
}