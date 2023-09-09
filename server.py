#!/usr/bin/env python3
import asyncio
import json
import websockets
import time
import math
import quaternion
import numpy as np
import argparse


async def dummy_data_sender(websocket, path):
    sequential_id = 1
    group = "session-123"
    angular_velocity = np.array([0.1, 0.2, 0.3])
    dt = 0.1
    q = quaternion.from_euler_angles([0, 0, 0])
    label = "ARKit tracking pose"
    try:
        while True:
            timestamp = int(time.time())
            sequential_id += 1

            x = (sequential_id - 50) * 0.1
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

            await websocket.send(json.dumps(data))
            await asyncio.sleep(0.3)

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

    start_server = websockets.serve(dummy_data_sender, "0.0.0.0", args.port)

    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()


if __name__ == '__main__':
    main()
