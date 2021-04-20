import IORedis from 'ioredis';
import log from '../../Shared/logger';
import { LEDSegment, MicroState } from '../../Shared/store';
import { AddMicrosPayload,  } from '../../Shared/store/actions/microsEntity';
import { MicroId, MicrosAndSegmentsEntity, SegmentId } from '../../Shared/store/types';
import redisClient from './client';
import {
  RedisAllLEDSegmentIdsSet, RedisAllMicroIdsSet, RedisLEDSegmentHash, RedisMicroHash, RedisMicroLEDSegmentsBoundaries, RedisMicroLEDSegmentsList, RedisSets,
} from './types';
import { 
  generateMicroSegmentListKey, generateSegmentBoundariesListKey,
  generateSegmentHashKey, generateMicroHashKey, 
} from './utils';

function readAllMicroIds(pipe: IORedis.Pipeline): IORedis.Pipeline {
  pipe.smembers(RedisSets.MicroIdSet);
  return pipe;
}
function readAllSegmentIds(pipe: IORedis.Pipeline): IORedis.Pipeline {
  pipe.smembers(RedisSets.SegmentIdSet);
  return pipe;
}
type RedisMicrosAndSegmentIdsResponse = [
  [Error | null, RedisAllMicroIdsSet],
  [Error | null, RedisAllLEDSegmentIdsSet],
];
/**
 * Reads all segment & micro IDs from redis using a 
 * pipeline command.
 * @returns Promise<RedisSegmentsAndMicrosResposne>
 */
async function readAllSegmentAndMicroIds():
  Promise<RedisMicrosAndSegmentIdsResponse> {
  const multi = redisClient.multi();
  readAllMicroIds(multi);
  readAllSegmentIds(multi);
  /*
  * cast to unknown because we know the length of return type
  * but it cannot be infered by Type from IORedis lib.
  */ 
  const results = await multi.exec() as unknown as RedisMicrosAndSegmentIdsResponse;
  return results;
}
function readMicroHash(pipe: IORedis.Pipeline , microId: MicroId | string): IORedis.Pipeline {
  pipe.hgetall(generateMicroHashKey(microId));
  return pipe;
}
function readMicroSegmentsList(pipe: IORedis.Pipeline, microId: MicroId | string): IORedis.Pipeline {
  pipe.lrange(generateMicroSegmentListKey(microId), 0, -1);
  return pipe;
}
function readMicroSegmentBoundaries(pipe: IORedis.Pipeline, microId: MicroId | string): IORedis.Pipeline {
  pipe.lrange(generateSegmentBoundariesListKey(microId), 0, -1);
  return pipe;
}
function readSegmentHash(pipe: IORedis.Pipeline , segmentId: SegmentId | string): IORedis.Pipeline {
  pipe.hgetall(generateSegmentHashKey(segmentId));
  return pipe;
}
export async function readMicros(): Promise<MicrosAndSegmentsEntity> {
  const allIds = await readAllSegmentAndMicroIds();
  const [[microsErr ,allMicroIds],[segmentsErr, allSegmentIds]
  ] = allIds;
  if(microsErr || segmentsErr) {
    log('bgRed', `ERROR: micros: ${microsErr}, segments: ${segmentsErr}`)
  }
  const multi = redisClient.multi();
  allMicroIds.forEach((microId) => {
    readMicroHash(multi, microId);
    readMicroSegmentsList(multi, microId);
    readMicroSegmentBoundaries(multi, microId);
  });

  allSegmentIds.forEach((segmentId) => readSegmentHash(multi, segmentId));

  const results = await multi.exec();
  const microIndices = allMicroIds.length * 3;
  const microsResults = results.slice(0, microIndices);
  const microsById: MicrosAndSegmentsEntity['micros']['byId'] = {};
  for(let i = 0; i < microIndices; i+=3) {
    const {microId, totalLEDs, brightness}: RedisMicroHash = microsResults[i][1];
    const segmentsList: RedisMicroLEDSegmentsList = microsResults[i+1][1];
    const segmentBoundaries: RedisMicroLEDSegmentsBoundaries = microsResults[i+2][1];
    microsById[microId] = {
      microId: Number(microId),
      totalLEDs: Number(totalLEDs),
      brightness: Number(brightness),
      segmentIds: segmentsList.map(Number),
      segmentBoundaries: segmentBoundaries.map(Number)
    };
  }
  const segmentsStart = microIndices;
  const segmentIndices = allSegmentIds.length + microIndices;
  const segmentsResults = results.slice(segmentsStart, segmentIndices);
  const segmentsById: MicrosAndSegmentsEntity['segments']['byId'] = {};
  for(let i = 0; i < segmentsResults.length; i++) {
    const {segmentId, microId, offset, numLEDs, effect, effectControlledBy}: RedisLEDSegmentHash = segmentsResults[i][1];
    segmentsById[segmentId] = {
      segmentId: Number(segmentId),
      effect: Number(effect),
      offset: Number(offset),
      numLEDs: Number(numLEDs),
      microId: Number(microId),
      effectControlledBy: Number(effectControlledBy),
    }
  }


  return {
    micros: {
      byId: microsById,
      allIds: allMicroIds.map(Number)
    },
    segments: {
      byId: segmentsById,
      allIds: allSegmentIds.map(Number)
    }
  }

}