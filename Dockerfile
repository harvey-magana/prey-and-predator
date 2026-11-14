FROM nginxinc/nginx-unprivileged:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html style.css game.js /usr/share/nginx/html/
EXPOSE 8080
