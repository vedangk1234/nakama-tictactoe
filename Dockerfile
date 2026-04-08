FROM heroiclabs/nakama:3.22.0

COPY ./nakama/data/modules /nakama/data/modules

CMD [
  "nakama",
  "--name", "nakama-node",
  "--database.address", "${DATABASE_URL#postgres://}",
  "--logger.level", "INFO"
]