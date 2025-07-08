from waitress import serve

from src.app import server

if __name__ == "__main__":
    serve(server, host="0.0.0.0", port=8050)
