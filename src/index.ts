import * as dotenv from 'dotenv';
import SocketServer from 'SocketServer';
import log from 'Shared/logger';
import path from 'path';

dotenv.config();


interface LaunchEnv {
  REACT_APP_SOCKET_IP: string;
  REACT_APP_SOCKET_PORT: string;
  NODE_ENV: string;
}
const {
  NODE_ENV
} = process.env as unknown as LaunchEnv;
let nodeEnv: string;
if(NODE_ENV === 'development' || NODE_ENV === 'production') {
  nodeEnv = NODE_ENV
} else {
  nodeEnv = 'development';
}
dotenv.config({
  path: path.resolve(process.cwd(), `.env.${nodeEnv}`),
})
const {
  REACT_APP_SOCKET_IP,
  REACT_APP_SOCKET_PORT,
} = process.env as unknown as LaunchEnv;
log('infoHeader', `Launching Pi Socket Server in ${nodeEnv} @${REACT_APP_SOCKET_IP}:${REACT_APP_SOCKET_PORT}`);

SocketServer.listen(REACT_APP_SOCKET_PORT);