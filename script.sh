#!/bin/bash


#PATH="/home/user/rtsp-server-nodejs/recorded_videos/"

#if [ -d $PATH ]; then
    if [ -f script.sh ]; then  
	find /home/user/rtsp-server-nodejs/recorded_videos/*.mp4 -type f -ctime +1 -exec rm -rf {} \;
#    fi

else 
	sleep 3
	echo "your script path not found"

fi


