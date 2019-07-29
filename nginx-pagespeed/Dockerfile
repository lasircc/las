# FROM node AS build

# RUN mkdir /assets
# WORKDIR /assets
# COPY package.json /assets
# RUN npm install


FROM debian:stretch-slim

# COPY --from=build /assets /assets

ARG MAKE_J=4
ARG NGINX_VERSION=1.15.10
ARG PAGESPEED_VERSION=1.13.35.2
ARG LIBPNG_VERSION=1.6.36

ENV MAKE_J=${MAKE_J} \
    NGINX_VERSION=${NGINX_VERSION} \
    LIBPNG_VERSION=${LIBPNG_VERSION} \
    PAGESPEED_VERSION=${PAGESPEED_VERSION}

RUN apt-get update -y && \
    apt-get upgrade -y

RUN apt-get install -y \
        apt-utils \
        git nano \
        g++ \
        gcc \
        curl \
        make \
        unzip \
        bzip2 \
        gperf \
        python \
        openssl \
        libuuid1 \
        apt-utils \
        pkg-config \
        icu-devtools \
        build-essential \
        ca-certificates \
        uuid-dev \
        zlib1g-dev \
        libicu-dev \
        libssl-dev \
        apache2-dev \
        libpcre3 \
        libpcre3-dev \
        libgeoip-dev \
        libpng-dev \
        libaprutil1-dev \
        linux-headers-amd64 \
        libjpeg62-turbo-dev \
        libcurl4-openssl-dev

# Build libpng
RUN cd /tmp && \ 
    curl -L http://prdownloads.sourceforge.net/libpng/libpng-${LIBPNG_VERSION}.tar.gz | tar -zx && \
    cd /tmp/libpng-${LIBPNG_VERSION} && \
    ./configure --build=$CBUILD --host=$CHOST --prefix=/usr --enable-shared --with-libpng-compat && \
    make -j${MAKE_J} install V=0 

RUN cd /tmp && \
    curl -O -L https://github.com/pagespeed/ngx_pagespeed/archive/v${PAGESPEED_VERSION}-stable.zip && \
    unzip v${PAGESPEED_VERSION}-stable.zip

RUN cd /tmp/incubator-pagespeed-ngx-${PAGESPEED_VERSION}-stable/ && \
    psol_url=https://dl.google.com/dl/page-speed/psol/${PAGESPEED_VERSION}.tar.gz && \
    [ -e scripts/format_binary_url.sh ] && psol_url=$(scripts/format_binary_url.sh PSOL_BINARY_URL) && \
    echo "URL: ${psol_url}" && \
    curl -L ${psol_url} | tar -xz

# Build in additional Nginx modules
RUN cd /tmp && \
    git clone git://github.com/vozlt/nginx-module-vts.git && \
    git clone https://github.com/openresty/headers-more-nginx-module.git && \
    git clone git://github.com/yaoweibin/ngx_http_substitutions_filter_module.git

# Build Nginx with support for PageSpeed
RUN cd /tmp && \
    curl -L http://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz | tar -zx && \
    cd /tmp/nginx-${NGINX_VERSION} && \
    LD_LIBRARY_PATH=/tmp/incubator-pagespeed-ngx-${PAGESPEED_VERSION}/usr/lib:/usr/lib ./configure \
        --sbin-path=/usr/sbin \
        --modules-path=/usr/lib/nginx \
        --with-http_ssl_module \
        --with-http_gzip_static_module \
        --with-file-aio \
        --with-http_v2_module \
        --with-http_realip_module \
        --with-http_sub_module \
        --with-http_gunzip_module \
        --with-http_secure_link_module \
        --with-http_stub_status_module \
        --with-stream_ssl_module  \
        --with-threads \
        --with-stream \
        --with-stream_ssl_module \
        --with-http_geoip_module \
        --prefix=/etc/nginx \
        --conf-path=/etc/nginx/nginx.conf \
        --http-log-path=/var/log/nginx/access.log \
        --error-log-path=/var/log/nginx/error.log \
        --pid-path=/var/run/nginx.pid \
        --add-module=/tmp/nginx-module-vts \
        --add-module=/tmp/headers-more-nginx-module \
        --add-module=/tmp/ngx_http_substitutions_filter_module \
        --add-module=/tmp/incubator-pagespeed-ngx-${PAGESPEED_VERSION}-stable && \
    make install --silent

# Clean-up
RUN apt-get remove -y git
RUN rm -rf /var/lib/apt/lists/* && rm -rf /tmp/* && \
    # Forward request and error logs to docker log collector
    ln -sf /dev/stdout /var/log/nginx/access.log && \
    ln -sf /dev/stderr /var/log/nginx/error.log && \
    # Make PageSpeed cache writable
    mkdir -p /var/cache/ngx_pagespeed && \
    chmod -R o+wr /var/cache/ngx_pagespeed

RUN mkdir -p /usr/share/GeoIP && cd /usr/share/GeoIP/ && \
    rm -f GeoIP.dat GeoIPv6.dat && \
    curl -L -O https://geolite.maxmind.com/download/geoip/database/GeoLite2-City.tar.gz && \
    curl -L -O https://geolite.maxmind.com/download/geoip/database/GeoLite2-Country.tar.gz && \
    tar -xzvf GeoLite2-City.tar.gz --strip-components 1 && \
    tar -xzvf GeoLite2-Country.tar.gz --strip-components 1 && \
    ls -l 

# Inject Nginx configuration files
COPY ./config/conf.d              /etc/nginx/conf.d
COPY ./config/include             /etc/nginx/include
COPY ./config/nginx.conf          /etc/nginx/nginx.conf
COPY ./config/fastcgi_params.orig /etc/nginx/fastcgi_params.orig
COPY ./scripts                    /usr/local/bin/


RUN chmod +x /usr/local/bin/*

EXPOSE 80 443
WORKDIR /etc/nginx

HEALTHCHECK --interval=5s --timeout=5s CMD curl -I http://127.0.0.1:8080/health || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
