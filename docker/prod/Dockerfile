FROM php:8.5-fpm-alpine

# System deps
RUN apk add --no-cache \
    git curl zip unzip icu-dev oniguruma-dev \
    libzip-dev nodejs npm

# PHP extensions
RUN docker-php-ext-install \
    pdo pdo_mysql intl mbstring zip

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

# Permissions
RUN chown -R www-data:www-data storage bootstrap/cache

USER www-data
