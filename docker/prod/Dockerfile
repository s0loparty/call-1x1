FROM dunglas/frankenphp:1-php8.4-alpine

# System deps
RUN apk add --no-cache \
    git curl zip unzip icu-dev oniguruma-dev \
    libzip-dev nodejs npm

# Установка Redis
RUN apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .build-deps

# PHP extensions
RUN docker-php-ext-configure pcntl --enable-pcntl \
    && docker-php-ext-install \
        pdo \
        pdo_mysql \
        intl \
        mbstring \
        zip \
        pcntl

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy code
COPY . .

# Install PHP deps
RUN composer install \
    --no-dev \
    --optimize-autoloader \
    --no-interaction

# Frontend build
RUN npm install && npm run build

# Copy Caddyfile
COPY docker/prod/Caddyfile /etc/caddy/Caddyfile

# Caddy data dir
RUN mkdir -p /data/caddy \
    && chown -R www-data:www-data /data

# Permissions
RUN chown -R www-data:www-data storage bootstrap/cache

USER www-data
