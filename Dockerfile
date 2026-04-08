FROM heroiclabs/nakama:3.22.0

COPY ./nakama/data/modules /nakama/data/modules

CMD ["sh", "-c", "nakama --database.address=$(echo $DATABASE_URL | sed 's|^postgresql://||')"]