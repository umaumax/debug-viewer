# debug viewer

## how to build and run server
``` bash
docker build -t debug-viewer-server -f ./docker/Dockerfile .
docker run --rm -p 8765:8765 debug-viewer-server
```
