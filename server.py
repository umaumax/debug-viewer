#!/usr/bin/env python3
import json
import time
import math
import quaternion
import numpy as np
import argparse

import redis

import asyncio
import uvicorn
from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

app = FastAPI()
app.mount("/static", StaticFiles(directory="static", html=True), name="static")


@app.get("/", response_class=RedirectResponse)
async def redirect_to_index():
    return "/static/index.html"

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

field_names = [
    "timestamp",
    "group",
    "sequential_id",
    "label",
    "position.x",
    "position.y",
    "position.z",
    "rotation.x",
    "rotation.y",
    "rotation.z",
    "rotation.w"
]


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


@app.websocket("/dummy")
async def websocket_dummy_redis(websocket: WebSocket):
    await websocket.accept()
    dummy_data_generator = generate_dummy_data()
    while True:
        data = next(dummy_data_generator)
        response_data = json.dumps(data)
        await websocket.send_text(data)
        await asyncio.sleep(0.3)


@app.websocket("/redis")
async def websocket_redis(websocket: WebSocket):
    print("/redis")
    await websocket.accept()
    dummy_data_generator = generate_dummy_data()
    last_id = '0'
    sleep_ms = 100  # if 0, xread() is blocked until getting data
    while True:
        # NOTE: 自動生成だが、サーバを起動するたびに最初からのデータとなるので、ループしていることに注意
        data = next(dummy_data_generator)
        stream_key = data['group']
        r.xadd(stream_key, data)

        time.sleep(0.3)

        try:
            result = r.xread({stream_key: last_id},
                             count=10, block=sleep_ms)
            if len(result) == 0:
                continue
            # only for 1st stream
            key, messages = result[0]
            last_id = messages[-1][0]
            for id, data in messages:
                field_values = [data.get(field, None)
                                for field in field_names]
                response_data = json.dumps(
                    dict(zip(field_names, field_values)))
                # print(response_data)
                await websocket.send_text(response_data)
                await asyncio.sleep(0.3)
        except ConnectionError as e:
            print("ERROR REDIS CONNECTION: {}".format(e))
            break


def main():
    parser = argparse.ArgumentParser(
        formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument('-p', '--port', default=8765)
    parser.add_argument('-v', '--verbose', action='store_true')
    parser.add_argument('args', nargs='*')

    args, extra_args = parser.parse_known_args()
    print(vars(args))

    uvicorn.run(app, host="0.0.0.0", port=args.port)


if __name__ == '__main__':
    main()
