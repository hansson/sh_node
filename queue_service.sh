#!/bin/bash
#Bash script to run the Node.JS queue service 10 seconds after it finnished
while true
do
        node queue.js
        sleep 10
done
