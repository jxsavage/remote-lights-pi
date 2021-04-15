require('dotenv').config();
import SocketServer from './SocketServer';
import log from './Shared/logger';
interface LaunchEnv {
  REACT_APP_SOCKET_IP: string;
  REACT_APP_SOCKET_PORT: string;
}
const {
  REACT_APP_SOCKET_IP,
  REACT_APP_SOCKET_PORT
} = process.env as unknown as LaunchEnv;

log('infoHeader', `Launching Pi in server only mode @${REACT_APP_SOCKET_IP}:${REACT_APP_SOCKET_PORT}`)
SocketServer.listen(REACT_APP_SOCKET_PORT);