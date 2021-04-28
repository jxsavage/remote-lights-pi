import log from "Shared/logger";
import { 
  MicroId, SegmentId,
  RedisLEDSegmentHash, RedisMicroHash
 } from "Shared/types";
import redisClient from "./client";


enum RedisSets {
  MicroIdSet = "MicroId.Set",
  SegmentIdSet = "SegmentId.Set",
  KeyIndexSet = "Key.Set",
}

const {MicroIdSet, SegmentIdSet, KeyIndexSet} = RedisSets;

function getKeyIndex(): string {
  return KeyIndexSet;
}
function getMicroIdSet(): string {
  return MicroIdSet;
}
function getSegmentIdSet(): string {
  return SegmentIdSet;
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
type genfn = (key: number | string) => string;
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
  obj: RedisMicroHash | RedisLEDSegmentHash
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
    microIdSet: generate(getMicroIdSet()),
    segmentIdSet: generate(getSegmentIdSet()),
    microHashKey: generateWithArg(getMicroHashKey),
    segmentHashKey: generateWithArg(getSegmentHashKey),
    microSegmentListKey: generateWithArg(getMicroSegmentListKey),
    segmentBoundariesListKey: generateWithArg(getSegmentBoundariesListKey),
  },
  get: {
    keyIndex: getKeyIndex,
    microIdSet: getMicroIdSet,
    segmentIdSet: getSegmentIdSet,
    microHashKey: getMicroHashKey,
    segmentHashKey: getSegmentHashKey,
    microSegmentListKey: getMicroSegmentListKey,
    segmentBoundariesListKey: getSegmentBoundariesListKey,
  }
}
export default defaults;