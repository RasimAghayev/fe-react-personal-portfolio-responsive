SHELL := /bin/bash
.DEFAULT_GOAL := help

IMAGE  ?= fe-react-personal-portfolio-responsive
export COMPOSE_PROJECT_NAME := fe-react-personal-portfolio-responsive-p5
export HOST_PORT ?= 20040
COMPOSE := docker compose

.PHONY: help build test verify up run down logs shell lint format security clean

help:
	@echo "make build    - build the runtime image (server.js only; requires the test stage to pass)"
	@echo "make test     - run the test stage only (frontend CRA/Jest suite + backend server.test.js)"
	@echo "make verify   - test + build: the baseline behavior-contract gate"
	@echo "make up       - verify, then start the stack (docker compose up -d)"
	@echo "make run      - up, then follow logs"
	@echo "make down     - stop and remove the stack"
	@echo "make logs     - follow the server container's logs"
	@echo "make shell    - open a shell in the built runtime image"
	@echo "make lint     - prettier --check (via the test-stage image, no host node_modules needed)"
	@echo "make format   - prettier --write, writes back to the host working tree"
	@echo "make security - docker scout cves against the built runtime image"
	@echo "make clean    - remove local build/coverage output; pass CONFIRM=1 to also remove this repo's containers/images"

test:
	DOCKER_BUILDKIT=1 docker build --target test -t $(IMAGE):test .

build:
	DOCKER_BUILDKIT=1 $(COMPOSE) build server

verify: test build
	@echo "verify: test stage + runtime build both succeeded"

up: verify
	$(COMPOSE) up -d
	@echo "server: http://localhost:$(HOST_PORT)/health/live"

run: up
	$(COMPOSE) logs -f server

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f server

shell:
	$(COMPOSE) run --rm --entrypoint sh server

lint: test
	docker run --rm $(IMAGE):test npm run format:check

format: test
	docker run --rm -v "$(CURDIR):/app" -v /app/node_modules $(IMAGE):test npm run format

security:
	docker scout cves $(IMAGE):runtime

# Never deletes containers/images/volumes without an explicit confirm flag.
# There is no database/volume in this repo's stack; "data" here means the
# locally built CRA bundle and this repo's own Docker artifacts only.
clean:
	rm -rf build coverage
ifeq ($(CONFIRM),1)
	$(COMPOSE) down --rmi local --remove-orphans
	-docker image rm $(IMAGE):test $(IMAGE):deps $(IMAGE):build $(IMAGE):prod-deps 2>/dev/null
else
	@echo "Local build/coverage output removed. Containers/images were NOT removed - re-run as 'make clean CONFIRM=1' to also remove those."
endif
