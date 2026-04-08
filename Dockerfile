FROM heroiclabs/nakama:latest

COPY ./nakama/data/modules /nakama/data/modules

CMD ["/nakama/nakama", \
     "--database.address", "postgres://postgres:WpyoKPNkIKSDwykWYqiOorATOhcvPHaB@postgres.railway.internal:5432/railway", \
     "--socket.server_key", "supersecret", \
     "--session.encryption_key", "supersecret1", \
     "--session.refresh_encryption_key", "supersecret2", \
     "--runtime.http_key", "supersecret", \
     "--runtime.js_entrypoint", "main.js", \
     "--console.username", "admin", \
     "--console.password", "admin", \
     "--socket.cors_allowed_origins", "*"]