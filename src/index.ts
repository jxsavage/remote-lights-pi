require('dotenv').config()
import {MicroController} from './MicroController/MicroController';
import {SocketClient} from './SocketClient/SocketClient';
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