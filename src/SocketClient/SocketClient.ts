require('dotenv').config();
import io from 'socket.io-client';
import SerialPort from 'serialport';
import {MicroController} from '../MicroController/MicroController';
import remoteLights, { RemoteLightsState, initialState, addMicros, AddMicrosStateAction } from '../Shared/reducers/remoteLights';
interface Env {
  PI_NAME: string,
  MICRO_NAMES: string,
}
const {
  PI_NAME,
  MICRO_NAMES
} = process.env as unknown as Env;

export class SocketClient {
  piId: string;
  initialized: boolean;
  state: RemoteLightsState;
  microMap: Map<MicroController["id"], MicroController>;
  serverSocket: SocketIOClient.Socket;
  constructor(serverIp: any, serverPort: any) {
    this.piId = PI_NAME;
    this.initialized = false;
    this.microMap = new Map();
    this.state = initialState;
    this.serverSocket = io.connect(`http://${serverIp}:${serverPort}/server`);
    const {serverSocket} = this;
    // serverSocket.on('reconnect', () => {
    //   serverSocket.emit('initLightClient', Array.from(this.microMap.values()));
    // });
  };
  /**
   * Scans SerialPorts and returns the Teensies based
   * on productId returned.
   * @returns {Promise<SerialPort.PortInfo[]>}
   */
  scanSerial():Promise<SerialPort.PortInfo[]> {
    return new Promise((resolve, reject) => {
      SerialPort.list().then((serialPortList) => {
        const connectedTeensies = serialPortList.filter((portInfo) => {
          return portInfo.productId === '0483';
        });
        resolve(connectedTeensies);
      });
    });
  }
  initializeMicro = (): Promise<MicroController[]> => {
    return new Promise((resolve, reject)=>{
      this.scanSerial().then((portInfoArr) => {
        const names = MICRO_NAMES.split(',');
        const uninitialized = portInfoArr.map((portInfo, i)=>{
          return new MicroController(portInfo, this.piId, this.serverSocket, names[i]);
        });
        Promise.all(uninitialized.map(teensy => teensy.initialize()))
        .then((teensyArr)=>resolve(teensyArr));
      });
    });
  }
  emitMicros = (microIds: any) => {
    this.serverSocket.emit('addMicros', microIds);
  }
  initSocket = (addMicosAction: AddMicrosStateAction) => {
    this.serverSocket.emit('initLightClient', addMicosAction);
  }
  initialize = () => {
    this.initializeMicro().then((microArr)=>{
      microArr.forEach((micro) => {
        this.microMap.set(micro.id, micro);
      });
      const micros = Array.from(this.microMap.values())
      .map(micro => micro.getInfo());
      const addMicrosAction = addMicros({micros});
      this.initSocket(addMicrosAction);
      this.state = remoteLights(this.state, addMicrosAction);
      this.initialized = true;
    });
  }
}
export default SocketClient;