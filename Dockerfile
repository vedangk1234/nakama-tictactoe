FROM heroiclabs/nakama:latest

COPY ./nakama/data/modules /nakama/data/modules

ENV NAKAMA_DATABASE_ADDRESS=postgres://postgres:WpyoKPNkIKSDwykWYqiOorATOhcvPHaB@postgres:5432/railway
ENV NAKAMA_CORS_ALLOWED_ORIGINS=https://nakama-tictactoe.vercel.app
CMD ["/nakama/nakama"]