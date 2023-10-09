#!/usr/bin/env python3
import json
import time
import math
import quaternion
import numpy as np
import argparse
import os

import logging
import coloredlogs

import redis.asyncio as redis
import asyncio
from fastapi import FastAPI, WebSocket, HTTPException, Request, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from starlette.websockets import WebSocketState

from tinydb import TinyDB
from tinydb.storages import MemoryStorage

from contextlib import asynccontextmanager

db = TinyDB(storage=MemoryStorage)
state_table = db.table('state')
state_table.insert({'latest_stream_key': None})


def set_latest_stream_key(stream_key):
    state_table.update({'latest_stream_key': stream_key})


def get_latest_stream_key():
    result = state_table.all()
    if result:
        return result[0]['latest_stream_key']
    return None


async def set_initial_latest_stream_key():
    result = await get_redis_connection().execute_command('SCAN 0 TYPE stream')
    if len(result) < 2:
        return
    stream_keys = result[1]
    stream_key = stream_keys[-1]
    set_latest_stream_key(stream_key)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    import uvicorn
    uvicorn_logger = logging.getLogger("uvicorn")
    uvicorn_logger_formatter = uvicorn.logging.ColourizedFormatter(
        '{asctime} {name}[{process}] {levelprefix} [{filename}:{lineno}] {message}',
        style="{", use_colors=True)
    uvicorn_logger.handlers[0].setFormatter(uvicorn_logger_formatter)
    logger.info("startup event")
    yield
    # shutdown
    logger.info("shutdown event")

app = FastAPI(lifespan=lifespan)
app.mount("/static", StaticFiles(directory="static", html=True), name="static")

redis_connection = None

logger = logging.getLogger("debug-viewer")


def get_redis_connection():
    global redis_connection
    return redis_connection


@app.get("/", response_class=RedirectResponse)
async def redirect_to_index():
    return "/static/index.html"


def generate_dummy_data():
    sequential_id = 0
    group = "session-test"
    angular_velocity = np.array([0.1, 0.2, 0.3])
    dt = 0.1
    q = quaternion.from_euler_angles([0, 0, 0])
    process = "sample application"
    label = "Sample pose"
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
            "process": process,
            "sequential_id": sequential_id,
            "label": label,
            "data": {
                "position.x": x,
                "position.y": y,
                "position.z": z,
                "rotation.x": q.x,
                "rotation.y": q.y,
                "rotation.z": q.z,
                "rotation.w": q.w,
            }
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
            await asyncio.sleep(0.1)
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
            break
    await websocket.close()


@app.websocket("/ws/get/database")
async def websocket_redis(websocket: WebSocket):
    await websocket.accept()

    stream_key = None
    request_data = await websocket.receive_text()
    try:
        json_data = json.loads(request_data)
        group = json_data.get("group")
        timestamp = json_data.get("timestamp")
        stream_key = group

        logger.info(f"Received query: {json_data}")
    except json.JSONDecodeError as e:
        logger.warning(f"Invalid JSON data received. {e}")
        await websocket.close()
        return

    if stream_key == 'latest':
        while True:
            stream_key = get_latest_stream_key()
            if stream_key is not None:
                break
            await asyncio.sleep(0.1)
    elif stream_key == 'new':
        pre_stream_key = get_latest_stream_key()
        while True:
            stream_key = get_latest_stream_key()
            if stream_key is not pre_stream_key:
                break
            await asyncio.sleep(0.1)
    logger.info("stream_key is {}".format(stream_key))

    last_id = '0'
    sleep_ms = 100  # if 0, xread() is blocked until getting data
    while True:
        try:
            result = await get_redis_connection().xread({stream_key: last_id},
                                                        count=10, block=sleep_ms)
            if len(result) == 0:
                continue
            # only for 1st stream
            key, messages = result[0]
            last_id = messages[-1][0]
            for id, data in messages:
                response_data = data['value']  # json format string
                logger.debug(f"/ws/get/database: {response_data}")
                await websocket.send_text(response_data)
                await asyncio.sleep(0.1)
        except Exception as e:
            logger.error(f"WebSocket or Redis error: {e}")
            break
    await websocket.close()


@app.websocket("/ws/set/database")
async def websocket_redis(websocket: WebSocket):
    logger.debug(f"/ws/set/database:")
    await websocket.accept()
    while True:
        try:
            if websocket.application_state == WebSocketState.DISCONNECTED:
                break
            request_data = await websocket.receive_text()
            logger.debug(f"/ws/set/database: {request_data}")
            json_data = json.loads(request_data)
            if not isinstance(json_data, list):
                json_data = [json_data]
            response_data = []
            for object in json_data:
                stream_key = object['group']
                set_latest_stream_key(stream_key)
                sequential_id = object['sequential_id']
                await get_redis_connection().xadd(stream_key, {'value': json.dumps(object)})
                response_data.append(
                    json.dumps(
                        {
                            "type": "/ws/set/database",
                            "ok": True,
                            "code": 0,
                            "message": f"Successfully saved data for {stream_key}",
                            "data": {"sequential_id": sequential_id}
                        }
                    ))
                websocket.accept
            await websocket.send_text(response_data)
        except WebSocketDisconnect:
            logger.info(f"Client disconnected.")
            break
        except Exception as e:
            logger.error(f"WebSocket or Redis error: {type(e).__name__} {e}")
            await websocket.close()
            break


def main():
    parser = argparse.ArgumentParser(
        formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument('--redis-host', default='localhost')
    parser.add_argument('--redis-port', default=6379)
    parser.add_argument('-p', '--port', default=8765)
    parser.add_argument('-v', '--verbose', action='store_true')
    parser.add_argument('--disable-color', action='store_true')
    parser.add_argument('args', nargs='*')

    args, extra_args = parser.parse_known_args()

    log_level = os.environ.get('LOG_LEVEL', 'INFO').upper()
    if args.verbose:
        log_level = logging.DEBUG
    coloredlogs.install(
        level=log_level,
        isatty=not args.disable_color,
        fmt='%(asctime)s %(hostname)s %(name)s[%(process)d] %(levelname)s: [%(filename)s:%(lineno)d] %(message)s')

    logger.info(vars(args))

    global redis_connection
    redis_connection = redis.Redis(
        host=args.redis_host,
        port=args.redis_port,
        decode_responses=True)

    asyncio.run(set_initial_latest_stream_key())

    latest_stream_key = get_latest_stream_key()
    logger.info("latest stream_key is {}".format(latest_stream_key))

    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=args.port)


if __name__ == '__main__':
    main()
