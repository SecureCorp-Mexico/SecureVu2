default_target: local

COMMIT_HASH := $(shell git log -1 --pretty=format:"%h"|tail -1)
VERSION = 0.17.1
IMAGE_REPO ?= ghcr.io/securecorp-mexico/securevu2
GITHUB_REF_NAME ?= $(shell git rev-parse --abbrev-ref HEAD)
BOARDS= #Initialized empty

include docker/*/*.mk

build-boards: $(BOARDS:%=build-%)

push-boards: $(BOARDS:%=push-%)

version:
	echo 'VERSION = "$(VERSION)-$(COMMIT_HASH)"' > securevu/version.py
	echo 'VITE_GIT_COMMIT_HASH=$(COMMIT_HASH)' > web/.env

local: version
	docker buildx build --target=securevu --file docker/main/Dockerfile . \
		--tag securevu:latest \
		--load

debug: version
	docker buildx build --target=securevu --file docker/main/Dockerfile . \
	    --build-arg DEBUG=true \
		--tag securevu:latest \
		--load

amd64:
	docker buildx build --target=securevu --file docker/main/Dockerfile . \
		--tag $(IMAGE_REPO):$(VERSION)-$(COMMIT_HASH) \
		--platform linux/amd64

arm64:
	docker buildx build --target=securevu --file docker/main/Dockerfile . \
		--tag $(IMAGE_REPO):$(VERSION)-$(COMMIT_HASH) \
		--platform linux/arm64

build: version amd64 arm64
	docker buildx build --target=securevu --file docker/main/Dockerfile . \
		--tag $(IMAGE_REPO):$(VERSION)-$(COMMIT_HASH) \
		--platform linux/arm64/v8,linux/amd64

push: push-boards
	docker buildx build --target=securevu --file docker/main/Dockerfile . \
		--tag $(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH) \
		--platform linux/arm64/v8,linux/amd64 \
		--push

run: local
	docker run --rm --publish=5000:5000 --volume=${PWD}/config:/config securevu:latest

run_tests: local
	docker run --rm --workdir=/opt/securevu --entrypoint= securevu:latest \
		python3 -u -m unittest
	docker run --rm --workdir=/opt/securevu --entrypoint= securevu:latest \
		python3 -u -m mypy --config-file securevu/mypy.ini securevu

.PHONY: run_tests
