#!/bin/bash


#PATH="/home/user/rtsp-server-nodejs/recorded_videos/"
#PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
#if [ -d $PATH ]; then
    if [ -f deletevidoesrecored.sh ]; then 
	find /home/user/rtsp-server-nodejs/recorded_videos/ -type f -ctime +1 -delete  > /dev/null;
#    fi

else 
	sleep 3
	echo "your script path not found" 

fi


