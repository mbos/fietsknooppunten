# Horloge-app (Connect IQ). Vereist de SDK via de SDK Manager en een developer key.
SDK    := $(shell cat "$(HOME)/Library/Application Support/Garmin/ConnectIQ/current-sdk.cfg")
DEVICE ?= fr970
KEY    ?= $(HOME)/.garmin/developer_key.der
FLAGS  := -d $(DEVICE) -f monkey.jungle -y $(KEY) -l 3 -w

.PHONY: build package test run sim clean

build:            ## app bouwen -> bin/knooppunten.prg (ook om te sideloaden)
	@mkdir -p bin
	"$(SDK)/bin/monkeyc" $(FLAGS) -o bin/knooppunten.prg

package:          ## store-pakket (release) -> bin/knooppunten.iq, voor upload als (Beta) App
	@mkdir -p bin
	"$(SDK)/bin/monkeyc" -e -r -f monkey.jungle -y $(KEY) -l 3 -w -o bin/knooppunten.iq

test: sim         ## unit tests draaien in de simulator
	@mkdir -p bin
	"$(SDK)/bin/monkeyc" $(FLAGS) --unit-test -o bin/knooppunten-test.prg
	@# monkeydo eindigt altijd met exitcode 1; daarom op de PASSED-regel controleren.
	@"$(SDK)/bin/monkeydo" bin/knooppunten-test.prg $(DEVICE) -t 2>&1 | tee bin/test.log; \
		grep -q "^PASSED" bin/test.log

run: build sim    ## app starten in de simulator
	"$(SDK)/bin/monkeydo" bin/knooppunten.prg $(DEVICE)

sim:              ## simulator starten als hij nog niet draait
	@pgrep -qf "ConnectIQ.app/Contents/MacOS/simulator" || { "$(SDK)/bin/connectiq" >/dev/null 2>&1 & sleep 5; }

clean:
	rm -rf bin
