FLUTTER ?= flutter
LINUX_CPP_INCLUDE_PATH ?= /usr/include/c++/11:/usr/include/x86_64-linux-gnu/c++/11:/usr/include/c++/11/backward
LINUX_CPP_LIBRARY_PATH ?= /usr/lib/gcc/x86_64-linux-gnu/11:/usr/lib/x86_64-linux-gnu

.PHONY: doctor pubget test test-integration test-integration-android run-linux build-linux build-apk-debug build-apk-release build-aab

doctor:
	$(FLUTTER) doctor -v

pubget:
	$(FLUTTER) pub get

test:
	$(FLUTTER) test

test-integration:
	$(FLUTTER) test integration_test

test-integration-android:
	./scripts/dev-mobile.sh

run-linux:
	CPLUS_INCLUDE_PATH="$(LINUX_CPP_INCLUDE_PATH):$$CPLUS_INCLUDE_PATH" LIBRARY_PATH="$(LINUX_CPP_LIBRARY_PATH):$$LIBRARY_PATH" $(FLUTTER) run -d linux

build-linux:
	CPLUS_INCLUDE_PATH="$(LINUX_CPP_INCLUDE_PATH):$$CPLUS_INCLUDE_PATH" LIBRARY_PATH="$(LINUX_CPP_LIBRARY_PATH):$$LIBRARY_PATH" $(FLUTTER) build linux

build-apk-debug:
	$(FLUTTER) build apk --debug

build-apk-release:
	$(FLUTTER) build apk --release

build-aab:
	$(FLUTTER) build appbundle --release
