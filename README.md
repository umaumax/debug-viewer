# debug viewer

## how to build and run server
``` bash
docker build -t debug-viewer-server -f ./docker/Dockerfile .
docker run --rm -p 8765:8765 debug-viewer-server
```

## how to generate dummy data
``` bash
./dummy-gen.py --count 10 --offset 0 | jq . > samples/session-test-1-10.json
./dummy-gen.py --count 10 --offset 10 | jq . > samples/session-test-11-20.json
```
