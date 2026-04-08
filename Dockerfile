FROM heroiclabs/nakama:3.22.0

COPY ./nakama/data/modules /nakama/data/modules

CMD ["nakama"]