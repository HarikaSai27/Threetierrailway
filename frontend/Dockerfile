FROM nginx:1.27-alpine

# Railway injects PORT at runtime; these are only local defaults.
ENV PORT=80
ENV BACKEND_URL=http://backend:3000
# Lets the official entrypoint detect DNS resolvers (needed for nginx to resolve
# the backend's private hostname lazily, incl. Railway's IPv6 private network).
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

# *.template files are run through envsubst at container start.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY index.html app.js style.css /usr/share/nginx/html/
