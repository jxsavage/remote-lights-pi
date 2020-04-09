require('dotenv').config();
import io from 'socket.io-client';
import SerialPort from 'serialport';
import {MicroController} from '../MicroController/MicroController';
import remoteLights, { RemoteLightsState, initialState, addMicros, AddMicrosStateAction, StateActions, StateMicroAction, StateMicroActions } from '../Shared/reducers/remoteLights';
interface Env {
  PI_NAME: string,
  MICRO_NAMES: string,
}
const {
  PI_NAME,
  MICRO_NAMES
} = process.env as unknown as Env;
const {
  MERGE, SPLIT, RESET_MICRO, SET_EFFECT, SET_BRIGHTNESS, RESIZE_FROM_BOUNDARIES,
} = StateMicroAction;
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
    serverSocket.on('reInitAppState', this.reInitAppState);
    // serverSocket.on('reconnect', () => {
    //   serverSocket.emit('initLightClient', Array.from(this.microMap.values()));
    // });
  };
  handleStateAction = (stateAction: StateActions) => {
    this.state = remoteLights(this.state, stateAction);
    switch (stateAction.type) {
      case SPLIT:
        this.microMap.get(stateAction.payload.microId)?.
        splitSegment(stateAction.payload.payload); break;
      case MERGE:
        this.microMap.get(stateAction.payload.microId)?.
        mergeSegments(stateAction.payload.payload); break;
      case SET_EFFECT:
        this.microMap.get(stateAction.payload.microId)?.
        setSegmentEffect(stateAction.payload.payload); break;
      case SET_BRIGHTNESS:
        this.microMap.get(stateAction.payload.microId)?.
        setBrightness(stateAction.payload.payload); break;
      case RESIZE_FROM_BOUNDARIES:
        this.microMap.get(stateAction.payload.microId)?.
        resizeSegmentsFromBoundaries(stateAction.payload.payload); break;
      case RESET_MICRO:
        this.microMap.get(stateAction.payload.microId)?.
        resetMicro(stateAction.payload.payload); break;
    }
  }
  reInitAppState = () => {
    const {allMicroIds, byMicroId} = this.state;
    const micros = allMicroIds.map(microId => byMicroId[microId]);
    const addMicrosAction = addMicros({micros});
    this.initSocket(addMicrosAction);
  }
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
      this.handleStateAction(addMicrosAction);
      this.initialized = true;
    });
  }
}
export default SocketClient;