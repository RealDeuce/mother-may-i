#!/bin/sh

rm mother-may-i.zip
cd .. && zip -x\*.git\* -r mother-may-i/mother-may-i.zip mother-may-i -x \*.git\* \*zipit.sh
