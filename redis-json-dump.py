#!/usr/bin/env python3

import redis
import json
import argparse
import sys


def main():
    parser = argparse.ArgumentParser(
        formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument('--host', default='localhost')
    parser.add_argument('-p', '--port', default=6379)
    parser.add_argument(
        '-o',
        '--output-filepath',
        type=argparse.FileType("w"),
        default=sys.stdout)
    # parser.add_argument('-v', '--verbose', action='store_true')
    parser.add_argument('-c', '--count', default=10, type=int)
    parser.add_argument('-i', '--index', default=0, type=int)
    parser.add_argument('stream_name')
    parser.add_argument('args', nargs='*')

    args, extra_args = parser.parse_known_args()
    output_filepath = args.output_filepath
    port = args.port
    count = args.count
    stream_name = args.stream_name
    index = args.index
    host = args.host

    r = redis.Redis(host=host, port=port, decode_responses=True)

    last_id = '0'
    response = r.xread({stream_name: last_id}, count=count + index, block=0)

    json_data = []
    for stream, entries in response:
        for entry_id, data in entries[index:]:
            json_data.append(data)

    with output_filepath as f:
        f.write(json.dumps(json_data, indent=2))


if __name__ == '__main__':
    main()
