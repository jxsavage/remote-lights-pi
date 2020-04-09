import io from 'socket.io';
import { MicroState } from '../Shared/MicroTypes';
import remoteLights, {RemoteLightsState, resetState, AddMicrosStateAction, StateActions} from '../Shared/reducers/remoteLights';
const initialState = {
  allMicroIds: [],
  byMicroId: {}
};
class PiServer {
  server: SocketIO.Server;
  micros: MicroState[];
  state: RemoteLightsState;
  webClients: Map<string, io.Socket>;
  constructor(port: string) {
    this.server = io(port);
    this.micros = [];
    this.state = initialState;
    this.webClients = new Map();
    this.initializeServer();
  }
  initializeServer(): void {
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
  handleStateAction = (stateAction: StateActions): void => {
    this.state = remoteLights(this.state, stateAction);
  }
}
export default PiServer;