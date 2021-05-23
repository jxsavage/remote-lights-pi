import IORedis from 'ioredis';
import { MicroId, RedisExecResults } from 'Shared/types';
import { BluetoothDevice, BTConnectionStatus, ClientId } from 'Shared/types/client';
import redisClient from 'SocketServer/redis';
import keys, { flattenObjectEntries } from './utils';
/**
 * Appends set add to ClientId set to the pipe.
 * @param pipe Redis command pipe.
 * @param clientId ClientId to add.
 * @returns pipe with command appended.
 */
function writeClientIdToSet(
  pipe: IORedis.Pipeline, clientId: ClientId | string
): IORedis.Pipeline {
  const {key} = keys.generate.clientIdSet();
  return pipe.sadd(key, clientId);
}
/**
 * Adds Bluetooth Device MAC Address to the command pipe.
 * @param pipe Redis command Pipe.
 * @param address MAC Address of Bluetooth controller.
 * @returns Pipe with set add mac address appended
 */
function writeBTAddressToSet(
  pipe: IORedis.Pipeline, address: string,
): IORedis.Pipeline {
  const {key} = keys.generate.btAddressSet();
  return pipe.sadd(key, address);
}
/**
 * Adds a microId to a clients micro Set.
 * @param pipe Redis command Pipe
 * @param clientId 
 * @returns Pipe with write clients Micro Set command appended.
 */
function writeClientsMicrosSet(
  pipe: IORedis.Pipeline, clientId: ClientId | string, microId: MicroId | string
): IORedis.Pipeline {
  const {key} = keys.generate.clientMicrosSet(clientId);
  return pipe.sadd(key, microId);
}
/**
 * Write to a clients connected BT devices Set.
 * @param pipe Redis command Pipe.
 * @param address MAC Address of Bluetooth controller.
 * @returns Pipe with the command appended.
 */
function writeClientsConnectedBTDevicesSet(
  pipe: IORedis.Pipeline, clientId: ClientId | string, address: string,
): IORedis.Pipeline {
  const {key} = keys.generate.clientConnectedBTDevicesSet(clientId);
  return pipe.sadd(key, address);
}
/**
 * Write to a clients visible BT devices Set.
 * @param pipe Redis command Pipe.
 * @param address MAC Address of Bluetooth controller.
 * @returns Pipe with the command appended.
 */
function writeClientsVisibleBTDevicesSet(
  pipe: IORedis.Pipeline, clientId: ClientId | string, address: string,
): IORedis.Pipeline {
  const {key} = keys.generate.clientVisibleBTDevicesSet(clientId);
  return pipe.sadd(key, address);
}

/**
 * Write a bluetooth devices hash.
 * @param pipe Redis command pipe.
 * @param props Bluetooth device props
 * @returns a pipe with the command appended.
 */
function writeBluetoothDeviceHash(
  pipe: IORedis.Pipeline, props: BluetoothDevice
): IORedis.Pipeline {
  const {address} = props;
  const {key} = keys.generate.bluetoothDeviceHash(address);
  return pipe.hmset(
    key,
    ...flattenObjectEntries(props),
    );
}
/**
 * Writes a bluetooth devices status.
 * @param pipe Redis Command Pipe
 * @param address MAC Address of the bluetooth device.
 * @param status BT Connection status.
 * @returns pipe with the command appended.
 */
function writeBluetoothDeviceStatus(
  pipe: IORedis.Pipeline, address: string, status: BTConnectionStatus
) {
  const {key} = keys.generate.bluetoothDeviceHash(address);
  return pipe.hmset(key, 'connectionStatus', status);
}



