#!/bin/bash

LAST_FILE=""
COMPARATOR=""
PLATFORM="$(uname)"
echo "$PLATFORM"

if [ "$PLATFORM" = "MINGW64_NT-10.0" ]; then
	PLATFORM="Linux"
fi
while true; do
	if [ "$PLATFORM" = "Linux" ]; then
		COMPARATOR="$(find ./src -type f -exec stat -c %Y \{} \; | sort -n -r | sed 1q)"
	else
    	COMPARATOR="$(find ./src -type f -exec stat -f %m \{} \; | sort -n -r | sed 1q)"
	fi

	if [[ "$LAST_FILE" != "$COMPARATOR" ]]; then
        echo "File changed, building:"
        rollup -c
        LAST_FILE="$COMPARATOR"
    fi

	sleep .5
done
