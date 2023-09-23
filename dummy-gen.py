#!/usr/bin/env python3
import json
import time
import math
import quaternion
import numpy as np
import argparse


def generate_dummy_data(group, process, label):
    sequential_id = 0
    angular_velocity = np.array([0.1, 0.2, 0.3])
    dt = 0.1
    q = quaternion.from_euler_angles([0, 0, 0])
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


def main():
    parser = argparse.ArgumentParser(
        formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument('--group', default='session-test')
    parser.add_argument('--process', default='sample application')
    parser.add_argument('--label', default='Sample pose')
    parser.add_argument('--count', default=10, type=int)
    parser.add_argument('--offset', default=0, type=int)
    parser.add_argument('args', nargs='*')

    args, extra_args = parser.parse_known_args()

    dummy_data_generator = generate_dummy_data(
        args.group, args.process, args.label)

    output_data = []
    for i in range(0, args.count + args.offset):
        data = next(dummy_data_generator)
        if i >= args.offset:
            output_data.append(data)
    print(json.dumps(output_data))


if __name__ == '__main__':
    main()
