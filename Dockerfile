FROM heroiclabs/nakama:3.22.0

COPY ./nakama/data/modules /nakama/data/modules

ENV NAKAMA_DATABASE_ADDRESS=${DATABASE_URL}

CMD ["nakama"]