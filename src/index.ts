import * as dotenv from 'dotenv';
import SocketClient from './SocketClient/SocketClient';
import SocketServer from './SocketServer/SocketServer';
dotenv.config();
interface LaunchEnv {
  MODE: string;
  SERVER: string;
  SERVER_PORT: string;
}
const {
  MODE,
  SERVER,
  SERVER_PORT
} = process.env as unknown as LaunchEnv;

if(MODE=='client') {
  console.log('Launching Pi in client only mode...')
  const Client = new SocketClient(SERVER, SERVER_PORT).initialize();
}
if(MODE=='server') {
  console.log('Launching Pi in server only mode...')
  const Client = new SocketServer(SERVER_PORT);
}