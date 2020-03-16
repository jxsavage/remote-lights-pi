import io from 'socket.io';

/**
 * @property {string[]} micros
 */
class PiServer {
  server: SocketIO.Server;
  micros: string[];
  webClients: Map<any, any>;
  /**
   * @param {number} port
   * @property {string[]} client
   */
  constructor(port: string) {
    this.server = io(port);
    /**
     * @type {string[]} micros
     */
    this.micros = [];
    /**
     * @type {Map<string, SocketIO.Socket>}
     */
    this.webClients = new Map();
    this.initializeServer();
  }
  initializeServer() {
    this.server
      .of('/server')
      .on('connection', (socket: SocketIO.Socket) => {
        socket.on('addMicros', (microIdArr) => {
          const addedMicros = this.filterNewMicros(microIdArr);
          this.micros = this.micros.concat(addedMicros);
          addedMicros.map((microId: string) => {
            socket.join(microId);
          })
        });
        socket.on('initLightClient', (microIdArr) => {
          socket.join('lightClients');
          this.micros = this.micros.concat(this.filterNewMicros(microIdArr));
          this.micros.forEach((microId) => {
            socket.join(microId);
          });
        });
        socket.on('initWebClient', () => {
          socket.join('webClients');
          this.webClients.set(socket.id, socket);
          socket.emit('setMicros', this.micros);
        })
        socket.on('getMicroBrightness', ({microId}) => {
          socket.to(microId).emit(`getBrightness.${microId}`, socket.id);
        });
        socket.on('getMicroSegments', ({microId}) => {
          socket.to(microId).emit(`getSegments.${microId}`, socket.id);
        });
        socket.on('getMicroEffect', ({microId}) => {
          socket.to(microId).emit(`getEffect.${microId}`, socket.id);
        });
        socket.on('setMicroBrightness', ({microId, brightness}) => {
          socket.to(microId)
            .emit(`setBrightness.${microId}`, brightness);
          socket.broadcast.to('webClients')
            .emit(`setBrightness.${microId}`, brightness);
        });
        socket.on('setWebBrightness', ({microId, brightness, socketId}) => {
          socket.to(socketId).emit(`setBrightness.${microId}`, brightness);
        });
        socket.on('setMicroEffect', ({microId, effect}) => {
          socket.to(microId).emit(`setEffect.${microId}`, {microId, effect});
          socket.broadcast.to('webClients').emit(`setEffect.${microId}`, effect);
        });
        socket.on('setWebEffect', ({microId, effect, socketId}) => {
          socket.to(socketId).emit(`setEffect.${microId}`, effect);
        });
        socket.on('setWebSegments', ({microId, segments, socketId}) => {
          socket.to(socketId).emit(`setSegments.${microId}`, segments);
        });
        this.onGetMicrosListener(socket);
        socket.on('disconnect', () => {
          console.log('socket disconnected', socket.id);
          if (this.webClients.has(socket.id)) this.webClients.delete(socket.id);
        });
      });
  }
  /**
   * @param {string[]} microIdArr
   * @memberof PiServer
   */
  filterNewMicros = (microIdArr: string[]) => {
    return microIdArr.filter((microId) =>{
      return this.micros.indexOf(microId) == -1;
    });
  }
  /**
   * @param {string[]} microIdArr
   * @memberof PiServer
   */
  addMicros = (microIdArr: string[]) => {
  }
  /**
   * @param {SocketIO.Socket} socket 
   */
  onGetMicrosListener = (socket: SocketIO.Socket) => {
    const micros = this.micros;
    this.joinMicroChannels(socket, micros);
    socket.on('getMicros', () => {
      socket.emit('setMicros', micros);
    });
  }
  /**
   * 
   * @param {SocketIO.Socket} socket 
   * @param {string[]} microIdArr 
   */
  joinMicroChannels = (socket: SocketIO.Socket, microIdArr: string[]) => {
    microIdArr.forEach((microId) => {
      socket.join(microId);
    })
  }
  addClient(clientConfig: object) {

  }
}
export default PiServer;