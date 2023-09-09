#!/usr/bin/env python3
import redis
import time
import json
import yaml

r = redis.Redis(host='localhost', port=6379, db=0)

stream_key = 'my_stream'
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
    "rotation.w"]

data1 = {
    "timestamp": int(time.time()),
    "group": "sample_group",
    "sequential_id": 1,
    "label": "sample_label",
    "position.x": 1.0,
    "position.y": 2.0,
    "position.z": 3.0,
    "rotation.x": 0.1,
    "rotation.y": 0.2,
    "rotation.z": 0.3,
    "rotation.w": 0.4
}

data2 = {
    "timestamp": int(time.time()),
    "group": "sample_group",
    "sequential_id": 2,
    "label": "sample_label",
    "position.x": 1.0,
    "position.y": 2.0,
    "position.z": 3.0,
    "rotation.x": 0.1,
    "rotation.y": 0.2,
    "rotation.z": 0.3,
    "rotation.w": 0.4
}

data3 = {
    "timestamp": 123,
    "group": "sample_group-hoge",
    "sequential_id": 2,
    "label": "sample_label",
    "position.x": 1.0,
    "position.y": 2.0,
    "position.z": 3.0,
    "rotation.x": 0.1,
    "rotation.y": 0.2,
    "rotation.z": 0.3,
    "rotation.w": 0.4
}

data4 = {
    "timestamp": 124,
    "group": "sample_group-hoge",
    "sequential_id": 2,
    "label": "sample_label",
    "position.x": 1.0,
    "position.y": 2.0,
    "position.z": 3.0,
    "rotation.x": 0.1,
    "rotation.y": 0.2,
    "rotation.z": 0.3,
    "rotation.w": 0.4
}

data5 = {
    "timestamp": 125,
    "group": "sample_group-hoge",
    "sequential_id": 2,
    "label": "sample_label-fuga",
    "position.x": 1.0,
    "position.y": 2.0,
    "position.z": 3.0,
    "rotation.x": 0.1,
    "rotation.y": 0.2,
    "rotation.z": 0.3,
    "rotation.w": 0.4
}

# delete all data of 'stream_key'
s1 = r.xread(streams={stream_key: '0'})
for streams in s1:
    stream_name, messages = streams
    # del all ids from the message list
    [r.xdel(stream_name, i[0]) for i in messages]

r.xadd(stream_key, data1)
r.xadd(stream_key, data2)
r.xadd(stream_key, data3)
r.xadd(stream_key, data4)
r.xadd(stream_key, data5)

sleep_ms = 0  # if 0, xread() is blocked until getting data

last_id = '0'
while True:
    try:
        result = r.xread({stream_key: last_id}, count=10, block=sleep_ms)
        if len(result) == 0:
            continue
        # only for 1st stream
        key, messages = result[0]
        last_id = messages[-1][0]
        for id, data in messages:
            field_values = [data.get(field.encode('ascii'), None).decode('ascii')
                            for field in field_names]
            print(json.dumps(dict(zip(field_names, field_values)), indent=4))
    except ConnectionError as e:
        print("ERROR REDIS CONNECTION: {}".format(e))
        break
