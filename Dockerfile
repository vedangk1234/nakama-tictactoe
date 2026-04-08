FROM heroiclabs/nakama:3.22.0

COPY ./nakama/data/modules /nakama/data/modules

ENTRYPOINT ["/bin/sh", "-c"]

CMD ["sleep 5 && /nakama/nakama migrate up --database.address \"${DATABASE_ADDRESS}\" && /nakama/nakama --name nakama-node --database.address \"${DATABASE_ADDRESS}\" --session.encryption_key \"${NAKAMA_ENCRYPTION_KEY}\" --session.token_expiry_sec 7200 --logger.level INFO"]