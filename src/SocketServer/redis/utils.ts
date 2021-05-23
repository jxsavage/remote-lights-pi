import log from "Shared/logger";
import { 
  MicroId, SegmentId,
  RedisLEDSegmentHash, RedisMicroHash
 } from "Shared/types";
import { BluetoothDevice, ClientId } from "Shared/types/client";
 import redisClient from 'SocketServer/redis';


enum RedisSets {
  MicroIdSet = "MicroId.Set",
  SegmentIdSet = "SegmentId.Set",
  KeyIndexSet = "Key.Set",
  ClientIdSet = "ClientId.Set",
  BTAddressSet = "BTAddress.Set"
}

const {
  MicroIdSet, SegmentIdSet, KeyIndexSet, ClientIdSet,
  BTAddressSet
} = RedisSets;

function getKeyIndex(): string {
  return KeyIndexSet;
}
function getMicroIdSet(): string {
  return MicroIdSet;
}
function getSegmentIdSet(): string {
  return SegmentIdSet;
}
function getClientIdSet(): string {
  return ClientIdSet;
}
function getBTAddressSet(): string {
  return BTAddressSet;
}
function getBluetoothDeviceHashKey(address: string) {
  return `BluetoothDevice.${address}.Hash`
}
/**
 * Generates a Clients micros set key.
 * @param clientId
 * @returns Clients micros set key
 */
 function getClientMicrosSetKey(clientId: ClientId | string): string {
  return `Client.${clientId}.Micros.Set`;
}
/**
 * Generates a clients visible bt device set key.
 * @param clientId 
 * @returns Clients connected bt device set key.
 */
function getClientConnectedBTDevicesSetKey(clientId: ClientId | string): string {
  return `Client.${clientId}.ConnectedBT.Set`;
}
/**
 * Generates a clients visible bt device set key.
 * @param clientId 
 * @returns Clients visible bt device set key.
 */
function getClientVisibleBTDevicesSetKey(clientId: ClientId | string): string {
  return `Client.${clientId}.VisibleBT.Set`;
}

/**
 * Generates segment boundary redis list key.
 * @param microId 
 * @returns A micros segment boundary list key.
 */
function getSegmentBoundariesListKey(microId: MicroId | string): string {
  return `Micro.${microId}.SegmentBoundaries.List`;
}
/**
 * Generate a micros segment list key. 
 * @param microId
 * @returns The key as a string.
 */
function getMicroSegmentListKey(microId: MicroId | string): string {
  return `Micro.${microId}.Segments.List`;
}
/**
 * Generate a LEDSegments hash key.
 * @param segmentId 
 * @returns The key as a string.
 */
function getSegmentHashKey(segmentId: SegmentId | string): string {
  return `Segment.${segmentId}.Hash`;
}
/**
 * Generate a Micros hash key.
 * @param microId 
 * @returns The key as a string.
 */
function getMicroHashKey(microId: MicroId | string): string {
  return `Micro.${microId}.Hash`;
}
type KeyAndPromise = { key: string; promise: Promise<[Error | null, any][]>; };
function addKeyToIndex(key: string): KeyAndPromise {
  const multi = redisClient.multi();
  const promise = multi.sadd(KeyIndexSet, key).exec();
  return {key, promise};
}
type genkp = (key: number | string) => KeyAndPromise
type genfn = ((key: number | string) => string) | ((key: string) => string);
function generateWithArg(fn: genfn): genkp {
  return (key: string | number): KeyAndPromise => {
    const k = String(key);
    // log('info', `Key generated ${fn(k)}`);
    return addKeyToIndex(fn(k))
  };
}
type strfn = () => KeyAndPromise;
function generate(key: number | string): strfn {
  return (): KeyAndPromise => {
    const k = String(key);
    // log('info', `Key generated: ${k}`);
    return addKeyToIndex(String(key));
  };
}
export function flattenObjectEntries(
  obj: RedisMicroHash | RedisLEDSegmentHash | BluetoothDevice
  ): (string | number)[] {
  return Object.entries(obj).reduce((keyValArr, keyVal) => {
    return [...keyValArr, ...keyVal];
  }, [] as unknown as (string | number)[]);
}
/**
 * Redis Key generators and getters.
 * Use Generators when writing keys as it writes to the key index.
 * Use getters to read, does not write to index.
 */
const defaults = {
  generate: {
    microHash: generateWithArg(getMicroHashKey),
    microIdSet: generate(getMicroIdSet()),
    clientIdSet: generate(getClientIdSet()),
    segmentHash: generateWithArg(getSegmentHashKey),
    segmentIdSet: generate(getSegmentIdSet()),
    btAddressSet: generate(getBTAddressSet()),
    clientMicrosSet: generateWithArg(getClientMicrosSetKey),
    microSegmentList: generateWithArg(getMicroSegmentListKey),
    segmentBoundariesList: generateWithArg(getSegmentBoundariesListKey),
    clientVisibleBTDevicesSet: generateWithArg(getClientVisibleBTDevicesSetKey),
    clientConnectedBTDevicesSet: generateWithArg(getClientConnectedBTDevicesSetKey),
    bluetoothDeviceHash: generateWithArg(getBluetoothDeviceHashKey),
  },
  get: {
    keyIndex: getKeyIndex,
    microIdSet: getMicroIdSet,
    clientIdSet: getClientIdSet,
    segmentIdSet: getSegmentIdSet,
    microHashKey: getMicroHashKey,
    btAddressSet: getBTAddressSet,
    clientMicrosSet: getClientMicrosSetKey,
    segmentHashKey: getSegmentHashKey,
    microSegmentListKey: getMicroSegmentListKey,
    segmentBoundariesListKey: getSegmentBoundariesListKey,
    clientVisibleBTDevicesSet: getClientVisibleBTDevicesSetKey,
    clientConnectedBTDevicesSet: getClientConnectedBTDevicesSetKey,
    bluetoothDeviceHash: getBluetoothDeviceHashKey,
  }
}
export default defaults;