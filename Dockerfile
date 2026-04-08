FROM heroiclabs/nakama:3.22.0

COPY ./nakama/data/modules /nakama/data/modules

CMD sh -c '
nakama \
--name nakama-node \
--database.address "$(echo $DATABASE_URL | sed s/postgresql:\\/\\///)" \
--logger.level INFO
'