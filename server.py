#!/usr/bin/env python3
import asyncio
import json
import websockets
import time
import math
import quaternion
import numpy as np
import argparse
from flask import Flask, request, jsonify
import redis

app = Flask(__name__)

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


async def websocket_handler(websocket, path):
    print(f'path: {path}')
    if path == '/dummy':
        await dummy_data_sender(websocket, path)
    elif path == '/redis':
        await redis_data_sender(websocket, path)
    else:
        await dummy_data_sender(websocket, path)


async def dummy_data_sender(websocket, path):
    dummy_data_generator = generate_dummy_data()
    try:
        while True:
            data = next(dummy_data_generator)
            await websocket.send(json.dumps(data))
            await asyncio.sleep(0.3)

    except websockets.exceptions.ConnectionClosed:
        print("connection closed")


async def redis_data_sender(websocket, path):
    dummy_data_generator = generate_dummy_data()
    last_id = '0'
    sleep_ms = 100  # if 0, xread() is blocked until getting data
    try:
        while True:
            # NOTE: 自動生成だが、サーバを起動するたびに最初からのデータとなるので、ループしていることに注意
            data = next(dummy_data_generator)
            stream_key = data['group']
            r.xadd(stream_key, data)

            await asyncio.sleep(0.3)

            try:
                result = r.xread({stream_key: last_id},
                                 count=10, block=sleep_ms)
                if len(result) == 0:
                    continue
                # only for 1st stream
                key, messages = result[0]
                last_id = messages[-1][0]
                for id, data in messages:
                    field_values = [data.get(field.encode('ascii'), None).decode('ascii')
                                    for field in field_names]
                    field_values = [data.get(field, None)
                                    for field in field_names]
                    response_data = json.dumps(
                        dict(zip(field_names, field_values)))
                    # print(response_data)
                    await websocket.send(response_data)
            except ConnectionError as e:
                print("ERROR REDIS CONNECTION: {}".format(e))
                break

    except websockets.exceptions.ConnectionClosed:
        print("connection closed")


def main():
    parser = argparse.ArgumentParser(
        formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument('-p', '--port', default=8765)
    parser.add_argument('-v', '--verbose', action='store_true')
    parser.add_argument('args', nargs='*')

    args, extra_args = parser.parse_known_args()
    print(vars(args))

    start_server = websockets.serve(websocket_handler, "0.0.0.0", args.port)

    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()


if __name__ == '__main__':
    main()
