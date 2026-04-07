FROM heroiclabs/nakama:latest

COPY ./nakama/data/modules /nakama/data/modules

CMD ["/nakama/nakama",
"--name", "nakama1",
"--database.address", "${DATABASE_ADDRESS}",
"--logger.level", "debug",
"--session.encryption_key", "supersecret1",
"--session.refresh_encryption_key", "supersecret2",
"--runtime.http_key", "supersecret",
"--socket.server_key", "supersecret"]