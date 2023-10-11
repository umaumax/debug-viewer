# debug viewer

## how to build and run server
host
``` bash
./server.py
```

docker
``` bash
docker build -t debug-viewer-server -f ./docker/Dockerfile .
docker run --rm -p 8765:8765 debug-viewer-server
```

access to http://localhost:8765

## how to generate dummy data
``` bash
./dummy-gen.py --count 10 --offset 0 | jq . > samples/session-test-1-10.json
./dummy-gen.py --count 10 --offset 10 | jq . > samples/session-test-11-20.json
```

## how to use dummy data
required: launch redis server at 6379
``` bash
echo 'DEL session-test' | redis-cli -h localhost -p 6379 --pipe

# for checking
# redis-cli -h localhost -p 6379 XREAD COUNT 10 BLOCK 100 STREAMS session-test 0

# e.g. one object
{
  for i in {1..10}
  do
  echo $i > /dev/stderr
  ./dummy-gen.py --count 3 --offset $((i*3)) | jq -r tostring
  sleep 1
  done
  echo 'END' > /dev/stderr
} | websocat -n ws://127.0.0.1:8765/ws/set/database

# e.g. multi objects
{
  for i in {1..10}
  do
  echo $i > /dev/stderr
  {
    ./dummy-gen.py --group hoge-session --count 3 --offset $((i*3))
    ./dummy-gen.py --group hoge-session --count 3 --offset $((10+i*3)) --label "extra-pose"
    ./dummy-gen.py --group hoge-session --count 1 --offset $((20+i*3)) --label "request-pose"
    ./dummy-gen.py --group hoge-session --count 1 --offset $((22+i*3)) --label "response-pose"
  } | jq -r tostring
  sleep 1
  done
  echo 'END' > /dev/stderr
} | websocat -n ws://127.0.0.1:8765/ws/set/database
```
