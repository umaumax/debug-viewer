#!/usr/bin/env python3
import json
import time
import math
import quaternion
import numpy as np
import argparse
import logging
import coloredlogs

import redis

import asyncio

from fastapi import FastAPI, WebSocket, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

app = FastAPI()
app.mount("/static", StaticFiles(directory="static", html=True), name="static")

redis_connection = None

logger = logging.getLogger("debug-viewer")
coloredlogs.install()


def get_redis_connection():
    global redis_connection
    return redis_connection


@app.get("/", response_class=RedirectResponse)
async def redirect_to_index():
    return "/static/index.html"


def generate_dummy_data():
    sequential_id = 1
    group = "session-123"
    angular_velocity = np.array([0.1, 0.2, 0.3])
    dt = 0.1
    q = quaternion.from_euler_angles([0, 0, 0])
    label = "ARKit tracking pose"
    while True:
        timestamp = int(time.time())
        sequential_id += 1

        x = (sequential_id - 30) * 0.1
        y = math.sin(x)
        z = math.cos(3 * x)
        rotation_increment = quaternion.from_euler_angles(
            angular_velocity * dt)
        q *= rotation_increment
        data = {
            "timestamp": timestamp,
            "group": group,
            "sequential_id": sequential_id,
            "label": label,
            "position.x": x,
            "position.y": y,
            "position.z": z,
            "rotation.x": q.x,
            "rotation.y": q.y,
            "rotation.z": q.z,
            "rotation.w": q.w,
        }

        yield data


@app.websocket("/ws/get/dummy")
async def websocket_dummy_redis(websocket: WebSocket):
    await websocket.accept()
    dummy_data_generator = generate_dummy_data()
    while True:
        try:
            data = next(dummy_data_generator)
            response_data = json.dumps(data)
            await websocket.send_text(response_data)
            await asyncio.sleep(0.3)
        except Exception as e:
            print(f"WebSocket error: {e}")
            break
    await websocket.close()


@app.websocket("/ws/get/database")
async def websocket_redis(websocket: WebSocket):
    await websocket.accept()
    dummy_data_generator = generate_dummy_data()
    last_id = '0'
    sleep_ms = 100  # if 0, xread() is blocked until getting data
    while True:
        # NOTE: 自動生成だが、サーバを起動するたびに最初からのデータとなるので、ループしていることに注意
        data = next(dummy_data_generator)
        stream_key = data['group']
        get_redis_connection().xadd(stream_key, data)

        time.sleep(0.3)

        try:
            result = get_redis_connection().xread({stream_key: last_id},
                                                  count=10, block=sleep_ms)
            if len(result) == 0:
                continue
            # only for 1st stream
            key, messages = result[0]
            last_id = messages[-1][0]
            for id, data in messages:
                response_data = json.dumps(data)
                logger.debug(f"/ws/get/database: {response_data}")
                await websocket.send_text(response_data)
                await asyncio.sleep(0.3)
        except Exception as e:
            print(f"WebSocket or Redis error: {e}")
            break
    await websocket.close()


@app.websocket("/ws/set/database")
async def websocket_redis(websocket: WebSocket):
    await websocket.accept()
    while True:
        try:
            request_data = await websocket.receive_text()
            logger.debug(f"/ws/set/database: {request_data}")
            json_data = json.loads(request_data)
            if not isinstance(json_data, list):
                json_data = [json_data]
            response_data = []
            for object in json_data:
                stream_key = object['group']
                get_redis_connection().xadd(stream_key, object)
                response_data.append(
                    json.dumps({"stream_key": stream_key, "status": "OK"}))
            await websocket.send_text(response_data)
        except Exception as e:
            print(f"WebSocket or Redis error: {e}")
            break
    await websocket.close()


def main():
    parser = argparse.ArgumentParser(
        formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument('--redis-host', default='localhost')
    parser.add_argument('--redis-port', default=6379)
    parser.add_argument('-p', '--port', default=8765)
    parser.add_argument('-v', '--verbose', action='store_true')
    parser.add_argument('args', nargs='*')

    args, extra_args = parser.parse_known_args()

    logger.setLevel(logging.INFO)
    if args.verbose:
        logger.setLevel(logging.DEBUG)

    logger.info(vars(args))

    global redis_connection
    redis_connection = redis.Redis(
        host=args.redis_host,
        port=args.redis_port,
        decode_responses=True)

    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=args.port)


if __name__ == '__main__':
    main()
