#!/bin/bash

# setup pagespeed
if [ -z ${NGINX_PAGESPEED+x} ]; then 
	echo "CONFIG: pagespeed: not specified, default OFF"
else
	if [ "$NGINX_PAGESPEED" == "on" ]; then 
		echo "CONFIG: pagespeed: ON"
		sed -i "/pagespeed off;/cpagespeed on;" /etc/nginx/conf.d/pagespeed.conf
		sed -i "/pagespeed off;/cpagespeed on;" /etc/nginx/include/pagespeed.conf
	else
		echo "CONFIG: pagespeed: OFF"		
		sed -i "/pagespeed on;/cpagespeed off;" /etc/nginx/conf.d/pagespeed.conf
		sed -i "/pagespeed on;/cpagespeed off;" /etc/nginx/include/pagespeed.conf
	fi
fi


# setup pagespeed javascript processing
printf "CONFIG: pagespeed image optimization: ";

if [ "$NGINX_PAGESPEED_IMG" == "on" ]; then 
	echo "ON"
	sed -i "s/DisableFilters/EnableFilters/" /etc/nginx/conf.d/pagespeed-image.conf
else 
	echo "OFF";
	sed -i "s/EnableFilters/DisableFilters/" /etc/nginx/conf.d/pagespeed-image.conf
fi


# setup pagespeed javascript processing
printf "CONFIG: pagespeed javascript optimization: ";

if [ "$NGINX_PAGESPEED_JS" == "on" ]; then 
	echo "ON"
	sed -i "s/DisableFilters/EnableFilters/" /etc/nginx/conf.d/pagespeed-js.conf
else 
	echo "OFF";	
	sed -i "s/EnableFilters/DisableFilters/" /etc/nginx/conf.d/pagespeed-js.conf
fi


# setup pagespeed javascript processing
printf "CONFIG: pagespeed stylesheets optimization: ";

if [ "$NGINX_PAGESPEED_CSS" == "on" ]; then 
	echo "ON"
	sed -i "s/DisableFilters/EnableFilters/" /etc/nginx/conf.d/pagespeed-css.conf
else 
	echo "OFF";	
	sed -i "s/EnableFilters/DisableFilters/" /etc/nginx/conf.d/pagespeed-css.conf
fi


# setup pagespeed cache backend
if [ -z ${NGINX_PAGESPEED_STORAGE+x} ]; then 
	echo "CONFIG: pagespeed cache backend: not specified, default FILES"
else
	if [ "$NGINX_PAGESPEED_STORAGE" == "redis" ]; then 
		if [ -z ${NGINX_PAGESPEED_REDIS+x} ]; then 
			echo "CONFIG: pagespeed cache backend: redis, but NGINX_PAGESPEED_REDIS not set"
			rm -f /etc/nginx/conf.d/pagespeed-redis.conf
		else
			echo "CONFIG: pagespeed cache backend: redis - ${NGINX_PAGESPEED_REDIS}"
			printf "# redis storage backend\n" 								>  /etc/nginx/conf.d/pagespeed-redis.conf
			printf "pagespeed RedisServer \"${NGINX_PAGESPEED_REDIS}\";\n" 	>> /etc/nginx/conf.d/pagespeed-redis.conf
			printf "pagespeed RedisTimeoutUs 1000;\n" 						>> /etc/nginx/conf.d/pagespeed-redis.conf
		fi
	fi

	if [ "$NGINX_PAGESPEED_STORAGE" == "memcached" ]; then 
		if [ -z ${NGINX_PAGESPEED_MEMCACHED+x} ]; then 
			echo "CONFIG: pagespeed cache backend: memcached, but NGINX_PAGESPEED_MEMCACHED not set"
			rm -f /etc/nginx/conf.d/pagespeed-memcached.conf
		else
			echo "CONFIG: pagespeed cache backend: memcached - ${NGINX_PAGESPEED_MEMCACHED}"
			printf "# memcached storage backend\n" 									>  /etc/nginx/conf.d/pagespeed-memcached.conf
			printf "pagespeed MemcachedThreads 1;\n" 								>> /etc/nginx/conf.d/pagespeed-memcached.conf
			printf "pagespeed MemcachedServers \"${NGINX_PAGESPEED_MEMCACHED}\";\n" >> /etc/nginx/conf.d/pagespeed-memcached.conf
		fi
	fi
fi


# remove default server configuration if requested
if [ "$NGINX_DEFAULT_SERVER" == "off" ]; then 
	echo "CONFIG: removing default server configuration"
	rm -f /etc/nginx/conf.d/default.conf
fi


# expose fastcgi variables for PHP GeoIP
if [ "$NGINX_FASTCGI_GEOIP" == "on" ]; then 
	echo "CONFIG: exposing more fastcgi variables"
	cat /etc/nginx/fastcgi_params.orig    >  /etc/nginx/fastcgi_params
	cat /etc/nginx/include/fastcgi_params >> /etc/nginx/fastcgi_params
else
	cat /etc/nginx/fastcgi_params.orig    >  /etc/nginx/fastcgi_params
fi


# add custom nginx config include path
if [ -z ${NGINX_INCLUDE_PATH+x} ] || [ "$NGINX_INCLUDE_PATH" == "" ]; then 
	echo "CONFIG: custom include path: not specified, SKIP"
else
	echo "CONFIG: custom include path: ${NGINX_INCLUDE_PATH}"
	sed -i "/custom configurations/cinclude ${NGINX_INCLUDE_PATH}; # include custom configurations" /etc/nginx/nginx.conf
fi
