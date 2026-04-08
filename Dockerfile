FROM heroiclabs/nakama:3.22.0

COPY ./nakama/data/modules /nakama/data/modules

CMD ["nakama", "--name", "nakama-node", "--database.address", "postgres:aGdbgaxUZtZsCsxckWLyWslIyYZAdFUK@postgres.railway.internal:5432/railway", "--logger.level", "INFO"]