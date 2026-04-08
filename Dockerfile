FROM heroiclabs/nakama:3.22.0

COPY ./nakama/data/modules /nakama/data/modules

CMD ["sh", "-c", "sleep 5 && nakama --name nakama-node --database.address $DATABASE_ADDRESS --session.encryption_key $NAKAMA_ENCRYPTION_KEY --logger.level INFO"]