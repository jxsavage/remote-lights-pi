import io from 'socket.io';
import { WebMicroInfo } from '../Shared/MicroTypes';
import remoteLights, {RemoteLightsState, resetState, AddMicrosStateAction, addMicros, StateActions} from '../Shared/reducers/remoteLights';
const initialState = {
  allMicroIds: [],
  byMicroId: {}
};
/**
 * @property {string[]} micros
 */
class PiServer {
  server: SocketIO.Server;
  micros: WebMicroInfo[];
  state: RemoteLightsState;
  webClients: Map<any, any>;
  constructor(port: string) {
    this.server = io(port);
    this.micros = [];
    this.state = initialState;
    this.webClients = new Map();
    this.initializeServer();
  }
  initializeServer() {
    this.server
      .of('/server')
      .on('connection', (socket: SocketIO.Socket) => {
        socket.on('reInitAppState', () => socket.broadcast.emit('reInitAppState'));
        socket.on('initLightClient', (addMicrosAction: AddMicrosStateAction) => {
          socket.join('lightClients');
          this.handleStateAction(addMicrosAction);
          this.state.allMicroIds.forEach((microId) => {
            socket.join(microId);
          });
          socket.to('webClients').emit('remoteLightsStateAction', addMicrosAction);
        });
        socket.on('initWebClient', () => {
          socket.join('webClients');
          this.webClients.set(socket.id, socket);
          const {state} = this;
          const resetStateAction = resetState({state});
          socket.emit('remoteLightsStateAction', resetStateAction);
        });
        socket.on('remoteLightsStateAction', (stateAction: StateActions) => {
          this.handleStateAction(stateAction);
          socket.broadcast.emit('remoteLightsStateAction', stateAction);
        });
        socket.on('disconnect', () => {
          console.log('socket disconnected', socket.id);
          if (this.webClients.has(socket.id)) this.webClients.delete(socket.id);
        });
      });
  }
  handleStateAction = (stateAction: StateActions) => {
    this.state = remoteLights(this.state, stateAction);
  }
  filterNewMicros = (newMicroInfoArr: WebMicroInfo[]) => {
    const {micros} = this;
    return newMicroInfoArr.filter((newMicroInfo) =>{
      const hasMicro = micros.findIndex((currentMicroInfo) =>{
        return currentMicroInfo.id == newMicroInfo.id;
      });
      return hasMicro == -1;
    });
  }
}
export default PiServer;