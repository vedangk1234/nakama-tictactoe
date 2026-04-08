FROM heroiclabs/nakama:3.22.0

# Copy your Nakama JS modules
COPY ./nakama/data/modules /nakama/data/modules

# Start Nakama (it will automatically use DATABASE_URL from Railway)
CMD ["nakama"]